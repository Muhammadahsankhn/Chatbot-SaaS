# ai-service/routers/chat_router.py
import re
import uuid
from datetime import datetime
from fastapi  import APIRouter, HTTPException, Request
from bson     import ObjectId

from database import get_db
from models   import ChatMessage
from services.gemini          import get_gemini_reply_with_history
from services.embeddings      import embed_single
from services.knowledge_base  import search_knowledge_base   # ← disk-based vector search

router = APIRouter(prefix="/chat", tags=["chat"])


def is_local_origin(origin: str) -> bool:
    if not origin:
        return True
    return bool(re.search(r"192\.168\.|10\.0\.|10\.1\.|localhost|127\.0\.0\.1", origin))


# ── Get widget config by API key (public) ──
@router.get("/config/{api_key}")
async def get_widget_config(api_key: str):
    db   = get_db()
    user = await db.users.find_one({
        "$or": [{"apiKey": api_key}, {"generatedApiKey": api_key}]
    })
    if not user:
        raise HTTPException(404, "Invalid API key.")
    if user.get("status") == "suspended":
        raise HTTPException(403, "Account suspended.")

    cfg = user.get("widgetConfig", {})
    return {
        "success": True,
        "config": {
            "botName":        cfg.get("botName",        "Assistant"),
            "welcomeMessage": cfg.get("welcomeMessage", "Hi! How can I help you today?"),
            "color":          cfg.get("color",          "#6366f1"),
            "position":       cfg.get("position",       "bottom-right"),
            "theme":          cfg.get("theme",          "light"),
            "placeholder":    cfg.get("placeholder",    "Type a message..."),
            "logoUrl":        cfg.get("logoUrl",        ""),
        }
    }


# ── Send message (public — used by widget.js) ──
@router.post("/message")
async def send_message(body: ChatMessage, request: Request):
    db     = get_db()
    origin = request.headers.get("origin") or request.headers.get("referer") or ""

    api_key = request.headers.get("x-api-key", "")
    if not api_key:
        raise HTTPException(400, "API key required.")

    user = await db.users.find_one({
        "$or": [{"apiKey": api_key}, {"generatedApiKey": api_key}]
    })
    if not user:
        raise HTTPException(401, "Invalid API key.")
    if user.get("status") == "suspended":
        raise HTTPException(403, "Account suspended.")

    # Plan message limits
    plan_limits = {"starter": 500, "pro": 5000, "enterprise": 999999}
    limit       = plan_limits.get(user.get("plan", "starter"), 500)
    if user.get("messageCount", 0) >= limit:
        raise HTTPException(429, "Monthly message limit reached. Please upgrade your plan.")

    # Domain whitelist check
    if user.get("domains") and len(user["domains"]) > 0:
        if not is_local_origin(origin):
            allowed = any(d in origin for d in user["domains"])
            if not allowed:
                raise HTTPException(403, "Domain not authorized.")

    uid        = user["_id"]
    user_id    = str(uid)
    session_id = body.sessionId or str(uuid.uuid4())
    visitor_id = body.visitorId or str(uuid.uuid4())
    bot_config = user.get("widgetConfig", {})
    message    = body.message.strip()

    if not message:
        raise HTTPException(400, "Message cannot be empty.")

    # ── Search knowledge base on disk (numpy vectors) ──
    try:
        query_vector   = embed_single(message)
        context_chunks = search_knowledge_base(
            user_id        = user_id,
            query_embedding = query_vector,
            top_k          = 4
        )
        print(f"[Chat] Found {len(context_chunks)} context chunks for user {user_id}")
    except Exception as e:
        print(f"[Chat] Knowledge base search error: {e}")
        context_chunks = []

    # Build history in Gemini format
    history = []
    for h in (body.history or []):
        role = h.get("role", "")
        text = h.get("text") or h.get("content") or ""
        if role in ("user", "model") and text.strip():
            history.append({"role": role, "text": text})

    # ── Get Gemini reply ──
    result = get_gemini_reply_with_history(
        message        = message,
        history        = history,
        bot_config     = bot_config,
        context_chunks = context_chunks,
    )

    reply = result.get("reply", "I'm having trouble responding right now.")

    # ── Save conversation to MongoDB ──
    now       = datetime.utcnow()
    user_msg  = {"role": "user",  "text": message, "timestamp": now}
    model_msg = {"role": "model", "text": reply,   "timestamp": now}

    existing = await db.conversations.find_one({"sessionId": session_id, "userId": uid})
    if existing:
        await db.conversations.update_one(
            {"_id": existing["_id"]},
            {
                "$push": {"messages": {"$each": [user_msg, model_msg]}},
                "$inc":  {"messageCount": 1},
                "$set":  {"lastMessage": reply[:100], "updatedAt": now}
            }
        )
    else:
        await db.conversations.insert_one({
            "userId":       uid,
            "sessionId":    session_id,
            "visitorId":    visitor_id,
            "page":         body.page or "",
            "messages":     [user_msg, model_msg],
            "messageCount": 1,
            "lastMessage":  reply[:100],
            "status":       "active",
            "createdAt":    now,
            "updatedAt":    now,
        })

    await db.users.update_one({"_id": uid}, {"$inc": {"messageCount": 1}})

    return {
        "success":     True,
        "reply":       reply,
        "sessionId":   session_id,
        "contextUsed": len(context_chunks) > 0,
    }