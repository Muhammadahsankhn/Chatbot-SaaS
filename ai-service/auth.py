# ai-service/auth.py
import os
from datetime import datetime, timedelta
from typing   import Optional

from jose        import JWTError, jwt
from passlib.context import CryptContext
from fastapi     import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv      import load_dotenv

from database import get_db

load_dotenv()

JWT_SECRET  = os.getenv("JWT_SECRET",  "digichat_jwt_secret_change_this")
ALGORITHM   = "HS256"
TOKEN_EXPIRE_DAYS = 7

import bcrypt

bearer = HTTPBearer(auto_error=False)

# ── Password utils ──
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain: str, hashed: str) -> bool:
    try:
        # Some old hashes might be from passlib, but standard bcrypt.checkpw should still work 
        # as long as they are valid bcrypt hashes.
        return bcrypt.checkpw(plain.encode('utf-8'), hashed.encode('utf-8'))
    except Exception:
        return False

# ── JWT utils ──
def create_token(user_id: str, role: str = "user") -> str:
    payload = {
        "id":   user_id,
        "role": role,
        "exp":  datetime.utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError:
        return {}

# ── Get token from request (Bearer header OR cookie) ──
def extract_token(request: Request, credentials: Optional[HTTPAuthorizationCredentials] = None) -> Optional[str]:
    # Try Authorization header first
    if credentials and credentials.credentials:
        return credentials.credentials
    # Then try cookie
    return request.cookies.get("token")

# ── Auth dependency ──
async def get_current_user(
    request:     Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
):
    token = extract_token(request, credentials)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    payload = decode_token(token)
    user_id = payload.get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token.")

    db   = get_db()
    from bson import ObjectId
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")

    if user.get("status") == "suspended":
        raise HTTPException(status_code=403, detail="Account suspended.")

    return user

# ── Admin dependency ──
async def get_admin_user(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user

# ── Internal service key dependency ──
INTERNAL_KEY = os.getenv("INTERNAL_SERVICE_KEY", "")

def verify_internal_key(request: Request):
    key = request.headers.get("x-internal-service-key", "")
    if key != INTERNAL_KEY:
        raise HTTPException(status_code=403, detail="Invalid internal service key.")