# Axis PKI Certificates

This directory should contain the Axis Communications PKI certificates for video signature verification.

## Required certificates

Download from https://www.axis.com/support/public-key-infrastructure-repository

### Root CAs
- `axis-device-id-root-ca-rsa.pem` — RSA Root CA (valid until 2060)
- `axis-device-id-root-ca-ecc.pem` — ECC Root CA (valid until 2060)

### Intermediate CAs
- `axis-device-id-intermediate-ca-rsa-1.pem`
- `axis-device-id-intermediate-ca-rsa-2.pem`
- `axis-device-id-intermediate-ca-rsa-3.pem`
- `axis-device-id-intermediate-ca-ecc-1.pem`
- `axis-device-id-intermediate-ca-ecc-2.pem`
- `axis-device-id-intermediate-ca-ecc-3.pem`

## Certificate standard

IEEE 802.1AR (Initial Device Identifier / IDevID)

## Algorithms
- RSA: 2048-bit and 4096-bit
- ECC: P-256 (secp256r1)
- Signature: SHA-256 with RSA or ECDSA
