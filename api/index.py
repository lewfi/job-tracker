"""Vercel serverless entry point. Thin ASGI adapter — no route logic lives here.

Vercel serves this file at /api and vercel.json rewrites /api/* here too, so
the FastAPI app (whose routes are unprefixed: /auth, /applications, /analytics)
never sees the /api prefix. This lets app/ stay untouched and the existing
Docker Compose local-dev setup (which runs app.main:app directly, no prefix)
keep working unmodified.
"""
from app.main import app as fastapi_app

API_PREFIX = "/api"


async def app(scope, receive, send):
    if scope["type"] == "http":
        path = scope["path"]
        if path == API_PREFIX:
            scope["path"] = "/"
        elif path.startswith(API_PREFIX + "/"):
            scope["path"] = path[len(API_PREFIX):]
    await fastapi_app(scope, receive, send)
