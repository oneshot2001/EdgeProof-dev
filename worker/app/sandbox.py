"""Subprocess sandbox for untrusted video tooling."""

from __future__ import annotations

import asyncio
import logging
import os
import platform
import shutil
import signal
import stat
import tempfile
from dataclasses import dataclass
from pathlib import Path

from app.config import settings


SANDBOX_MODE_BWRAP = "bwrap"
SANDBOX_MODE_DEGRADED = "DEGRADED"
DEFAULT_CHILD_PATH = "/usr/local/bin:/usr/bin:/bin"
NOFILE_LIMIT = 64
RLIMIT_SIGNAL_NUMBERS = {
    signal.SIGKILL,
    signal.SIGXCPU,
    signal.SIGXFSZ,
    signal.SIGABRT,
    signal.SIGBUS,
    signal.SIGSEGV,
}

logger = logging.getLogger(__name__)

_sandbox_mode: str | None = None
_sandbox_probe_error: str | None = None


@dataclass
class SandboxResult:
    stdout: bytes
    stderr: bytes
    returncode: int
    timed_out: bool
    rlimit_killed: bool
    launch_failed: bool
    sandbox_error: str | None
    output_overflow: bool = False


def get_sandbox_mode() -> str:
    return _sandbox_mode or "UNKNOWN"


def get_sandbox_probe_error() -> str | None:
    return _sandbox_probe_error


def get_sandbox_health() -> dict:
    return {
        "mode": get_sandbox_mode(),
        "probe_error": _sandbox_probe_error,
        "allow_degraded": settings.allow_degraded_sandbox,
        "seccomp": "deferred",
    }


async def ensure_sandbox_probed() -> str:
    if _sandbox_mode is None:
        await probe_sandbox_capabilities()
    return get_sandbox_mode()


async def probe_sandbox_capabilities() -> str:
    """Probe bwrap with the real namespace shape and cache the mode."""
    global _sandbox_mode, _sandbox_probe_error

    if platform.system() != "Linux":
        _sandbox_mode = SANDBOX_MODE_DEGRADED
        _sandbox_probe_error = "non-linux-host"
        logger.warning("sandbox mode=%s reason=%s", _sandbox_mode, _sandbox_probe_error)
        return _sandbox_mode

    if not shutil.which("bwrap"):
        _sandbox_mode = SANDBOX_MODE_DEGRADED
        _sandbox_probe_error = "bubblewrap-not-found"
        logger.warning("sandbox mode=%s reason=%s", _sandbox_mode, _sandbox_probe_error)
        return _sandbox_mode

    true_path = "/usr/bin/true" if os.path.exists("/usr/bin/true") else "/bin/true"
    probe_root = tempfile.mkdtemp(prefix="sandbox_probe_")
    scratch_dir = os.path.join(probe_root, "scratch")
    probe_input = os.path.join(probe_root, "input")

    try:
        os.makedirs(scratch_dir, mode=0o700, exist_ok=True)
        with open(probe_input, "wb") as f:
            f.write(b"probe")
        os.chmod(probe_root, 0o700)
        os.chmod(scratch_dir, 0o700)

        env = _child_env(scratch_dir)
        argv = _build_bwrap_argv(
            [true_path],
            [Path(probe_input).resolve(strict=True)],
            Path(scratch_dir).resolve(strict=True),
            env,
            allow_net=False,
        )
        process = await asyncio.create_subprocess_exec(
            *argv,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
            start_new_session=True,
        )
        try:
            stdout, stderr = await asyncio.wait_for(process.communicate(), timeout=5.0)
        except asyncio.TimeoutError:
            await _kill_process_group(process)
            try:
                await asyncio.wait_for(process.wait(), timeout=5.0)
            except asyncio.TimeoutError:
                pass
            _sandbox_mode = SANDBOX_MODE_DEGRADED
            _sandbox_probe_error = "bwrap-probe-timeout"
            logger.warning("sandbox mode=%s reason=%s", _sandbox_mode, _sandbox_probe_error)
            return _sandbox_mode
        if process.returncode == 0:
            _sandbox_mode = SANDBOX_MODE_BWRAP
            _sandbox_probe_error = None
            logger.info("sandbox mode=%s", _sandbox_mode)
            return _sandbox_mode

        stderr_text = stderr.decode("utf-8", errors="replace")[:500]
        _sandbox_mode = SANDBOX_MODE_DEGRADED
        _sandbox_probe_error = _classify_probe_failure(stderr_text)
        logger.warning(
            "sandbox mode=%s reason=%s stdout_len=%d stderr=%s",
            _sandbox_mode,
            _sandbox_probe_error,
            len(stdout),
            stderr_text,
        )
        return _sandbox_mode
    except Exception as exc:
        _sandbox_mode = SANDBOX_MODE_DEGRADED
        _sandbox_probe_error = f"bwrap-probe-exception:{exc.__class__.__name__}"
        logger.warning("sandbox mode=%s reason=%s", _sandbox_mode, _sandbox_probe_error)
        return _sandbox_mode
    finally:
        shutil.rmtree(probe_root, ignore_errors=True)


