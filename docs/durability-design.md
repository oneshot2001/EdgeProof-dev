# "Vendor-disappears" durability — design note (2026-09-22)

Driver: FBI Cyber Strategy 2026 §4.3 — evidentiary systems must survive long-running prosecutions and the
post-quantum transition. Question: can a clip signed today be re-verified after (a) signing-key rotation,
(b) certificate expiry, (c) EdgeProof and Axis both offline, using only an exported bundle + PKI history?

## Findings (code at the pinned SVF SHAs: lib `1ae9fed` = v2.3.5, examples `e009c31`)

- **There is no bundle today.** `VerificationResult` JSON + a certificate PDF (`src/lib/pdf/certificate.ts`)
  that carries file SHA-256 and verdict only — no cert chain, no validator identity, no timestamp proof.
- **Trust anchor is compiled into SVF**, not the worker: `sv_axis_communications.c:45 kTrustedAxisRootCA`
  = `CN=Axis Edge Vault CA ECC`, notAfter **2035-10-26**, SHA-256
  `c2a6772c54cea7965d882c80243c6a1dd28d8a6ebd0bee6fa8357bec814d77a6`. Now saved at
  `worker/certs/axis-edge-vault-ca-ecc.pem`. The 8 Device ID PEMs in `worker/certs/` have zero callers.
- **Chain check is wall-clock**, `X509_verify_cert` default flags, no CRL/OCSP, no time override. Chain
  failure prints `PUBLIC KEY IS NOT VALID!` while the hash result prints `VIDEO IS VALID!` independently.
- **Timestamps** are camera-signed only; no TSA. Parsed in `svf_runner.py` but dropped by `map_to_result`.
- **Revocation:** nothing. **Key rotation:** SVF models only mid-stream change (→ NOT_OK); no cross-clip history.
- **Pre-existing parser bug:** `parse_svf_output` matches `video is signed and verified` /
  `public key validated` / `Number of OK Bitstream Units` — strings the pinned validator never emits
  (it writes `PUBLIC KEY IS VALID!` / `VIDEO IS VALID!` / `Number of valid GOPs:`). Real signed clips land
  `inconclusive`; only `unsigned` works. `PUBLIC KEY IS NOT VALID!` is a no-op branch.

## Predicted outcomes today

| Scenario | Outcome |
|---|---|
| (a) key rotation after the clip | SVF verifies (clip is self-contained); EdgeProof cannot say which key the device held at recording time; parser bug → `inconclusive` anyway |
| (b) cert expiry (leaf, or root on 2035-10-26) | Fails and misreports: `PUBLIC KEY IS NOT VALID!` ignored → today `inconclusive` with no reason; after a naive parser fix, `authentic` with `certificate_chain.valid=True` |
| (c) EdgeProof + Axis offline | Nothing to verify with: no anchors, no raw output, no validator identity in any artifact |

## Bundle must carry (ranked)

1. Trust anchors as PEM + fingerprint + notAfter (Edge Vault CA + Device ID roots).
2. Validator identity: SVF SHAs + verbatim `validation_results.txt`.
3. Trusted verification-time record: `verified_at` + file SHA-256 + result hash, ideally RFC 3161 TSA token. Only thing that makes (b) survivable.
4. Device key record: leaf SPKI SHA-256, serial, validity, CN. Distinguishes rotation from forgery in (a). **Blocked**: validator does not print the chain.
5. Explicit revocation statement `{"checked": false, "source": null}`.
6. File SHA-256 + retention statement.
7. PQ: ECDSA P-256 is the fragile element; only (3) re-timestamping mitigates. Record algorithm ids.

## Night-loop split

Five items in `BACKLOG.md` Ready (parser fix → mapper → `bundle.py` → offline chain walk → scenario matrix).
Items 4–5 use a synthetic in-test PKI; production `chain_pems` stays empty until the chain-exposure decision.

## Decisions for Matthew

- **Chain exposure**: fork `apps/validator/main.c` to dump the chain PEMs, or write a Python SEI parser
  (UUID `5369676e-6564-2056-6964-656f2e2e2e30`). `/codex-pair` before lock-in.
- **`VIDEO IS VALID, BUT HAS MISSING FRAMES!`** → item 1 maps to `inconclusive`. Alternatives: `authentic` + gap error, or `tampered`.
- **Empirical (b)**: real Q6358-LE clip run under `faketime '2036-01-01'` in Docker; needs a fixture clip. `linux_sandbox` item.
- **Hard wall 2035-10-26**: stock SVF rejects every Axis chain after the root expires. Fix = fork with
  `X509_VERIFY_PARAM_set_time` at the signed camera timestamp, or evaluate at `verified_at` via the bundle (item 4).
