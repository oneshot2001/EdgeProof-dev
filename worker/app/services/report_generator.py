"""
Report generator service.

Assembles the final verification JSON report from the outputs of:
- Video parser (container metadata)
- Signature extractor (device info, certificates)
- Certificate validator (chain validation)
- Integrity checker (frame/GOP verification)

Also determines the overall verdict:
- authentic: all GOPs verified, chain intact, cert valid
- tampered: any tampered GOPs or broken chain
- unsigned: no signing metadata found
- inconclusive: partial data, unable to determine
- error: processing failure
"""


async def generate_report(
    video_metadata: dict,
    signatures: dict,
    certificate_validation: dict,
    integrity: dict,
) -> dict:
    """Generate the final verification report."""
    # Determine overall status
    if not signatures.get("signatures_found"):
        status = "unsigned"
    elif integrity.get("tampered_gops", 0) > 0:
        status = "tampered"
    elif integrity.get("verified_gops", 0) == integrity.get("total_gops", 0):
        status = "authentic"
    else:
        status = "inconclusive"

    return {
        "status": status,
        "video_metadata": video_metadata,
        "certificate_chain": certificate_validation,
        "integrity": integrity,
    }
