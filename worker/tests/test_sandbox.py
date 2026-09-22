import asyncio
import os
import platform
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

import app.main as main
from app.config import settings
from app.models.verification import VerificationResult
from app.sandbox import SANDBOX_MODE_DEGRADED, SandboxResult, _child_env, _resolve_ro_paths, get_sandbox_mode, run_sandboxed
from app.services import svf_runner, video_info


AUTH_HEADER = {"Authorization": "Bearer dev-worker-api-key"}


def _run(coro):
    return asyncio.run(coro)


def _linux_only():
    if platform.system() != "Linux":
        pytest.fail(
            "linux_sandbox tests must run inside the Linux container: "
            "docker build -t epworker . && docker run --rm epworker pytest -m linux_sandbox"
        )


@pytest.fixture
def restore_settings():
    names = [
        "allow_degraded_sandbox",
        "use_mock_results",
        "max_file_size_bytes",
        "sandbox_max_input_bytes",
        "sandbox_max_output_bytes",
        "sandbox_rlimit_as_bytes",
        "sandbox_rlimit_cpu_seconds_ffprobe",
        "sandbox_rlimit_cpu_seconds_validator",
        "sandbox_rlimit_fsize_bytes",
        "sandbox_rlimit_nproc",
        "temp_dir",
    ]
    before = {name: getattr(settings, name) for name in names}
    yield
    for name, value in before.items():
        setattr(settings, name, value)


def test_ac4a_host_ffprobe_args_have_protocol_whitelist_and_caps(monkeypatch, tmp_path, restore_settings):
    calls = []
    sample = tmp_path / "sample.mp4"
    sample.write_bytes(b"video")
    settings.temp_dir = str(tmp_path)

    async def fake_run_sandboxed(argv, **kwargs):
        calls.append(argv)
        if "-show_format" in argv:
            return SandboxResult(
                stdout=b'{"format":{"format_name":"mp4","duration":"1"},"streams":[]}',
                stderr=b"",
                returncode=0,
                timed_out=False,
                rlimit_killed=False,
                launch_failed=False,
                sandbox_error=None,
            )
        return SandboxResult(
            stdout=b'{"packets":[]}',
            stderr=b"",
            returncode=0,
            timed_out=False,
            rlimit_killed=False,
            launch_failed=False,
            sandbox_error=None,
        )

    monkeypatch.setattr(video_info, "run_sandboxed", fake_run_sandboxed)

    _run(video_info._run_ffprobe(str(sample)))
    _run(video_info._check_for_signing_uuid(str(sample)))

    assert len(calls) == 2
    for argv in calls:
        assert argv[0] == "ffprobe"
        assert argv[argv.index("-protocol_whitelist") + 1] == "file"
        assert argv[argv.index("-analyzeduration") + 1] == "5M"
        assert argv[argv.index("-probesize") + 1] == "10M"


def test_host_parent_parse_fuzz_is_fail_closed(monkeypatch):
    async def fake_probe(_file_path):
        return {
            "format": {"format_name": ["bad"], "duration": {"not": "float"}},
            "streams": [
                {"codec_type": "video", "codec_name": {"bad": "codec"}, "nb_frames": {"not": "int"}, "r_frame_rate": {}}
            ],
        }

    async def fake_uuid(_file_path):
        return False

    monkeypatch.setattr(video_info, "_run_ffprobe", fake_probe)
    monkeypatch.setattr(video_info, "_check_for_signing_uuid", fake_uuid)

    result = _run(video_info.get_video_info("/tmp/hostile.mp4"))

    assert result["duration_seconds"] == 0.0
    assert result["total_frames"] == 0
    assert result["framerate"] == 0.0
    assert result["codec"] == ""
    assert result["container"] == ""


def test_ac15_host_static_spawn_sites_only_call_run_sandboxed():
    for path in ["app/services/video_info.py", "app/services/svf_runner.py"]:
        source = Path(path).read_text()
        assert "create_subprocess_exec" not in source
        assert "run_sandboxed" in source


