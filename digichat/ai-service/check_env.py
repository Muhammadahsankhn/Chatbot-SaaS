import os
from dotenv import load_dotenv

load_dotenv()
print(f"JWT_SECRET: {os.getenv('JWT_SECRET')}")
print(f"JWT_KEY: {os.getenv('JWT_KEY')}")
