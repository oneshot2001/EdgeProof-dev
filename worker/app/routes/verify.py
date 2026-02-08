"""
Verification route — separated for modularity.

In the current implementation, the verify endpoint is defined directly in main.py.
This module exists for future use when the verification pipeline becomes more complex
and warrants its own router.
"""

from fastapi import APIRouter

router = APIRouter()

# Future: move the /verify endpoint here when the pipeline grows
