from __future__ import annotations
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from sqlalchemy import CheckConstraint, DateTime, String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.application import Application

default = lambda: datetime.now(timezone.utc)


class StatusHistory(Base):
    __tablename__ = "status_history"

    __table_args__ = (
        CheckConstraint("status IN ('applied', 'screen', 'onsite', 'offer', 'rejected', 'withdrawn')", name="status_check"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    application_id: Mapped[int] = mapped_column(Integer, ForeignKey("applications.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50),nullable=False)
    changed_at: Mapped[datetime] = mapped_column(DateTime, default=default, nullable=False)

    application: Mapped["Application"] = relationship("Application", back_populates="status_history")