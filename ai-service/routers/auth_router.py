# ai-service/routers/auth_router.py
import os
import json
import urllib.parse
from datetime          import datetime
from fastapi           import APIRouter, HTTPException, Response, Request
from fastapi.responses import RedirectResponse
from bson              import ObjectId
from dotenv            import load_dotenv
import httpx

from database import get_db
from models   import UserCreate, UserLogin, new_api_key
from auth     import hash_password, verify_password, create_token, decode_token

load_dotenv()

# ── Env vars ──
GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")

# Supports both GOOGLE_REDIRECT_URI and GOOGLE_CALLBACK_URL
GOOGLE_REDIRECT_URI = (
    os.getenv("GOOGLE_REDIRECT_URI") or
    os.getenv("GOOGLE_CALLBACK_URL") or
    "http://localhost:8000/users/auth/google/callback"
)

# No trailing slash
FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "https://www.digicareproducts.com/digichat"
).rstrip("/")

router = APIRouter(prefix="/users", tags=["auth"])


# ── Helper: build response payload ──
def user_out(user: dict, token: str) -> dict:
    return {
        "success": True,
        "token":   token,
        "user": {
            "id":       str(user["_id"]),
            "fullname": user.get("fullname", ""),
            "email":    user.get("email",    ""),
            "plan":     user.get("plan",     "starter"),
            "role":     user.get("role",     "user"),
            "status":   user.get("status",   "active"),
            "apiKey":   user.get("apiKey") or user.get("generatedApiKey", ""),
        }
    }


# ══════════════════════════════════════════════
# REGISTER
# ══════════════════════════════════════════════
@router.post("/register")
async def register(body: UserCreate, response: Response):
    db = get_db()

    existing = await db.users.find_one({"email": body.email})
    if existing:
        raise HTTPException(400, "Email already registered.")

    api_key_val = new_api_key()
    now  = datetime.utcnow()
    user = {
        "fullname":        body.fullname,
        "email":           body.email,
        "password":        hash_password(body.password),
        "plan":            "starter",
        "role":            "user",
        "status":          "active",
        "apiKey":          api_key_val,
        "generatedApiKey": api_key_val,
        "domains":         [],
        "messageCount":    0,
        "widgetConfig": {
            "botName":        "Assistant",
            "welcomeMessage": "Hi! How can I help you today?",
            "color":          "#6366f1",
            "position":       "bottom-right",
            "theme":          "light",
            "placeholder":    "Type a message...",
            "logoUrl":        "",
            "systemPrompt":   "",
        },
        "createdAt": now,
        "updatedAt": now,
    }

    result      = await db.users.insert_one(user)
    user["_id"] = result.inserted_id
    token       = create_token(str(result.inserted_id), user["role"])

    response.set_cookie("token", token, httponly=True, samesite="lax", secure=False)
    return user_out(user, token)


# ══════════════════════════════════════════════
# LOGIN
# ══════════════════════════════════════════════
@router.post("/login")
async def login(body: UserLogin, response: Response):
    db   = get_db()
    user = await db.users.find_one({"email": body.email})

    if not user:
        raise HTTPException(401, "Email or password incorrect.")

    if user.get("status") == "suspended":
        raise HTTPException(403, "Your account has been suspended. Please contact support.")

    if not verify_password(body.password, user.get("password", "")):
        raise HTTPException(401, "Email or password incorrect.")

    token = create_token(str(user["_id"]), user.get("role", "user"))
    response.set_cookie("token", token, httponly=True, samesite="lax", secure=False)
    return user_out(user, token)


# ══════════════════════════════════════════════
# LOGOUT
# ══════════════════════════════════════════════
@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("token")
    return {"success": True, "message": "Logged out."}


# ══════════════════════════════════════════════
# PROFILE
# ══════════════════════════════════════════════
@router.get("/profile")
async def profile(request: Request):
    # Get token from cookie or Authorization header
    token = (
        request.cookies.get("token") or
        request.headers.get("authorization", "").replace("Bearer ", "").strip()
    )

    if not token:
        raise HTTPException(401, "Not authenticated.")

    payload = decode_token(token)
    uid     = payload.get("id")
    if not uid:
        raise HTTPException(401, "Invalid token.")

    db   = get_db()
    user = await db.users.find_one({"_id": ObjectId(uid)})
    if not user:
        raise HTTPException(404, "User not found.")

    return {
        "success": True,
        "user": {
            "id":           str(user["_id"]),
            "fullname":     user.get("fullname", ""),
            "email":        user.get("email", ""),
            "plan":         user.get("plan", "starter"),
            "role":         user.get("role", "user"),
            "status":       user.get("status", "active"),
            "apiKey":       user.get("apiKey", ""),
            "domains":      user.get("domains", []),
            "widgetConfig": user.get("widgetConfig", {}),
            "messageCount": user.get("messageCount", 0),
            "createdAt":    str(user.get("createdAt", "")),
        }
    }


