import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    client = AsyncIOMotorClient('mongodb://127.0.0.1:27017')
    db = client.digichat
    user = await db.users.find_one({})
    if user:
        print(f"ID: {user['_id']}")
        print(f"ID TYPE: {type(user['_id'])}")
    else:
        print("No users found.")

if __name__ == "__main__":
    asyncio.run(check())
