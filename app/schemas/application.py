from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from app.schemas.status_history import StatusHistoryRead

class ApplicationCreate(BaseModel):
    # Required fields
    company: str
    role: str
    status: str
    date_applied: date
    source: str

    # Optional field
    location: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    salary_text: str | None = None
    notes: str | None = None

class ApplicationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    # Required fields
    id: int
    company: str
    role: str
    status: str
    date_applied: date
    source: str
    created_at: datetime
    updated_at: datetime

    # Optional field
    location: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    salary_text: str | None = None
    notes: str | None = None
    status_history: list[StatusHistoryRead] | None = None

class ApplicationUpdate(BaseModel):
    # All optional
    company: str | None = None
    role: str | None = None
    status: str | None = None
    date_applied: date | None = None
    source: str | None = None
    location: str | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    salary_text: str | None = None
    notes: str | None = None