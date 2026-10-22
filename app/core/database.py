from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy import create_engine
from app.core.config import settings

class Base(DeclarativeBase):
    pass

# pool_pre_ping: Neon suspends idle computes and drops their connections, so a
# pooled connection can be dead by the next request. Without the ping, that
# first request fails with a 500 (and no CORS headers, so the browser reports
# a network error) and only the retry succeeds.
engine = create_engine(settings.DATABASE_URL, echo=settings.DB_ECHO, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)