def test_ac15_host_sandboxed_pipeline_wiring(monkeypatch, tmp_path, restore_settings):
    input_file = tmp_path / "clip.mp4"
    input_file.write_bytes(b"video")
    settings.temp_dir = str(tmp_path)
    calls = []

    async def fake_ffprobe(argv, **kwargs):
        calls.append(("ffprobe", argv, kwargs))
        if "-show_format" in argv:
            payload = {
                "format": {"format_name": "mov,mp4", "duration": "2"},
                "streams": [{"codec_type": "video", "codec_name": "h264", "nb_frames": "60", "r_frame_rate": "30/1"}],
            }
            return SandboxResult(
                stdout=__import__("json").dumps(payload).encode(),
                stderr=b"",
                returncode=0,
                timed_out=False,
                rlimit_killed=False,
                launch_failed=False,
                sandbox_error=None,
            )
        return SandboxResult(
            stdout=b"Signed Video",
            stderr=b"",
            returncode=0,
            timed_out=False,
            rlimit_killed=False,
            launch_failed=False,
            sandbox_error=None,
        )

    async def fake_validator(argv, **kwargs):
        calls.append(("validator", argv, kwargs))
        Path(kwargs["scratch_dir"], "validation_results.txt").write_text(
            "VIDEO IS SIGNED AND VERIFIED\nPUBLIC KEY VALIDATED\nNumber of OK Bitstream Units: 2\n"
        )
        return SandboxResult(
            stdout=b"",
            stderr=b"",
            returncode=0,
            timed_out=False,
            rlimit_killed=False,
            launch_failed=False,
            sandbox_error=None,
        )

    monkeypatch.setattr(video_info, "run_sandboxed", fake_ffprobe)
    monkeypatch.setattr(svf_runner, "run_sandboxed", fake_validator)
    monkeypatch.setattr(svf_runner, "find_validator_binary", lambda: "/usr/local/bin/signed-video-validator")

    result = _run(main.run_verification_pipeline(str(input_file), "clip.mp4"))

    assert isinstance(result, VerificationResult)
    assert [call[0] for call in calls] == ["ffprobe", "ffprobe", "validator"]
    assert calls[0][2]["ro_paths"] == [str(input_file)]
    assert calls[2][2]["ro_paths"] == [str(input_file.resolve())]


def test_ac17_host_degraded_gate_and_health(monkeypatch, restore_settings):
    async def degraded_probe():
        return SANDBOX_MODE_DEGRADED

    monkeypatch.setattr(main, "ensure_sandbox_probed", degraded_probe)
    settings.use_mock_results = True
    settings.allow_degraded_sandbox = False

    with TestClient(main.app) as client:
        response = client.post(
            "/verify",
            files={"file": ("clip.mp4", b"video", "video/mp4")},
            headers=AUTH_HEADER,
        )
        assert response.status_code == 503

        health = client.get("/health")
        assert health.status_code == 200
        assert "sandbox" in health.json()

        settings.allow_degraded_sandbox = True
        response = client.post(
            "/verify",
            files={"file": ("clip.mp4", b"video", "video/mp4")},
            headers=AUTH_HEADER,
        )
        assert response.status_code == 200


def test_ac13_host_upload_cap_rejects_before_pipeline(monkeypatch, restore_settings):
    async def degraded_probe():
        return SANDBOX_MODE_DEGRADED

    monkeypatch.setattr(main, "ensure_sandbox_probed", degraded_probe)
    settings.use_mock_results = True
    settings.allow_degraded_sandbox = True
    settings.max_file_size_bytes = 1
    settings.sandbox_max_input_bytes = 1

    with TestClient(main.app) as client:
        response = client.post(
            "/verify",
            files={"file": ("clip.mp4", b"xx", "video/mp4")},
            headers=AUTH_HEADER,
        )
        assert response.status_code == 400
        assert client.get("/health").status_code == 200


