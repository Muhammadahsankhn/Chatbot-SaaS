# ai-service/routers/admin_router.py
from datetime import datetime, timedelta
from fastapi  import APIRouter, Depends, HTTPException
from bson     import ObjectId

from database import get_db
from auth     import get_admin_user
from models   import AdminUpdatePlan

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Overview stats ──
@router.get("/stats")
async def get_stats(admin: dict = Depends(get_admin_user)):
    db = get_db()

    total_users         = await db.users.count_documents({"role": {"$ne": "admin"}})
    total_conversations = await db.conversations.count_documents({})

    msg_agg = await db.conversations.aggregate([
        {"$group": {"_id": None, "total": {"$sum": "$messageCount"}}}
    ]).to_list(1)
    total_messages = msg_agg[0]["total"] if msg_agg else 0

    today_start  = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    new_today    = await db.users.count_documents({"createdAt": {"$gte": today_start}, "role": {"$ne": "admin"}})
    active_today = await db.conversations.count_documents({"createdAt": {"$gte": today_start}})

    plan_pipeline = [
        {"$match": {"role": {"$ne": "admin"}}},
        {"$group": {"_id": "$plan", "count": {"$sum": 1}}}
    ]
    plan_breakdown = await db.users.aggregate(plan_pipeline).to_list(10)

    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    week_pipeline  = [
        {"$match": {"createdAt": {"$gte": seven_days_ago}, "role": {"$ne": "admin"}}},
        {"$group": {
            "_id":   {"$dateToString": {"format": "%Y-%m-%d", "date": "$createdAt"}},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    new_users_week = await db.users.aggregate(week_pipeline).to_list(7)

    return {
        "success": True,
        "stats": {
            "totalUsers":         total_users,
            "totalConversations": total_conversations,
            "totalMessages":      total_messages,
            "newUsersToday":      new_today,
            "activeToday":        active_today,
            "planBreakdown":      plan_breakdown,
            "newUsersWeek":       new_users_week,
        }
    }


# ── Get all users ──
@router.get("/users")
async def get_users(
    page:   int = 1,
    limit:  int = 15,
    search: str = "",
    plan:   str = "",
    admin:  dict = Depends(get_admin_user)
):
    db    = get_db()
    query = {"role": {"$ne": "admin"}}

    if search:
        query["$or"] = [
            {"fullname": {"$regex": search, "$options": "i"}},
            {"email":    {"$regex": search, "$options": "i"}},
        ]
    if plan:
        query["plan"] = plan

    total  = await db.users.count_documents(query)
    cursor = db.users.find(query, {"password": 0}) \
        .sort("createdAt", -1) \
        .skip((page - 1) * limit) \
        .limit(limit)

    users = []
    async for u in cursor:
        conv_count = await db.conversations.count_documents({"userId": u["_id"]})
        users.append({
            "id":                str(u["_id"]),
            "fullname":          u.get("fullname", ""),
            "email":             u.get("email", ""),
            "plan":              u.get("plan", "starter"),
            "role":              u.get("role", "user"),
            "status":            u.get("status", "active"),
            "messageCount":      u.get("messageCount", 0),
            "conversationCount": conv_count,
            "createdAt":         str(u.get("createdAt", "")),
        })

    return {"success": True, "users": users, "total": total, "page": page}


# ── Get single user detail ──
@router.get("/users/{user_id}")
async def get_user(user_id: str, admin: dict = Depends(get_admin_user)):
    db   = get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)}, {"password": 0})
    if not user:
        raise HTTPException(404, "User not found.")

    convos = await db.conversations.find(
        {"userId": user["_id"]},
        {"messages": 0}
    ).sort("createdAt", -1).limit(10).to_list(10)

    msg_agg = await db.conversations.aggregate([
        {"$match": {"userId": user["_id"]}},
        {"$group": {"_id": None, "total": {"$sum": "$messageCount"}}}
    ]).to_list(1)

    return {
        "success": True,
        "user": {
            "id":           str(user["_id"]),
            "fullname":     user.get("fullname", ""),
            "email":        user.get("email", ""),
            "plan":         user.get("plan", "starter"),
            "role":         user.get("role", "user"),
            "status":       user.get("status", "active"),
            "messageCount": user.get("messageCount", 0),
            "createdAt":    str(user.get("createdAt", "")),
        },
        "stats": {
            "totalConversations": len(convos),
            "totalMessages":      msg_agg[0]["total"] if msg_agg else 0,
        },
        "recentConversations": [
            {
                "id":           str(c["_id"]),
                "sessionId":    c.get("sessionId", ""),
                "page":         c.get("page", ""),
                "messageCount": c.get("messageCount", 0),
                "status":       c.get("status", "ended"),
                "createdAt":    str(c.get("createdAt", "")),
            }
            for c in convos
        ]
    }


# ── Update user plan ──
@router.put("/users/{user_id}/plan")
async def update_plan(user_id: str, body: AdminUpdatePlan, admin: dict = Depends(get_admin_user)):
    db = get_db()
    if body.plan not in ["starter", "pro", "enterprise"]:
        raise HTTPException(400, "Invalid plan.")
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"plan": body.plan, "updatedAt": datetime.utcnow()}}
    )
    return {"success": True, "message": f"Plan updated to {body.plan}."}


# ── Toggle suspend / active ──
@router.put("/users/{user_id}/toggle-status")
async def toggle_status(user_id: str, admin: dict = Depends(get_admin_user)):
    db   = get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(404, "User not found.")

    new_status = "active" if user.get("status") == "suspended" else "suspended"
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"status": new_status, "updatedAt": datetime.utcnow()}}
    )
    return {"success": True, "status": new_status}


# ── Delete user + all data ──
@router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(get_admin_user)):
    db   = get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(404, "User not found.")

    await db.conversations.delete_many({"userId": user["_id"]})
    await db.users.delete_one({"_id": user["_id"]})
    return {"success": True, "message": "User and all data deleted."}


# ── All conversations ──
@router.get("/conversations")
async def get_conversations(
    page:   int = 1,
    limit:  int = 20,
    search: str = "",
    admin:  dict = Depends(get_admin_user)
):
    db    = get_db()
    query = {}
    if search:
        query["sessionId"] = {"$regex": search, "$options": "i"}

    total  = await db.conversations.count_documents(query)
    cursor = db.conversations.find(query, {"messages": 0}) \
        .sort("createdAt", -1) \
        .skip((page - 1) * limit) \
        .limit(limit)

    convos = []
    async for c in cursor:
        user = await db.users.find_one({"_id": c.get("userId")}, {"fullname": 1, "email": 1, "plan": 1})
        convos.append({
            "id":           str(c["_id"]),
            "sessionId":    c.get("sessionId", ""),
            "page":         c.get("page", ""),
            "messageCount": c.get("messageCount", 0),
            "status":       c.get("status", "ended"),
            "createdAt":    str(c.get("createdAt", "")),
            "userId": {
                "fullname": user.get("fullname", "") if user else "",
                "email":    user.get("email",    "") if user else "",
                "plan":     user.get("plan",     "") if user else "",
            } if user else None
        })

    return {"success": True, "conversations": convos, "total": total, "page": page}