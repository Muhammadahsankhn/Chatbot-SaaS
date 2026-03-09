# ai-service/models.py
from pydantic import BaseModel, EmailStr, Field
from typing   import Optional, List, Any
from datetime import datetime
import uuid

# ── Helper to generate API key ──
def new_api_key() -> str:
    return str(uuid.uuid4())

# ────────────────────────────────
# USER
# ────────────────────────────────
class UserCreate(BaseModel):
    fullname: str
    email:    EmailStr
    password: str

class UserLogin(BaseModel):
    email:    EmailStr
    password: str

class UserOut(BaseModel):
    id:       str
    fullname: str
    email:    str
    plan:     str = "starter"
    role:     str = "user"
    status:   str = "active"
    apiKey:   str

class WidgetConfig(BaseModel):
    botName:        Optional[str] = "Assistant"
    welcomeMessage: Optional[str] = "Hi! How can I help you today?"
    color:          Optional[str] = "#6366f1"
    position:       Optional[str] = "bottom-right"
    theme:          Optional[str] = "light"
    placeholder:    Optional[str] = "Type a message..."
    logoUrl:        Optional[str] = ""
    systemPrompt:   Optional[str] = ""

class UpdateProfile(BaseModel):
    fullname: str

class ChangePassword(BaseModel):
    currentPassword: str
    newPassword:     str

class DomainAdd(BaseModel):
    domain: str

class DomainRemove(BaseModel):
    domain: str

class UpdatePlan(BaseModel):
    plan: str

# ────────────────────────────────
# CHAT
# ────────────────────────────────
class ChatMessage(BaseModel):
    message:   str
    sessionId: Optional[str] = None
    visitorId: Optional[str] = None
    page:      Optional[str] = None
    history:   Optional[List[dict]] = []

# ────────────────────────────────
# ADMIN
# ────────────────────────────────
class AdminUpdatePlan(BaseModel):
    plan: str