def test_host_child_env_excludes_parent_secrets(monkeypatch, tmp_path):
    monkeypatch.setenv("WORKER_API_KEY", "parent-worker-secret")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "parent-supabase-secret")
    scratch_dir = str(tmp_path / "scratch")

    env = _child_env(scratch_dir)

    assert set(env) == {"PATH", "LANG", "TMPDIR"}
    assert env["TMPDIR"] == scratch_dir


def test_host_resolve_ro_paths_rejects_directory(tmp_path):
    with pytest.raises(ValueError, match="not a regular file"):
        _resolve_ro_paths([str(tmp_path)])


def test_host_resolve_ro_paths_rejects_missing_path(tmp_path):
    with pytest.raises(FileNotFoundError):
        _resolve_ro_paths([str(tmp_path / "missing.mp4")])


def test_host_resolve_ro_paths_rejects_oversized_file(monkeypatch, tmp_path, restore_settings):
    monkeypatch.setattr(settings, "sandbox_max_input_bytes", 1)
    input_file = tmp_path / "clip.mp4"
    input_file.write_bytes(b"xx")

    with pytest.raises(ValueError, match="exceeds sandbox max input bytes"):
        _resolve_ro_paths([str(input_file)])


def test_host_resolve_ro_paths_resolves_small_file(monkeypatch, tmp_path, restore_settings):
    monkeypatch.setattr(settings, "sandbox_max_input_bytes", 10)
    input_file = tmp_path / "clip.mp4"
    input_file.write_bytes(b"video")
    monkeypatch.chdir(tmp_path)

    assert _resolve_ro_paths(["clip.mp4"]) == [input_file.resolve()]


def test_host_run_sandboxed_rejects_oversized_upload_before_ffprobe(monkeypatch, tmp_path, restore_settings):
    settings.sandbox_max_input_bytes = 1
    input_file = tmp_path / "clip.mp4"
    input_file.write_bytes(b"xx")
    monkeypatch.setattr(
        "app.sandbox.ensure_sandbox_probed",
        AsyncMock(return_value=SANDBOX_MODE_DEGRADED),
    )
    spawn = AsyncMock(side_effect=AssertionError("ffprobe must not be spawned"))
    monkeypatch.setattr(asyncio, "create_subprocess_exec", spawn)

    result = _run(
        run_sandboxed(
            ["ffprobe", str(input_file)],
            ro_paths=[str(input_file)],
            scratch_dir=str(tmp_path / "scratch"),
            timeout=5,
        )
    )

    assert result.launch_failed
    assert result.returncode == 126
    assert result.sandbox_error == "containment setup failed: ValueError"
    spawn.assert_not_called()


def test_ac12_host_no_parse_on_signal_death(monkeypatch, tmp_path, restore_settings):
    input_file = tmp_path / "clip.mp4"
    input_file.write_bytes(b"video")
    settings.temp_dir = str(tmp_path)

    async def fake_validator(argv, **kwargs):
        Path(kwargs["scratch_dir"], "validation_results.txt").write_text("VIDEO IS SIGNED AND VERIFIED")
        return SandboxResult(
            stdout=b"VIDEO IS SIGNED AND VERIFIED",
            stderr=b"",
            returncode=-9,
            timed_out=False,
            rlimit_killed=True,
            launch_failed=False,
            sandbox_error="signal:9",
        )

    monkeypatch.setattr(svf_runner, "find_validator_binary", lambda: "/usr/local/bin/signed-video-validator")
    monkeypatch.setattr(svf_runner, "run_sandboxed", fake_validator)

    result = _run(svf_runner.run_svf_validator(str(input_file)))

    assert result["status"] == "error"
    assert result["raw_output"] == ""
    assert "killed" in result["error"]


