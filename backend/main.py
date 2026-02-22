"""AI Learning Assistant – FastAPI Backend.

Provides endpoints for processing YouTube videos and PDFs,
generating flashcards and quizzes, and RAG-based chat.
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import FRONTEND_URL
from routes import process, generate, chat
from services.youtube_service import get_cookie_status

# ── Logging ───────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")

# ── App Setup ─────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Learning Assistant API",
    description="Process content, generate study materials, and chat with your documents.",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        FRONTEND_URL,
        "http://localhost:3000",
        "http://localhost:3001",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register Routes ───────────────────────────────────────────────────────
app.include_router(process.router, tags=["Content Processing"])
app.include_router(generate.router, tags=["Generation"])
app.include_router(chat.router, tags=["Chat"])


# ── Health Check ──────────────────────────────────────────────────────────
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "AI Learning Assistant API"}


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "AI Learning Assistant API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": [
            "POST /process-video",
            "POST /process-pdf",
            "POST /generate-flashcards",
            "POST /generate-quiz",
            "POST /chat",
        ],
    }


# ── Debug (remove after confirming cookies work) ─────────────────────────
@app.get("/debug/cookies")
async def debug_cookies():
    """Check cookie configuration — remove this endpoint after debugging."""
    return get_cookie_status()

