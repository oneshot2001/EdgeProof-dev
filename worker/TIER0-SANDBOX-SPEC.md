# Tier 0 Subprocess Sandbox — Build Spec v2 (build-ready)

**Status:** LOCKED for build. Supersedes v1. Produced by a paired review (Codex GPT-5.5 + 2 Claude lenses) + 3-agent Railway research, then a human decision gate.
**Repo:** this worker (`~/Projects/edgeproof/worker`, Python/FastAPI, independent IP).
**Lane:** Claude specced → **Codex builds Increment 1** → Claude reviews the diff. **Do NOT `git commit`/`push`** — leave changes in the working tree for review.

## Decision summary (settled — do not relitigate in this build)
- **Threat model:** arbitrary **public untrusted** uploaded video. Containment must hold against a memory-corruption exploit in `ffprobe`/the SVF C validator.
- **Host:** **move-host.** Production worker runs in a **Fly.io Firecracker microVM** (outer boundary) with **bwrap + seccomp + rlimits** (inner boundary). Railway keeps only the FastAPI control plane. *(Railway cannot run the sandbox — no unprivileged user namespaces; confirmed via the Chrome `--no-sandbox` proxy + no `--cap-add` + no privileged/nested containers.)*
- **Goal (verifiable invariant):** an exploit in a C subprocess cannot escalate beyond a confined, unprivileged, **network-less**, **filesystem-isolated**, resource-capped child — and the worker **fails closed** (returns `error`/`inconclusive`, stays up) when containment trips or a subprocess dies by signal.

---

## Build scope

### Increment 1 — THIS build (self-contained, CI-verifiable in a Linux container)
The in-repo sandbox core + controls + Dockerfile + rubric. Fully buildable and testable in a Linux container without provisioning any cloud.

### Increment 2 — DEFERRED (separate task, mostly ops — DO NOT build now)
`fly.toml` for the worker Machine, object-storage hop, job queue, control-plane/worker split, Machine recycling. Increment 1 must be written so this drop-in later requires no rework of `run_sandboxed`.

---

## Current state (grounded — verified against this repo)
Three subprocess spawn sites, all `asyncio.create_subprocess_exec` (good: exec-form, no shell):
1. `app/services/video_info.py::_run_ffprobe` — `ffprobe -v quiet -print_format json -show_format -show_streams <file>` (30s timeout).
2. `app/services/video_info.py::_check_for_signing_uuid` — second `ffprobe` (SEI scan).
3. `app/services/svf_runner.py::run_svf_validator` — `<validator> -c <codec> <file>`, `cwd=` per-job `mkdtemp`, 120s timeout, reads `validation_results.txt`.

Gaps this build fixes: container runs as **root** (no `USER` in `Dockerfile`); **no** `-protocol_whitelist` on ffprobe; no namespace/seccomp/rlimit confinement; `await file.read()` unbounded upload (`main.py:73`, `config.py:10` default ~50 GB); parent parses hostile subprocess output unguarded (`video_info.py:49,:78`); `parse_svf_output` substring-matches across combined output (forgeable).

---

## The `run_sandboxed` contract (single choke point — `app/sandbox.py`)
All three call sites route through this; nothing else spawns the C binaries.

```python
@dataclass
class SandboxResult:
    stdout: bytes            # undecoded; call sites decode
    stderr: bytes
    returncode: int
    timed_out: bool
    rlimit_killed: bool      # died by SIGKILL/SIGXCPU/SIGXFSZ etc.
    launch_failed: bool      # sandbox/launcher could not start the child
    sandbox_error: str | None

async def run_sandboxed(argv: list[str], *, ro_paths: list[str], scratch_dir: str,
                        timeout: float, allow_net: bool = False) -> SandboxResult:
    ...
```
- **Never raises** on launch/containment failure — returns a result with the right flag set (fail-closed).
- Selects implementation from a **startup capability probe** (below): `bwrap` path if userns proven, else **DEGRADED**.
- **DEGRADED is deploy-blocking:** if probe → DEGRADED, the worker refuses `/verify` with **HTTP 503** unless `ALLOW_DEGRADED_SANDBOX=true`; mode is surfaced in `/health`. Logging-and-continuing is NOT acceptable.

