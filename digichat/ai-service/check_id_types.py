import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def check():
    client = AsyncIOMotorClient('mongodb://127.0.0.1:27017')
    db = client.digichat
    async for user in db.users.find({}).limit(5):
        print(f"User: {user.get('email')}, ID: {user.get('_id')}, ID_TYPE: {type(user.get('_id'))}")

if __name__ == "__main__":
    asyncio.run(check())
