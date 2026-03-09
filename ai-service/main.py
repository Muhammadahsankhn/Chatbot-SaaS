# ai-service/main.py
import os
import asyncio
from contextlib import asynccontextmanager
from fastapi              import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses    import FileResponse, JSONResponse
from fastapi.staticfiles  import StaticFiles
from dotenv               import load_dotenv

from database             import connect_db, close_db
from routers.auth_router  import router as auth_router
from routers.user_router  import router as user_router
from routers.chat_router  import router as chat_router
from routers.admin_router import router as admin_router
from routers.ingest       import router as ingest_router

load_dotenv()

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "https://www.digicareproducts.com")
NODE_ENV        = os.getenv("NODE_ENV", "development")
FRONTEND_BUILD  = os.getenv("FRONTEND_BUILD", "../chatbot/dist")


# ── Lifespan: connect DB + start scheduler ──
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Connect MongoDB
    await connect_db()

    # Start auto-refresh scheduler in background
    from services.scheduler import auto_refresh_loop
    scheduler_task = asyncio.create_task(auto_refresh_loop())

    yield

    # Cleanup
    scheduler_task.cancel()
    await close_db()


app = FastAPI(
    title    = "Digi Chat API",
    version  = "2.0.0",
    lifespan = lifespan,
)

# ── CORS ──
origins = [o.strip() for o in ALLOWED_ORIGINS.split(",") if o.strip() and o.strip() != "*"]

if NODE_ENV != "production":
    origins += [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins      = origins,
    allow_origin_regex = r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$",
    allow_credentials  = True,
    allow_methods      = ["*"],
    allow_headers      = ["*"],
)

# ── Routers ──
app.include_router(auth_router)
app.include_router(user_router)
app.include_router(chat_router)
app.include_router(admin_router)
app.include_router(ingest_router, prefix="/ingest", tags=["ingest"])

# ── Serve widget.js ──
WIDGET_PATH = os.path.join(os.path.dirname(__file__), "widget.js")

@app.get("/widget.js")
async def serve_widget():
    if not os.path.exists(WIDGET_PATH):
        return JSONResponse({"error": "widget.js not found"}, status_code=404)
    return FileResponse(
        WIDGET_PATH,
        media_type = "application/javascript",
        headers    = {"Cache-Control": "no-cache"}
    )

# ── Serve React static build ──
DIST_PATH = os.path.abspath(FRONTEND_BUILD)

if os.path.exists(DIST_PATH):
    app.mount("/digichat/assets", StaticFiles(directory=os.path.join(DIST_PATH, "assets")), name="assets")

    @app.get("/digichat/{full_path:path}")
    async def serve_react(full_path: str):
        file_path = os.path.join(DIST_PATH, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(DIST_PATH, "index.html"))

    @app.get("/digichat")
    async def serve_react_root():
        return FileResponse(os.path.join(DIST_PATH, "index.html"))

# ── Health check ──
@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}

# ── Root ──
@app.get("/")
async def root():
    return {"message": "Digi Chat API v2.0", "docs": "/docs"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host    = "0.0.0.0",
        port    = int(os.getenv("PORT", 8000)),
        reload  = NODE_ENV != "production",
        workers = 1 if NODE_ENV != "production" else 4,
    )