# ══════════════════════════════════════════════
# GOOGLE OAUTH — Step 1: Redirect to Google
# ══════════════════════════════════════════════
@router.get("/auth/google")
async def google_auth(intent: str = "login"):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(500, "Google OAuth not configured.")

    params = (
        f"client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={GOOGLE_REDIRECT_URI}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
        f"&access_type=offline"
        f"&prompt=consent"
        f"&state={intent}"
    )

    url = f"https://accounts.google.com/o/oauth2/v2/auth?{params}"
    print(f"[Google Auth] Redirecting → redirect_uri={GOOGLE_REDIRECT_URI} state={intent}")
    return RedirectResponse(url=url)


# ══════════════════════════════════════════════
# GOOGLE OAUTH — Step 2: Callback from Google
# ══════════════════════════════════════════════
@router.get("/auth/google/callback")
async def google_callback(code: str, response: Response, state: str = "login"):
    db = get_db()

    print(f"[Google Callback] Code received. redirect_uri={GOOGLE_REDIRECT_URI}")

    # ── Exchange code for access token ──
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code":          code,
                "client_id":     GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "redirect_uri":  GOOGLE_REDIRECT_URI,
                "grant_type":    "authorization_code",
            }
        )
        token_data = token_res.json()

        if "error" in token_data:
            print(f"[Google Callback] Error: {token_data}")
            raise HTTPException(400, f"Google OAuth error: {token_data['error']}")

        # ── Get user info ──
        user_res = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token_data['access_token']}"}
        )
        guser = user_res.json()

    email    = guser.get("email")
    fullname = guser.get("name", email)

    if not email:
        raise HTTPException(400, "Could not get email from Google.")

    print(f"[Google Callback] User authenticated: {email}")

    # ── Find or check user ──
    now  = datetime.utcnow()
    user = await db.users.find_one({"email": email})

    if not user:
        if state == "register":
            api_key_val = new_api_key()
            doc = {
                "fullname":        fullname,
                "email":           email,
                "password":        "",
                "googleId":        guser.get("sub"),
                "avatar":          guser.get("picture", ""),
                "plan":            "starter",
                "role":            "user",
                "status":          "active",
                "apiKey":          api_key_val,
                "generatedApiKey": api_key_val,
                "domains":         [],
                "messageCount":    0,
                "widgetConfig": {
                    "botName":        "Assistant",
                    "welcomeMessage": "Hi! How can I help you today?",
                    "color":          "#6366f1",
                    "position":       "bottom-right",
                    "theme":          "light",
                    "placeholder":    "Type a message...",
                    "logoUrl":        "",
                    "systemPrompt":   "",
                },
                "createdAt": now,
                "updatedAt": now,
            }
            result = await db.users.insert_one(doc)
            user   = await db.users.find_one({"_id": result.inserted_id})
        else:
            print(f"[Google Callback] User not found, rejecting login: {email}")
            redirect_url = f"{FRONTEND_URL}/login?error=not_registered"
            return RedirectResponse(url=redirect_url, status_code=302)
    else:
        # Update name & avatar if changed
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "fullname":  fullname,
                "googleId":  guser.get("sub"),
                "avatar":    guser.get("picture", ""),
                "updatedAt": now,
            }}
        )
        # Re-fetch updated user
        user = await db.users.find_one({"_id": user["_id"]})

    # ── Create JWT ──
    token = create_token(str(user["_id"]), user.get("role", "user"))
    response.set_cookie("token", token, httponly=True, samesite="lax", secure=True)

    # ── Build user payload for frontend ──
    user_data = {
        "id":       str(user["_id"]),
        "fullname": user.get("fullname", ""),
        "email":    user.get("email", ""),
        "role":     user.get("role", "user"),
        "plan":     user.get("plan", "starter"),
        "avatar":   user.get("avatar", ""),
        "apiKey":   user.get("apiKey") or user.get("generatedApiKey", ""),
    }

    encoded_user = urllib.parse.quote(json.dumps(user_data))

    # ── Redirect to React AuthCallback ──
    # FRONTEND_URL = https://www.digicareproducts.com/digichat
    # Final URL    = https://www.digicareproducts.com/digichat/auth/callback?token=...
    redirect_url = f"{FRONTEND_URL}/auth/callback?token={token}&user={encoded_user}"
    print(f"[Google Callback] Redirecting to frontend: {FRONTEND_URL}/auth/callback")

    return RedirectResponse(url=redirect_url, status_code=302)