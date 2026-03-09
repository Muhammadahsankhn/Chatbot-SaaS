# ai-service/database.py
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/digichat")

client = None
db     = None

async def connect_db():
    global client, db
    client = AsyncIOMotorClient(MONGO_URI)
    db     = client.get_default_database()
    print(f"✅ Connected to MongoDB: {db.name}")

async def close_db():
    global client
    if client:
        client.close()
        print("MongoDB connection closed.")

def get_db():
    return db