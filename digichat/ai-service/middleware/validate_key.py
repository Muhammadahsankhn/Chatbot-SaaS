import os
from fastapi import Request, HTTPException
from dotenv import load_dotenv

load_dotenv()

INTERNAL_SERVICE_KEY = os.getenv("INTERNAL_SERVICE_KEY")


async def verify_internal_key(request: Request):
    """
    This middleware ensures ONLY the Node.js backend can call the Python AI service.
    The Node.js server sends a shared secret key in every request header.
    This prevents anyone from hitting the AI service directly and bypassing plan limits.
    """
    if not INTERNAL_SERVICE_KEY:
        # If no key is configured, skip check (development mode only)
        return

    service_key = request.headers.get("x-internal-service-key")

    if not service_key:
        raise HTTPException(
            status_code=401,
            detail="Missing internal service key. Only the ChatBase backend can call this service."
        )

    if service_key != INTERNAL_SERVICE_KEY:
        raise HTTPException(
            status_code=403,
            detail="Invalid internal service key."
        )