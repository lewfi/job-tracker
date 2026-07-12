from sqlalchemy import select, func
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends
from app.api.deps import get_db
from app.models.application import Application
from app.models.status_history import StatusHistory
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

# Get funnel for analytics
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

# Get weekly applications for analytics
@router.get("/weekly", response_model=list[WeeklyItem])
def get_weekly(db: Session = Depends(get_db)):
    week_col = func.date_trunc('week', Application.date_applied).label('week')

    result = db.execute(
        select(week_col, func.count().label("count"))
        .group_by(week_col)
        .order_by(week_col)
    ).all()

    return [
        WeeklyItem(
            week=row.week.strftime("%Y-%m-%d"),
            count=row.count
        ) for row in result
    ]

# Get average time in stage for analytics
@router.get("/time-in-stage", response_model=list[TimeInStageItem])
def get_time_in_stage(db: Session = Depends(get_db)):
    # Define LEAD window function
    next_changed_at = func.lead(StatusHistory.changed_at).over(
        partition_by=StatusHistory.application_id,
        order_by=StatusHistory.changed_at
    ).label("next_changed_at")

    # Build inner query for each history row to get status and time spent
    inner_query = (
        select(
            StatusHistory.application_id,
            StatusHistory.status,
            StatusHistory.changed_at,
            next_changed_at,
            (func.extract('epoch', next_changed_at) - func.extract('epoch', StatusHistory.changed_at)).label("time_spent")
        )
        .subquery()
    )

    # Wrap outer query for average time_spent per status
    outer_query = (
        select(
            inner_query.c.status,
            func.avg(inner_query.c.time_spent).label("avg_time_spent")
        )
        .group_by(inner_query.c.status)
    )

    # Execute and build response
    result = db.execute(outer_query).all()

    return [
    TimeInStageItem(
        stage=row.status,
        avg_days=round(row.avg_time_spent / 86400, 2) if row.avg_time_spent is not None else 0.0
    )
    for row in result
    if row.avg_time_spent is not None  # skip stages with no completed transitions
]