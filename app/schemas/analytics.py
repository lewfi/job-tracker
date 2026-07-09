from pydantic import BaseModel, ConfigDict

class PipelineItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    status: str
    count: int

class FunnelItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    stage: str
    conversion_rate: float
    count: int

class WeeklyItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    week: str
    count: int

class TimeInStageItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    stage: str
    avg_days: float