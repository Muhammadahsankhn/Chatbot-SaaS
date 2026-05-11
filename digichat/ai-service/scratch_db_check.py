import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    client = AsyncIOMotorClient('mongodb://127.0.0.1:27017')
    db = client.digichat
    count = await db.users.count_documents({})
    print(f"Total users: {count}")
    async for user in db.users.find({}).limit(10):
        print(f"User: {user.get('email')}, ID: {user.get('_id')}")

if __name__ == "__main__":
    asyncio.run(check())
