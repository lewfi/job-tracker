from pydantic import BaseModel, ConfigDict
from datetime import datetime

class StatusHistoryCreate(BaseModel):
    # Required fields
    application_id: int
    status: str

class StatusHistoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    # Required fields
    id: int
    application_id: int
    status: str
    changed_at: datetime