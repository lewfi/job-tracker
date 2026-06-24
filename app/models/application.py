from __future__ import annotations
from typing import TYPE_CHECKING
from datetime import datetime, date, timezone
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import CheckConstraint, String, Integer, Date, DateTime
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.status_history import StatusHistory

default = lambda: datetime.now(timezone.utc)

class Application(Base):
    __tablename__ = "applications"

    __table_args__ = (
        CheckConstraint("source IN ('linkedin', 'indeed', 'company_website', 'referral', 'handshake', 'other')", name="source_check"),
        CheckConstraint("status IN ('applied', 'screen', 'onsite', 'offer', 'rejected', 'withdrawn')", name="status_check"),
    )

    # Core fields
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    company: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    date_applied: Mapped[date] = mapped_column(Date, nullable=False)
    
    # Source + Location
    source: Mapped[str] = mapped_column(String(50), nullable=False)
    location: Mapped[str] = mapped_column(String(255))

    # Salary
    salary_min: Mapped[int] = mapped_column(Integer)
    salary_max: Mapped[int] = mapped_column(Integer)
    salary_text: Mapped[str] = mapped_column(String(255))

    # Notes
    notes: Mapped[str] = mapped_column(String(1000), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=default, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=default, onupdate=default, nullable=False)

    # Relationship
    status_history: Mapped[list["StatusHistory"]] = relationship("StatusHistory", back_populates="application")