from datetime import date, timedelta
from sqlalchemy.orm import Session
from app.models.application import Application
from app.models.status_history import StatusHistory

GHOSTING_THRESHOLD_DAYS = 45


def _ghosting_reference_date(application: Application) -> date:
    """The date "applied" status started counting from. Normally that's
    date_applied, but if the application was previously ghosted (or moved
    away from 'applied' and back) and manually reactivated, the clock
    restarts from that reactivation instead — otherwise it would be
    re-ghosted the instant it's reactivated."""
    history = sorted(application.status_history, key=lambda h: (h.changed_at, h.id))
    if len(history) > 1 and history[-1].status == "applied":
        return history[-1].changed_at.date()
    return application.date_applied


def apply_ghosting(db: Session, applications: list[Application]) -> None:
    """Mark any 'applied' application as 'ghosted' once it has gone
    GHOSTING_THRESHOLD_DAYS since date_applied (or a later reactivation)
    with no status change."""
    cutoff = date.today() - timedelta(days=GHOSTING_THRESHOLD_DAYS)
    changed = []

    for application in applications:
        if application.status == "applied" and _ghosting_reference_date(application) <= cutoff:
            application.status = "ghosted"
            db.add(StatusHistory(application_id=application.id, status="ghosted"))
            changed.append(application)

    if changed:
        db.commit()
        for application in changed:
            db.refresh(application)
