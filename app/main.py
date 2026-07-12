from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.api.routes import applications, analytics
from fastapi.middleware.cors import CORSMiddleware
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Application is starting up...")
    yield
    print("Application is shutting down...")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://job-tracker-6qjb.vercel.app"
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok"}

app.include_router(applications.router, prefix="/applications", tags=["applications"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])


@app.get("/debug-env")
def debug_env():
    return {"DATABASE_URL_SET": bool(os.environ.get("DATABASE_URL")), 
            "DATABASE_URL_PREFIX": os.environ.get("DATABASE_URL", "NOT SET")[:30]}