# Tier 0 Sandbox Build Report

## Implemented

- Added `app/sandbox.py` with `SandboxResult`, startup capability probing, cached `bwrap` vs `DEGRADED` mode, bounded output capture, process-group kill on timeout, scrubbed child env, and fail-closed `run_sandboxed()`.
- Added exec-only rlimit launcher at `app/sandbox_launcher.py`; it sets `RLIMIT_AS`, `RLIMIT_CPU`, `RLIMIT_FSIZE`, `RLIMIT_NOFILE`, `RLIMIT_NPROC`, `RLIMIT_CORE=0`, and `PR_SET_NO_NEW_PRIVS`, then `execvpe()`s the final binary.
  The launcher uses stdlib `resource` plus `ctypes` against libc for `prctl`; no `preexec_fn` is used.
- Routed both ffprobe sites and the SVF validator through `run_sandboxed()`.
- Added ffprobe `-protocol_whitelist file -analyzeduration 5M -probesize 10M` at both ffprobe call sites.
  `-protocol_whitelist file` limits ffmpeg protocols only; path traversal protection comes from the filesystem namespace/bind set.
- Replaced unbounded upload read with Content-Length rejection plus bounded 8 MB chunk streaming to disk.
- Added the worker-local verification semaphore and explicit sandbox memory budget defaults.
- Added `/health` sandbox mode reporting and `/verify` 503 gating for `DEGRADED` unless `ALLOW_DEGRADED_SANDBOX=true`.
- Hardened SVF cleanup to `shutil.rmtree(..., ignore_errors=True)`.
- Added `O_NOFOLLOW`/`openat`-style result-file read for `validation_results.txt`.
- Added fail-closed handling for nonzero validator exits, signal deaths, launch failures, and timeouts before verdict parsing.
- Added parent-side ffprobe parse guards for hostile duration/frame/shape values.
- Reworked Dockerfile into builder/runtime stages, non-root `USER svc` uid `10001`, runtime `bubblewrap`, `seccomp`, `strace`, ffmpeg/GStreamer runtime deps, and copied only installed SVF artifacts into runtime.
- Added `pytest.ini` and `tests/test_sandbox.py` with host tests plus `@pytest.mark.linux_sandbox` Linux-container tests.

## Resource Defaults

- `MAX_FILE_SIZE_BYTES`: 500 MiB
- `SANDBOX_MAX_INPUT_BYTES`: 500 MiB
- `SANDBOX_RLIMIT_AS_BYTES`: 1 GiB
- `SANDBOX_RLIMIT_CPU_SECONDS_FFPROBE`: 20 seconds
- `SANDBOX_RLIMIT_CPU_SECONDS_VALIDATOR`: 60 seconds
- `SANDBOX_RLIMIT_FSIZE_BYTES`: 16 MiB
- `SANDBOX_RLIMIT_NPROC`: 64
- `SANDBOX_MAX_OUTPUT_BYTES`: 16 MiB
- `SANDBOX_MEMORY_LIMIT_BYTES`: 1536 MiB
- `SANDBOX_MAX_CONCURRENT_JOBS`: 1
- `SANDBOX_ALLOW_NET`: false
- `ALLOW_DEGRADED_SANDBOX`: false

## Acceptance Coverage

- Host tests: AC4a, AC8 partial, AC12 partial, AC13 boundary rejection, AC15, AC17 route gate.
- Linux-container tests: AC1, AC2, AC3, AC4b, AC5, AC6, AC8, AC9, AC10, AC11, AC14, AC17, plus ldd bind-contract coverage.
- Conditional tests: AC7 is `xfail` because seccomp-bpf is deliberately deferred; AC16 is `xfail` until genuine/tampered AXIS byte fixtures are added.

Expected CI command:

```bash
docker build -t epworker .
docker run --rm epworker pytest -m linux_sandbox
```

Host static/unit command once Python deps are installed:

```bash
python -m pytest -m "not linux_sandbox"
```

## Verification Run Here

- `python -m py_compile app/sandbox.py app/sandbox_launcher.py app/services/video_info.py app/services/svf_runner.py app/main.py tests/test_sandbox.py` passed.
- AST parse check for the same files passed.
- Host pytest did not run in this macOS workspace because `pytest` and app deps such as `pydantic_settings` are not installed.
- Docker/Linux rubric was not run here; local shell networking is blocked, so `docker build` cannot fetch SVF repos from GitHub in this environment.

## Deferred / Conditional

- Control G seccomp-bpf is deferred. No fail-open seccomp profile was shipped. `--unshare-net` remains the network boundary for Increment 1.
- Amendment 21 verdict-from-text injection is flag-only in this increment. A threat-model note was added near `parse_svf_output`; the parser still needs a later authoritative-status-line fix.
- Amendment 22 callback SSRF is flag-only in this increment. A threat-model note was added near the callback POST; parent callback allowlisting is deferred.
- AC16 real-bytes regression test is present as a fixture contract, but the repo has no genuine AXIS signed clip or tampered fixture to execute it.

## Deviations

- The Dockerfile has `SVF_SHA` and `SVF_EXAMPLES_SHA` build args and detached checkouts, but the defaults remain `master` because this environment could not resolve current upstream commit SHAs via shell networking. Before production use, set both defaults to reviewed full commit SHAs or pass them as build args in CI.

## Fix-pass (review round 1)

- FIX-1: Added `SandboxResult.output_overflow`, set it from the bounded-output reader, and fail closed on output overflow before SVF verdict parsing or ffprobe JSON parsing at both ffprobe gates.
- FIX-2: Changed the rlimit launcher to return sentinel exit code `125` for launcher setup/exec failures while keeping `127` for missing command, and changed sandbox launcher-failure detection to use only numeric `125`/`127`.
- FIX-3: Added `--unshare-cgroup` to the bubblewrap namespace flags used by normal sandbox runs and the capability probe.
- FIX-4: Added a Dockerfile build guard that fails if `SVF_SHA` or `SVF_EXAMPLES_SHA` is `master` unless `ALLOW_UNPINNED_SVF=true` is passed, and documented that production builds require reviewed full commit SHAs.