async def run_sandboxed(
    argv: list[str],
    *,
    ro_paths: list[str],
    scratch_dir: str,
    timeout: float,
    allow_net: bool = False,
) -> SandboxResult:
    """Run a command through bwrap+rlimits, returning flags instead of raising."""
    try:
        mode = await ensure_sandbox_probed()
        if not argv:
            return _launch_error("empty argv")

        scratch_path = _prepare_scratch(scratch_dir)
        resolved_ro_paths = _resolve_ro_paths(ro_paths)
        env = _child_env(str(scratch_path))
        launcher_argv = _launcher_argv(argv, _cpu_limit_for(argv[0]))
        if not launcher_argv:
            return _launch_error("rlimit launcher not found")

        if mode == SANDBOX_MODE_BWRAP:
            command = _build_bwrap_argv(
                launcher_argv,
                resolved_ro_paths,
                scratch_path,
                env,
                allow_net=allow_net or settings.sandbox_allow_net,
            )
        else:
            command = launcher_argv

        return await _run_process(command, env=env, timeout=timeout)
    except Exception as exc:
        return _launch_error(f"containment setup failed: {exc.__class__.__name__}")


def _launch_error(message: str) -> SandboxResult:
    return SandboxResult(
        stdout=b"",
        stderr=b"",
        returncode=126,
        timed_out=False,
        output_overflow=False,
        rlimit_killed=False,
        launch_failed=True,
        sandbox_error=message,
    )


def _prepare_scratch(scratch_dir: str) -> Path:
    path = Path(scratch_dir).resolve()
    os.makedirs(path, mode=0o700, exist_ok=True)
    os.chmod(path, 0o700)
    return path


def _resolve_ro_paths(ro_paths: list[str]) -> list[Path]:
    resolved = []
    for raw_path in ro_paths:
        path = Path(raw_path).resolve(strict=True)
        st = path.stat()
        if not stat.S_ISREG(st.st_mode):
            raise ValueError(f"ro_path is not a regular file: {path}")
        if st.st_size > settings.sandbox_max_input_bytes:
            raise ValueError(f"ro_path exceeds sandbox max input bytes: {path}")
        resolved.append(path)
    return resolved


def _child_env(scratch_dir: str) -> dict[str, str]:
    env = {
        "PATH": DEFAULT_CHILD_PATH,
        "LANG": "C.UTF-8",
        "TMPDIR": scratch_dir,
    }
    assert "WORKER_API_KEY" not in env
    return env


def _launcher_path() -> str | None:
    installed = "/usr/local/bin/edgeproof-rlimit-launcher"
    if os.path.exists(installed):
        return installed

    local = Path(__file__).with_name("sandbox_launcher.py")
    if local.exists():
        return str(local)

    return None


def _launcher_argv(argv: list[str], cpu_seconds: int) -> list[str] | None:
    launcher = _launcher_path()
    if not launcher:
        return None
    return [
        launcher,
        "--as-bytes",
        str(settings.sandbox_rlimit_as_bytes),
        "--cpu-seconds",
        str(cpu_seconds),
        "--fsize-bytes",
        str(settings.sandbox_rlimit_fsize_bytes),
        "--nofile",
        str(NOFILE_LIMIT),
        "--nproc",
        str(settings.sandbox_rlimit_nproc),
        "--",
        *argv,
    ]


def _cpu_limit_for(binary: str) -> int:
    name = os.path.basename(binary)
    if name == "ffprobe":
        return settings.sandbox_rlimit_cpu_seconds_ffprobe
    return settings.sandbox_rlimit_cpu_seconds_validator


def _build_bwrap_argv(
    child_argv: list[str],
    ro_paths: list[Path],
    scratch_dir: Path,
    env: dict[str, str],
    *,
    allow_net: bool,
) -> list[str]:
    argv = [
        "bwrap",
        "--ro-bind",
        "/usr",
        "/usr",
        "--ro-bind",
        "/usr/local",
        "/usr/local",
        "--ro-bind",
        "/lib",
        "/lib",
        "--ro-bind",
        "/lib64",
        "/lib64",
        "--ro-bind",
        "/etc/ld.so.cache",
        "/etc/ld.so.cache",
        "--ro-bind",
        "/etc/ssl",
        "/etc/ssl",
        "--proc",
        "/proc",
        "--dev",
        "/dev",
        "--tmpfs",
        "/tmp",
    ]

    for path in _needed_mount_dirs([*ro_paths, scratch_dir]):
        argv.extend(["--dir", str(path)])

    for path in ro_paths:
        argv.extend(["--ro-bind", str(path), str(path)])

    argv.extend(
        [
            "--bind",
            str(scratch_dir),
            str(scratch_dir),
            "--chdir",
            str(scratch_dir),
            "--unshare-user",
            "--unshare-pid",
            "--unshare-ipc",
            "--unshare-cgroup",
            "--die-with-parent",
            "--new-session",
        ]
    )
    if not allow_net:
        argv.append("--unshare-net")

    argv.extend(["--clearenv"])
    for key, value in env.items():
        argv.extend(["--setenv", key, value])
    argv.extend(["--", *child_argv])
    return argv