@pytest.mark.linux_sandbox
def test_linux_ldd_bind_contract_covers_runtime_binaries():
    _linux_only()
    binaries = [shutil.which("ffprobe"), svf_runner.find_validator_binary()]
    assert all(binaries)
    allowed = ("/usr/", "/usr/local/", "/lib/", "/lib64/")
    for binary in binaries:
        output = subprocess.check_output(["ldd", binary], text=True)
        for line in output.splitlines():
            if "=>" not in line:
                continue
            lib_path = line.split("=>", 1)[1].strip().split(" ", 1)[0]
            if lib_path == "not":
                pytest.fail(f"unresolved ldd dependency for {binary}: {line}")
            assert lib_path.startswith(allowed), line


@pytest.mark.linux_sandbox
def test_ac1_linux_non_root_subprocess_uid(tmp_path):
    _linux_only()
    result = _run(run_sandboxed([sys.executable, "-c", "import os; print(os.getuid())"], ro_paths=[], scratch_dir=str(tmp_path), timeout=5))
    assert result.returncode == 0
    assert int(result.stdout.strip()) != 0


@pytest.mark.linux_sandbox
def test_ac2_linux_rlimit_as_kills_child_and_health_survives(tmp_path, restore_settings):
    _linux_only()
    settings.sandbox_rlimit_as_bytes = 128 * 1024 * 1024
    code = "x = bytearray(512 * 1024 * 1024); print(len(x))"
    result = _run(run_sandboxed([sys.executable, "-c", code], ro_paths=[], scratch_dir=str(tmp_path), timeout=10))
    assert result.returncode != 0
    with TestClient(main.app) as client:
        assert client.get("/health").status_code == 200


@pytest.mark.linux_sandbox
def test_ac3_linux_timeout_kills_process_group(tmp_path):
    _linux_only()
    marker = "ep-orphan-sentinel"
    code = textwrap.dedent(
        f"""
        import subprocess, time
        subprocess.Popen(['sh', '-c', 'exec sleep 30 # {marker}'])
        time.sleep(30)
        """
    )
    result = _run(run_sandboxed([sys.executable, "-c", code], ro_paths=[], scratch_dir=str(tmp_path), timeout=1))
    assert result.timed_out
    ps = os.popen(f"ps ax -o command | grep {marker} | grep -v grep").read()
    assert marker not in ps


@pytest.mark.linux_sandbox
def test_ac4b_linux_concat_sentinel_cannot_read_outside_input(tmp_path):
    _linux_only()
    script = tmp_path / "evil.ffconcat"
    script.write_text("ffconcat version 1.0\nfile /etc/hostname\n")
    result = _run(
        run_sandboxed(
            [
                "ffprobe",
                "-v",
                "error",
                "-protocol_whitelist",
                "file",
                "-analyzeduration",
                "5M",
                "-probesize",
                "10M",
                "-f",
                "concat",
                "-safe",
                "0",
                str(script),
            ],
            ro_paths=[str(script)],
            scratch_dir=str(tmp_path / "scratch"),
            timeout=5,
        )
    )
    assert result.returncode != 0


@pytest.mark.linux_sandbox
def test_ac5_linux_network_blocked(tmp_path):
    _linux_only()
    code = "import socket, sys; s=socket.socket(); s.settimeout(.5)\ntry: s.connect(('1.1.1.1', 53)); sys.exit(1)\nexcept OSError: sys.exit(0)"
    result = _run(run_sandboxed([sys.executable, "-c", code], ro_paths=[], scratch_dir=str(tmp_path), timeout=5))
    assert result.returncode == 0


@pytest.mark.linux_sandbox
def test_ac6_linux_filesystem_confinement(tmp_path):
    _linux_only()
    code = textwrap.dedent(
        """
        import os, sys
        for path in ('/etc/hostname', '/app/certs', '/app/app/main.py'):
            if os.path.exists(path):
                sys.exit(1)
        sys.exit(0)
        """
    )
    result = _run(run_sandboxed([sys.executable, "-c", code], ro_paths=[], scratch_dir=str(tmp_path), timeout=5))
    assert result.returncode == 0


