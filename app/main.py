from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.api.routes import applications, analytics

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Application is starting up...")
    yield
    print("Application is shutting down...")

app = FastAPI(lifespan=lifespan)

@app.get("/")
def root():
    return {"status": "ok"}

app.include_router(applications.router, prefix="/applications", tags=["applications"])
app.include_router(analytics.router, prefix="/analytics", tags=["analytics"])