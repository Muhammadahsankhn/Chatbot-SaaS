# ai-service/routers/user_router.py
from datetime import datetime, timedelta
from fastapi  import APIRouter, Depends, HTTPException
from bson     import ObjectId

from database import get_db
from auth     import get_current_user, hash_password, verify_password
from models   import UpdateProfile, ChangePassword, DomainAdd, DomainRemove, WidgetConfig

router = APIRouter(prefix="/users", tags=["users"])


# ── Get profile ──
@router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {
        "success": True,
        "user": {
            "id":           str(user["_id"]),
            "fullname":     user.get("fullname", ""),
            "email":        user.get("email", ""),
            "plan":         user.get("plan", "starter"),
            "role":         user.get("role", "user"),
            "status":       user.get("status", "active"),
            "apiKey":       user.get("apiKey") or user.get("generatedApiKey", ""),
            "domains":      user.get("domains", []),
            "widgetConfig": user.get("widgetConfig", {}),
            "messageCount": user.get("messageCount", 0),
            "createdAt":    str(user.get("createdAt", "")),
        }
    }


# ── Update profile ──
@router.put("/me")
async def update_profile(body: UpdateProfile, user: dict = Depends(get_current_user)):
    db = get_db()
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"fullname": body.fullname, "updatedAt": datetime.utcnow()}}
    )
    return {"success": True, "message": "Profile updated."}


# ── Change password ──
@router.put("/me/password")
async def change_password(body: ChangePassword, user: dict = Depends(get_current_user)):
    db = get_db()
    if not verify_password(body.currentPassword, user.get("password", "")):
        raise HTTPException(400, "Current password is incorrect.")
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password": hash_password(body.newPassword), "updatedAt": datetime.utcnow()}}
    )
    return {"success": True, "message": "Password changed."}


# ── Get API key ──
@router.get("/api-key")
async def get_api_key(user: dict = Depends(get_current_user)):
    return {"success": True, "apiKey": user.get("apiKey") or user.get("generatedApiKey", "")}


# ── Regenerate API key ──
@router.post("/api-key/regenerate")
async def regenerate_api_key(user: dict = Depends(get_current_user)):
    db = get_db()
    from models import new_api_key
    new_key = new_api_key()
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"apiKey": new_key, "updatedAt": datetime.utcnow()}}
    )
    return {"success": True, "apiKey": new_key}


# ── Get widget config ──
@router.get("/widget-config")
async def get_widget_config(user: dict = Depends(get_current_user)):
    return {"success": True, "widgetConfig": user.get("widgetConfig", {})}


# ── Update widget config ──
@router.put("/widget-config")
async def update_widget_config(body: WidgetConfig, user: dict = Depends(get_current_user)):
    db = get_db()
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"widgetConfig": body.dict(), "updatedAt": datetime.utcnow()}}
    )
    return {"success": True, "message": "Widget config saved."}


# ── Get domains ──
@router.get("/domains")
async def get_domains(user: dict = Depends(get_current_user)):
    return {"success": True, "domains": user.get("domains", [])}


# ── Add domain ──
@router.post("/domains")
async def add_domain(body: DomainAdd, user: dict = Depends(get_current_user)):
    db      = get_db()
    domains = user.get("domains", [])
    domain  = body.domain.strip().lower()
    if domain in domains:
        raise HTTPException(400, "Domain already added.")
    if len(domains) >= 10:
        raise HTTPException(400, "Maximum 10 domains allowed.")
    domains.append(domain)
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"domains": domains, "updatedAt": datetime.utcnow()}}
    )
    return {"success": True, "domains": domains}


# ── Remove domain ──
@router.delete("/domains")
async def remove_domain(body: DomainRemove, user: dict = Depends(get_current_user)):
    db      = get_db()
    domains = user.get("domains", [])
    domain  = body.domain.strip().lower()
    if domain not in domains:
        raise HTTPException(404, "Domain not found.")
    domains.remove(domain)
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {"domains": domains, "updatedAt": datetime.utcnow()}}
    )
    return {"success": True, "domains": domains}


