import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def run():
    client = AsyncIOMotorClient("mongodb://localhost:27017/digichat")
    db = client.get_default_database()
    users = await db.users.find().to_list(100)
    for u in users:
        print("User:", u.get("email"), "API:", u.get("apiKey"), "Generated:", u.get("generatedApiKey"))
        print("Widget Config:", u.get("widgetConfig"))

asyncio.run(run())