@pytest.mark.linux_sandbox
def test_ac7_linux_seccomp_child_exec_conditional():
    _linux_only()
    pytest.xfail("AC7 conditional: seccomp-bpf profile is intentionally deferred, not shipped fail-open")


@pytest.mark.linux_sandbox
def test_ac8_linux_sandbox_result_flags_and_clean_scratch(tmp_path):
    _linux_only()
    clean_scratch = tmp_path / "clean"
    clean = _run(run_sandboxed([sys.executable, "-c", "print('ok')"], ro_paths=[], scratch_dir=str(clean_scratch), timeout=5))
    assert clean.returncode == 0
    assert clean.stdout.strip() == b"ok"

    missing = _run(run_sandboxed(["/no/such/binary"], ro_paths=[], scratch_dir=str(tmp_path / "missing"), timeout=5))
    assert missing.launch_failed

    timeout = _run(run_sandboxed([sys.executable, "-c", "import time; time.sleep(30)"], ro_paths=[], scratch_dir=str(tmp_path / "timeout"), timeout=1))
    assert timeout.timed_out


@pytest.mark.linux_sandbox
def test_ac9_linux_env_scrubbed(tmp_path, monkeypatch):
    _linux_only()
    monkeypatch.setenv("WORKER_API_KEY", "secret")
    code = "import os; print(os.environ.get('WORKER_API_KEY', ''))"
    result = _run(run_sandboxed([sys.executable, "-c", code], ro_paths=[], scratch_dir=str(tmp_path), timeout=5))
    assert result.returncode == 0
    assert result.stdout.strip() == b""


@pytest.mark.linux_sandbox
def test_ac10_linux_output_cap_kills_child(tmp_path, restore_settings):
    _linux_only()
    settings.sandbox_max_output_bytes = 1024
    code = "import sys; sys.stdout.buffer.write(b'x' * (10 * 1024 * 1024)); sys.stdout.flush()"
    result = _run(run_sandboxed([sys.executable, "-c", code], ro_paths=[], scratch_dir=str(tmp_path), timeout=5))
    assert result.sandbox_error == "output_limit_exceeded"
    with TestClient(main.app) as client:
        assert client.get("/health").status_code == 200


@pytest.mark.linux_sandbox
def test_ac11_linux_o_nofollow_result_read_rejects_symlink(tmp_path):
    _linux_only()
    target = tmp_path / "secret"
    target.write_text("secret")
    scratch = tmp_path / "scratch"
    scratch.mkdir()
    os.symlink(target, scratch / "validation_results.txt")
    content, error = svf_runner._read_validation_results(str(scratch))
    assert content == ""
    assert error == "SVF validator result file rejected"


@pytest.mark.linux_sandbox
def test_ac14_linux_concurrency_defaults_fit_memory_budget():
    _linux_only()
    per_job = settings.sandbox_rlimit_as_bytes + settings.sandbox_max_output_bytes * 2
    assert settings.sandbox_max_concurrent_jobs >= 1
    assert settings.sandbox_max_concurrent_jobs * per_job <= settings.sandbox_memory_limit_bytes


@pytest.mark.linux_sandbox
def test_ac16_linux_real_bytes_regression_fixture_contract():
    _linux_only()
    genuine = Path("tests/fixtures/axis-genuine.mp4")
    tampered = Path("tests/fixtures/axis-tampered.mp4")
    if not genuine.exists() or not tampered.exists():
        pytest.xfail("real AXIS signed/tampered fixtures are not present in this repo yet")


@pytest.mark.linux_sandbox
def test_ac17_linux_probe_reports_mode():
    _linux_only()
    _run(main.ensure_sandbox_probed())
    assert get_sandbox_mode() in {"bwrap", SANDBOX_MODE_DEGRADED}