### Capability probe (run once in a FastAPI startup event; cache mode in a module global; log per worker)
Must exercise the **real** namespace set (`--unshare-net` + a `--ro-bind` rootfs + a real exec'd binary). Distinguish `CLONE_NEWUSER` ENOSYS/EPERM (read `/proc/sys/kernel/unprivileged_userns_clone` or `unshare --user --map-root-user true`) from "binary/loader not found" (avoid false-DEGRADED). Any **runtime** bwrap-launch failure on the bwrap path still fails closed mid-request — never silently unconfined.

## Controls (final)

**Always-on (inside the guest, any host):**
- **A — Non-root.** `useradd -r -u 10001 svc`; `USER svc`; verify `ffprobe`/validator resolve on PATH.
- **B — ffprobe protocol whitelist + probe caps** on *both* sites: `-protocol_whitelist file -analyzeduration 5M -probesize 10M`. Document: limits **protocols**, not path traversal (FS confinement is F's job).
- **C — rlimits via an exec'd launcher (NOT `preexec_fn`).** Tiny launcher (shim binary or `prlimit`/`systemd-run`) that `setrlimit`(AS/CPU/FSIZE/NOFILE/NPROC/`CORE=0`) + `PR_SET_NO_NEW_PRIVS` + `execv`. rlimits wrap the **final binary**, not the bwrap launcher. (`preexec_fn` is deadlock-unsafe under threaded/async uvicorn — 3-reviewer consensus.)
- **D — Input size cap at the boundary**, streamed, before any spawn (amendment 1).
- **E — Fail-closed everywhere**, including parent-side parsing of hostile output.

**bwrap path (production):**
- **F — Namespace + FS + network sandbox via bwrap** with the *exact ldd-tested* bind set:
  `--ro-bind /usr /usr --ro-bind /usr/local /usr/local --ro-bind /lib /lib --ro-bind /lib64 /lib64 --ro-bind /etc/ld.so.cache /etc/ld.so.cache --ro-bind /etc/ssl /etc/ssl --proc /proc --dev /dev --tmpfs /tmp --ro-bind <input> <input> --bind <scratch> <scratch> --chdir <scratch> --unshare-user --unshare-pid --unshare-ipc --unshare-net --die-with-parent --new-session --clearenv --setenv PATH ... --setenv LANG ... --setenv TMPDIR <scratch>`. **Forbid `--ro-bind / /`.** (SVF `ninja install`s to `/usr/local`.)
- **G — seccomp-bpf** as a **vetted base profile** (NOT hand-rolled fail-open BPF): start from Docker default denies + explicit denies of `unshare`/`clone(CLONE_NEWUSER|CLONE_NEWNS)`/`ptrace`/`keyctl`/`add_key`/`bpf`/`socket(AF_ALG|AF_PACKET|AF_NETLINK)`; **must still allow** `execve`/`execveat` and `CLONE_THREAD` (ffmpeg/gstreamer are multithreaded). Derive the allowlist from a recorded `strace -f` of genuine + tampered happy-path runs. **If a clean profile proves too costly in this build, descope G and mark AC7 conditional** (like AC5/AC6) — `--unshare-net` (F) already carries the network guarantee. Do not ship a fail-open filter.

## The 23 amendments — each is a build requirement
1. **Upload cap (A1):** replace `await file.read()` (`main.py:73`) with Content-Length reject-if-over-max + bounded 8 MB-chunk streaming to disk, abort+unlink on overflow. Reuse `config.py:10 max_file_size_bytes`; set the agreed default; **delete the ~50 GB value**.
2. **Cap captured subprocess output** in `run_sandboxed`: hard byte ceiling, kill child on overflow (or size-capped files / DEVNULL + bounded-prefix reads).
3. **Scrub child env:** minimal explicit env (`PATH`/`LANG`/`TMPDIR`); bwrap `--clearenv` + `--setenv`. Assert `WORKER_API_KEY` absent in child.
4. **Kill the process group on timeout:** `start_new_session=True`; on timeout `SIGKILL` the group then reap. Don't rely on `--die-with-parent` for the request-timeout case.
5. **Read result file safely:** parent reads `validation_results.txt` with `O_NOFOLLOW` (ideally `openat` in an fd-pinned scratch), reject symlinks/non-regular files, never echo contents into errors/callbacks.
6. **rlimits/prctl off `preexec_fn`** → launcher (control C).
7. **Exact bwrap bind set as a contract** (control F), tested via `ldd` on both binaries in the built image.
8. **Fix capability probe** (above).
9. **State WHERE the rubric runs:** ACs 1-3/5/6/7/9-12/15/16 run **inside the Linux container in CI** (`docker build` → `docker run ... pytest`), not on macOS. Add `@pytest.mark.linux_sandbox` that is **collected-and-FAILED** (not skipped) off Linux. AC1 in the production image. Spell out the exact `/goal`/CI command.
10. **`SandboxResult` dataclass** as above; `run_sandboxed` does not raise on launch failure; stdout undecoded.
11. **Per-call-site integration:** svf_runner → `ro_paths=[file_path]`, `scratch_dir=work_dir` (still `mkdtemp`'d by svf_runner), read `validation_results.txt` from `work_dir`. Both ffprobe sites → `ro_paths=[file_path]`, throwaway empty scratch. **Input temp files in `settings.temp_dir` are NOT under scratch and MUST be in `ro_paths`.** Name the scratch owner per site.
12. **Harden fail-closed:** cleanup = `shutil.rmtree(work_dir, ignore_errors=True)` (replace `unlink`+`rmdir`). Any non-zero exit / signal death → `status=error`, **do not parse output for a verdict**.
13. **Guard parent-side parsing:** wrap `float(fmt.get('duration',0))` (`video_info.py:49`) and `int(nb_frames)` (`:78`) in try/except → inconclusive/error. Add a parse-fuzz test.
14. **Fix AC9 contract name** to `VerificationResult`; add real-bytes regression (genuine AXIS clip → `authentic`; tampered fixture → `tampered`) through the sandboxed pipeline. Downgrade mock-keyed tests to "mock path unaffected."
15. **Wiring-proof test:** with `use_mock_results=False`, assert `create_subprocess_exec` is no longer called directly in `video_info.py`/`svf_runner.py` and `run_sandboxed` is invoked N times/verify.
16. **Bounded-concurrency gate:** worker-local semaphore sized vs per-job `RLIMIT_AS` + parent buffers vs the container/Machine memory cap; set the memory limit explicitly.
17. **Split AC4:** (4a any host) static-arg assertion both ffprobe sites carry the whitelist+caps; (4b Linux) concat-script sentinel test. Correct control-B wording.
18. **Enumerate deps + config keys:** `prctl` (ctypes libc or `python-prctl` in `requirements.txt`); seccomp source/build step or `nsjail` apt dep. `SANDBOX_*` keys w/ types+defaults: `SANDBOX_RLIMIT_AS_BYTES`, `SANDBOX_RLIMIT_CPU_SECONDS_FFPROBE`, `SANDBOX_RLIMIT_CPU_SECONDS_VALIDATOR`, `SANDBOX_RLIMIT_FSIZE_BYTES`, `SANDBOX_RLIMIT_NPROC`, `SANDBOX_MAX_INPUT_BYTES`, `SANDBOX_ALLOW_NET=False`, `ALLOW_DEGRADED_SANDBOX=False`.
19. **rlimits inside the sandbox, not on the launcher;** `RLIMIT_NPROC` sized to real codec thread/fork counts (NOT 0-extra).
20. **Pin SVF clones + multi-stage image:** pin both `git clone`s (`Dockerfile:28,35`) to commit SHAs (or tags+checksum); compile in a builder stage, copy only runtime binary + minimal libs into a slim/distroless runtime; drop git/compiler/headers/source.
21. **Flag verdict-from-text trust boundary** (threat-model note + separate task): `parse_svf_output` substring-matches across combined output — forgeable. Anchor status regexes; gate verdict on `return_code==0` + single authoritative status line. *(Flag only — not built here.)*
22. **Document callback SSRF** (threat-model note + separate task): `--unshare-net` doesn't cover the parent's callback POST (`main.py:91-101`). Allowlist hosts/schemes; block private/link-local/metadata IPs; stop sending `WORKER_API_KEY` to attacker URLs. *(Flag only — not built here.)*
23. **Per-job 0700 + resolve input path before bind;** one parent per job; bind input by resolved absolute path immediately before bwrap binds it.

### Resource defaults (C5 — validate before lock, then set)
Start: `RLIMIT_AS` 1 GiB, max input 500 MB, CPU 20s ffprobe / 60s validator, `RLIMIT_NPROC` sized to real codec thread counts. **Validate against real AXIS clip sizes in the happy-path test before locking** — too-tight breaks threaded ffmpeg + bwrap's monitor child; too-loose defeats the DoS goal.

## Acceptance rubric (all must pass; Linux container unless noted)
1. Non-root: subprocess `uid != 0` (production image). 2. rlimits: over-`RLIMIT_AS` alloc killed → `error`, `/health` 200. 3. Wall+CPU+pgroup: hanging/spinning child terminated; **no orphan ffprobe/bwrap**; result `error`/`inconclusive`. 4. (4a any host) both ffprobe sites carry `-protocol_whitelist file -analyzeduration 5M -probesize 10M`; (4b Linux) concat-script can't read out-of-input file. 5. Network blocked (bwrap): child socket/connect fails. 6. FS confinement (bwrap): child can't read `/etc/hostname`/`/app/certs`/app source. 7. No child-exec (seccomp, conditional per C3). 8. Fail-closed: launch-fail vs rlimit-kill vs timeout distinguishable in `SandboxResult`; clean result + scratch `rmtree` + worker survives; no unhandled exception reaches handler. 9. Env scrubbed: `WORKER_API_KEY` absent in child. 10. Output cap: stdout-flood child killed, worker up. 11. Symlink defense: child symlinking `validation_results.txt` → `/app/certs` leaks nothing. 12. Truncated-result safety: RLIMIT_FSIZE/AS kill → `status=error`, never `authentic`/`tampered`. 13. Upload cap: 1 GB upload → HTTP 400, heap bounded, `/health` 200. 14. Concurrency: host stays up under M concurrent hostile uploads. 15. Wiring proof (amendment 15). 16. Real-bytes happy path (amendment 14). 17. Probe logged + DEGRADED gates `/verify` 503 unless `ALLOW_DEGRADED_SANDBOX=true`.

CI: `docker build -t epworker . && docker run --rm epworker pytest -m linux_sandbox` (+ host-runnable static ACs in normal `pytest`).

## Out of scope (do not build)
- Increment 2 (Fly/object-storage/queue/split). Tier 1 (Rust worker) / Tier 2 (pure-Rust verify). Stubbed Python crypto (`validators.py`/`certificate_validator.py` TODOs). The TS app. Amendments 21 & 22 (flag in threat-model section only).

## Build constraints
- No `git commit` / `git push` — leave the working tree for Claude review.
- Match existing code style; surgical edits; don't drive-by refactor unrelated code.
- If a control can't be cleanly built in this pass (esp. seccomp G), apply the documented descope (mark AC7 conditional) and **report it** rather than shipping something fail-open.
- End by writing a short `TIER0-BUILD-REPORT.md` in this dir: what was implemented, which ACs pass and where (host vs CI), what was descoped/deferred, and the resource defaults chosen.