def _needed_mount_dirs(paths: list[Path]) -> list[Path]:
    needed: set[Path] = set()
    protected = {Path("/usr"), Path("/usr/local"), Path("/lib"), Path("/lib64"), Path("/etc"), Path("/proc"), Path("/dev"), Path("/tmp")}
    for path in paths:
        parent = path if path.is_dir() else path.parent
        chain = []
        while parent != Path("/"):
            if parent in protected:
                break
            chain.append(parent)
            parent = parent.parent
        needed.update(chain)
    return sorted(needed, key=lambda p: len(p.parts))


async def _run_process(command: list[str], *, env: dict[str, str], timeout: float) -> SandboxResult:
    try:
        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env=env,
            start_new_session=True,
        )
    except OSError as exc:
        return _launch_error(f"launch failed: {exc}")

    stdout, stderr, timed_out, output_overflow = await _communicate_limited(process, timeout)
    returncode = process.returncode if process.returncode is not None else 126
    rlimit_killed = _is_rlimit_signal(returncode)
    launch_failed = _looks_like_launcher_failure(returncode)
    sandbox_error = None
    if timed_out:
        sandbox_error = "timeout"
    elif output_overflow:
        sandbox_error = "output_limit_exceeded"
    elif launch_failed:
        sandbox_error = "launcher_or_child_exec_failed"
    elif rlimit_killed:
        sandbox_error = f"signal:{-returncode}"

    return SandboxResult(
        stdout=stdout,
        stderr=stderr,
        returncode=returncode,
        timed_out=timed_out,
        output_overflow=output_overflow,
        rlimit_killed=rlimit_killed,
        launch_failed=launch_failed,
        sandbox_error=sandbox_error,
    )


async def _communicate_limited(process: asyncio.subprocess.Process, timeout: float) -> tuple[bytes, bytes, bool, bool]:
    overflow = asyncio.Event()
    stdout_task = asyncio.create_task(_read_limited(process.stdout, overflow))
    stderr_task = asyncio.create_task(_read_limited(process.stderr, overflow))
    wait_task = asyncio.create_task(process.wait())
    overflow_task = asyncio.create_task(overflow.wait())
    timed_out = False

    try:
        done, _ = await asyncio.wait(
            {wait_task, overflow_task},
            timeout=timeout,
            return_when=asyncio.FIRST_COMPLETED,
        )
        if wait_task not in done:
            if overflow_task in done and overflow.is_set():
                await _kill_process_group(process)
            else:
                timed_out = True
                await _kill_process_group(process)
            try:
                await asyncio.wait_for(wait_task, timeout=5.0)
            except asyncio.TimeoutError:
                pass
    finally:
        overflow_task.cancel()

    stdout, stderr = await asyncio.gather(stdout_task, stderr_task)
    return stdout, stderr, timed_out, overflow.is_set()


async def _read_limited(stream: asyncio.StreamReader | None, overflow: asyncio.Event) -> bytes:
    if stream is None:
        return b""

    chunks = bytearray()
    while True:
        chunk = await stream.read(65536)
        if not chunk:
            break
        remaining = settings.sandbox_max_output_bytes - len(chunks)
        if remaining <= 0:
            overflow.set()
            break
        if len(chunk) > remaining:
            chunks.extend(chunk[:remaining])
            overflow.set()
            break
        chunks.extend(chunk)
    return bytes(chunks)


async def _kill_process_group(process: asyncio.subprocess.Process) -> None:
    if process.returncode is not None:
        return
    try:
        os.killpg(process.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    except PermissionError:
        try:
            process.kill()
        except ProcessLookupError:
            pass


def _is_rlimit_signal(returncode: int) -> bool:
    if returncode >= 0:
        return False
    try:
        return signal.Signals(-returncode) in RLIMIT_SIGNAL_NUMBERS
    except ValueError:
        return False


def _looks_like_launcher_failure(returncode: int) -> bool:
    return returncode in (125, 127)


def _classify_probe_failure(stderr_text: str) -> str:
    userns_hint = _userns_hint()
    lowered = stderr_text.lower()
    if userns_hint:
        return userns_hint
    if "operation not permitted" in lowered or "permission denied" in lowered or "clone" in lowered:
        return "userns-unavailable"
    if "no such file" in lowered or "not found" in lowered:
        return "bwrap-loader-or-binary-not-found"
    return "bwrap-probe-failed"


def _userns_hint() -> str | None:
    proc_flag = Path("/proc/sys/kernel/unprivileged_userns_clone")
    try:
        if proc_flag.exists() and proc_flag.read_text().strip() == "0":
            return "unprivileged_userns_clone=0"
    except OSError:
        pass
    return None