# ── Dashboard stats (includes crawl status) ──
@router.get("/stats")
async def get_stats(user: dict = Depends(get_current_user)):
    db  = get_db()
    uid = user["_id"]

    total_conversations = await db.conversations.count_documents({"userId": uid})
    total_messages      = user.get("messageCount", 0)

    since        = datetime.utcnow() - timedelta(hours=24)
    active_today = await db.conversations.count_documents({
        "userId":    uid,
        "createdAt": {"$gte": since}
    })

    # Weekly activity (last 7 days)
    today_midnight = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    six_days_ago   = today_midnight - timedelta(days=6)

    pipeline = [
        {"$match": {"userId": uid, "createdAt": {"$gte": six_days_ago}}},
        {"$group": {
            "_id":   {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}},
            "count": {"$sum": "$messageCount"}
        }}
    ]
    weekly_raw  = await db.conversations.aggregate(pipeline).to_list(7)
    weekly_data = [0] * 7
    for d in weekly_raw:
        dt = datetime.strptime(d["_id"], "%Y-%m-%d")
        weekly_data[dt.weekday()] += d["count"]

    # ── Crawl status from knowledge base ──
    crawl_status = {}
    try:
        from services.knowledge_base import get_knowledge_base_status
        user_id_str  = str(uid)
        crawl_status = get_knowledge_base_status(user_id_str)
    except Exception:
        crawl_status = {
            "total_chunks": 0,
            "total_pages":  0,
            "last_crawled": None,
            "base_url":     None,
        }

    return {
        "success": True,
        "stats": {
            "totalConversations": total_conversations,
            "totalMessages":      total_messages,
            "activeToday":        active_today,
            "weeklyLabels":       ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
            "weeklyData":         weekly_data,
            # ── Knowledge base info ──
            "knowledgeBase": {
                "totalChunks": crawl_status.get("total_chunks", 0),
                "totalPages":  crawl_status.get("total_pages",  0),
                "lastCrawled": crawl_status.get("last_crawled", None),
                "baseUrl":     crawl_status.get("base_url",     None),
                "pageTypes":   crawl_status.get("page_types",   {}),
                "indexedUrls": crawl_status.get("indexed_urls", []),
            }
        }
    }


# ── Get all conversations ──
@router.get("/conversations")
async def get_conversations(user: dict = Depends(get_current_user)):
    db  = get_db()
    uid = user["_id"]

    cursor = db.conversations.find(
        {"userId": uid},
        {"messages": 0}
    ).sort("createdAt", -1).limit(50)

    convos = []
    async for c in cursor:
        convos.append({
            "id":           str(c["_id"]),
            "sessionId":    c.get("sessionId", ""),
            "page":         c.get("page", ""),
            "visitorId":    c.get("visitorId", ""),
            "messageCount": c.get("messageCount", 0),
            "status":       c.get("status", "ended"),
            "lastMessage":  c.get("lastMessage", "—"),
            "createdAt":    str(c.get("createdAt", "")),
        })

    return {"success": True, "conversations": convos}


# ── Get single conversation messages ──
@router.get("/conversations/{session_id}")
async def get_conversation(session_id: str, user: dict = Depends(get_current_user)):
    db    = get_db()
    convo = await db.conversations.find_one({
        "sessionId": session_id,
        "userId":    user["_id"]
    })
    if not convo:
        raise HTTPException(404, "Conversation not found.")

    messages = [
        {"role": m.get("role", ""), "content": m.get("text", m.get("content", ""))}
        for m in convo.get("messages", [])
    ]
    return {"success": True, "messages": messages}


# ── Analytics ──
@router.get("/analytics")
async def get_analytics(user: dict = Depends(get_current_user)):
    db  = get_db()
    uid = user["_id"]

    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    pipeline = [
        {"$match": {"userId": uid, "createdAt": {"$gte": thirty_days_ago}}},
        {"$group": {
            "_id":      {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}},
            "sessions": {"$sum": 1},
            "messages": {"$sum": "$messageCount"}
        }},
        {"$sort": {"_id": 1}}
    ]
    daily = await db.conversations.aggregate(pipeline).to_list(30)

    page_pipeline = [
        {"$match": {"userId": uid}},
        {"$group": {"_id": "$page", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_pages = await db.conversations.aggregate(page_pipeline).to_list(5)

    total_conversations = await db.conversations.count_documents({"userId": uid})
    total_messages      = user.get("messageCount", 0)
    since               = datetime.utcnow() - timedelta(hours=24)
    active_today        = await db.conversations.count_documents({
        "userId":    uid,
        "createdAt": {"$gte": since}
    })

    return {
        "success": True,
        "analytics": {
            "daily":              daily,
            "topPages":           [{"page": p["_id"] or "Direct", "count": p["count"]} for p in top_pages],
            "totalConversations": total_conversations,
            "totalMessages":      total_messages,
            "activeToday":        active_today,
        }
    }