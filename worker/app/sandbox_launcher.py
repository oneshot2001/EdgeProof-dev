#!/usr/bin/env python3
"""Exec-only rlimit launcher for sandboxed C subprocesses."""

import argparse
import ctypes
import os
import resource
import sys


PR_SET_NO_NEW_PRIVS = 38
RLIMITS = {
    "as_bytes": resource.RLIMIT_AS,
    "cpu_seconds": resource.RLIMIT_CPU,
    "fsize_bytes": resource.RLIMIT_FSIZE,
    "nofile": resource.RLIMIT_NOFILE,
    "core_bytes": resource.RLIMIT_CORE,
}

if hasattr(resource, "RLIMIT_NPROC"):
    RLIMITS["nproc"] = resource.RLIMIT_NPROC


def _set_limit(name: str, value: int) -> None:
    if value < 0:
        return
    resource.setrlimit(RLIMITS[name], (value, value))


def _set_no_new_privs() -> None:
    libc = ctypes.CDLL(None, use_errno=True)
    if libc.prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) != 0:
        errno = ctypes.get_errno()
        raise OSError(errno, os.strerror(errno))


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply rlimits and exec a child")
    parser.add_argument("--as-bytes", type=int, required=True)
    parser.add_argument("--cpu-seconds", type=int, required=True)
    parser.add_argument("--fsize-bytes", type=int, required=True)
    parser.add_argument("--nofile", type=int, required=True)
    parser.add_argument("--nproc", type=int, required=True)
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()

    command = args.command
    if command and command[0] == "--":
        command = command[1:]
    if not command:
        print("edgeproof-rlimit-launcher: missing command", file=sys.stderr)
        return 127

    try:
        _set_limit("core_bytes", 0)
        _set_limit("as_bytes", args.as_bytes)
        _set_limit("cpu_seconds", args.cpu_seconds)
        _set_limit("fsize_bytes", args.fsize_bytes)
        _set_limit("nofile", args.nofile)
        if "nproc" in RLIMITS:
            _set_limit("nproc", args.nproc)
        _set_no_new_privs()
        os.execvpe(command[0], command, os.environ)
    except Exception as exc:
        print(f"edgeproof-rlimit-launcher: {exc}", file=sys.stderr)
        return 125

    return 125


if __name__ == "__main__":
    raise SystemExit(main())
