from datetime import datetime, timezone

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID


@pytest.fixture(scope="module")
def synthetic_pki():
    keys = {}

    def make_chain(root_name):
        certs = []
        keys[root_name] = []
        issuer_key = None
        for common_name, not_after, is_ca in [
            (root_name, datetime(2035, 10, 26, tzinfo=timezone.utc), True),
            ("Test Intermediate", datetime(2033, 1, 1, tzinfo=timezone.utc), True),
            ("ACCC8E000001", datetime(2031, 1, 1, tzinfo=timezone.utc), False),
        ]:
            key = ec.generate_private_key(ec.SECP256R1())
            subject = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, common_name)])
            cert = (
                x509.CertificateBuilder()
                .subject_name(subject)
                .issuer_name(certs[-1].subject if certs else subject)
                .public_key(key.public_key())
                .serial_number(x509.random_serial_number())
                .not_valid_before(datetime(2020, 1, 1, tzinfo=timezone.utc))
                .not_valid_after(not_after)
                .add_extension(x509.BasicConstraints(ca=is_ca, path_length=None), critical=True)
                .sign(issuer_key or key, hashes.SHA256())
            )
            certs.append(cert)
            keys[root_name].append(key)
            issuer_key = key
        return tuple(certs)

    return {
        "trusted": make_chain("Test Root"),
        "unrelated": make_chain("Unrelated Root"),
        "trusted_keys": keys["Test Root"],
    }
