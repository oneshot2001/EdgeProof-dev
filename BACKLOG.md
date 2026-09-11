# BACKLOG — nightly Astra loop input (Claude writes, Matthew edits)

Rules: loop takes the TOP Ready item only. No `accept:` line → loop does not fire.
Branch `night/YYYY-MM-DD` off `feat/tier0-subprocess-sandbox` (current base; main is behind). Never push.
Out of scope until Matthew says otherwise: Increment 2 (Fly/queue/split), Tier 1/2 Rust, the TS app UI.

## Ready
- [ ] Close the worker verification gap in `CLAUDE.md`: add `worker/Makefile` with `venv` + `test` targets (`python3 -m venv .venv && .venv/bin/pip install -r requirements.txt pytest`, then `.venv/bin/pytest`) and document it in `CLAUDE.md` Verification — accept: `make -C worker test` exits 0 offline on this Mac; no changes under `src/`.
- [ ] `worker/app/sandbox.py`: add a unit test that `run_sandboxed` rejects an upload over the configured size limit before spawning ffprobe — accept: `make -C worker test` exits 0 with the new test.

## Blocked / needs Matthew
- [ ] DESIGN (no accept line, do not loop): "vendor-disappears" durability test — verify a previously signed clip after (a) signing-key rotation, (b) certificate expiry, (c) EdgeProof service offline, using only the exported bundle + published PKI history. Record what verifies, what fails, and what the bundle must additionally carry (cert chain history, timestamp proof, key-revocation state). Driver: FBI Cyber Strategy 2026 §4.3 ("evidentiary ... systems ... long-running prosecutions", post-quantum transition). Claude scopes; then split into night-loop items under `worker/`.

## Done
