from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.chat import router as chat_router
from routes.ingest import router as ingest_router
import uvicorn
import os
from dotenv import load_dotenv

load_dotenv()


app = FastAPI(
    title="ChatBase AI Service",
    description="Gemini-powered AI engine with RAG knowledge base",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router,   prefix="/chat",   tags=["Chat"])
app.include_router(ingest_router, prefix="/ingest", tags=["Ingest"])

@app.get("/")
def health_check():
    return {
        "status": "ok",
        "service": "ChatBase AI Service",
        "version": "1.0.0",
        "docs": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8001)), reload=False)