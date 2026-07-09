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

@router.get("/funnel", response_model=list[FunnelItem])
def get_funnel(db: Session = Depends(get_db)):
    result = db.execute(
        select(Application.status, func.count().label("count"))
        .group_by(Application.status)
    ).all()

    counts = {rows.status: rows.count for rows in result}
    stages = ["applied", "screen", "onsite", "offer", "rejected", "withdrawn"]
    total = sum(counts.values())

    funnel = []
    for stage in stages:
        count = counts.get(stage, 0)
        funnel.append(FunnelItem(
            stage=stage,
            count=count,
            conversion_rate=round(count / total, 2) if total > 0 else 0.0
        ))

    return funnel