from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from app.core.config import settings

class Base(DeclarativeBase):
    pass

# NullPool: serverless functions are short-lived, per-invocation processes.
# A persistent connection pool would leak connections across invocations and
# exhaust Neon's connection limit, so every request opens and closes its own
# connection against the -pooler endpoint instead.
engine = create_engine(settings.DATABASE_URL, poolclass=NullPool, echo=settings.DB_ECHO)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
