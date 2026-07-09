from sqlalchemy import select, func
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends
from app.api.deps import get_db
from app.models.application import Application
from app.schemas.analytics import PipelineItem, FunnelItem, WeeklyItem, TimeInStageItem

router = APIRouter()

# Get pipelines for analytics
@router.get("/pipeline", response_model=list[PipelineItem])
def get_pipelines(db: Session = Depends(get_db)):
    # Select status and count, group by status
    result = db.execute(
        select(Application.status, func.count().label("count"))
        .group_by(Application.status)
    ).all()

    return result