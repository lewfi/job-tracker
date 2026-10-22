from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from sqlalchemy import select, case, or_
from sqlalchemy.exc import IntegrityError
from app.models.application import Application
from app.models.user import User
from app.api.deps import get_db, get_current_user
from app.schemas.application import ApplicationCreate, ApplicationRead, ApplicationUpdate
from app.models.status_history import StatusHistory
from app.services.ghosting import apply_ghosting

router = APIRouter()

# Statuses that make an application priority automatically, highest tier first
PRIORITY_STATUSES = ["offer", "onsite", "technical"]

def find_by_idempotency_key(db: Session, user_id: int, idempotency_key: str) -> Application | None:
    return db.execute(
        select(Application).where(
            Application.user_id == user_id,
            Application.idempotency_key == idempotency_key,
        )
    ).scalar_one_or_none()

# Create a new application
# The client sends one Idempotency-Key per add-form; a retried or double submit
# with the same key returns the application the first request created instead
# of inserting a duplicate.
@router.post("/", response_model=ApplicationRead, status_code=201)
def create_application(application: ApplicationCreate, idempotency_key: str | None = Header(default=None, max_length=64), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if idempotency_key:
        existing = find_by_idempotency_key(db, current_user.id, idempotency_key)
        if existing:
            return existing

    try:
        # Create a new application, add it to the database, flush the changes
        db_application = Application(**application.model_dump(), user_id=current_user.id, idempotency_key=idempotency_key)
        db.add(db_application)
        db.flush()

        # Create a new status history entry and add it to the database
        db_status_history = StatusHistory(
            application_id=db_application.id,
            status=db_application.status
        )
        db.add(db_status_history)

        # Commit the changes to the database
        db.commit()

        # Refresh the application instance and return the created application
        db.refresh(db_application)
        return db_application
    except IntegrityError:
        db.rollback()
        # Lost a race with a concurrent request carrying the same key
        if idempotency_key:
            existing = find_by_idempotency_key(db, current_user.id, idempotency_key)
            if existing:
                return existing
        raise HTTPException(status_code=422, detail="Invalid field value: check status and source constraints")

# Get all applications
@router.get("/", response_model=list[ApplicationRead])
def get_applications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    applications = db.execute(select(Application).where(Application.user_id == current_user.id)).scalars().all()
    apply_ghosting(db, applications)
    return applications

# Get priority applications: status is technical/onsite/offer, or manually starred.
# Must be registered before /{application_id} so "priority" isn't parsed as an ID.
@router.get("/priority", response_model=list[ApplicationRead])
def get_priority_applications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # offer -> onsite -> technical -> starred at an earlier stage
    tier = case(
        *((Application.status == status, rank) for rank, status in enumerate(PRIORITY_STATUSES)),
        else_=len(PRIORITY_STATUSES),
    )
    applications = db.execute(
        select(Application)
        .where(
            Application.user_id == current_user.id,
            or_(Application.status.in_(PRIORITY_STATUSES), Application.is_priority.is_(True)),
        )
        .order_by(tier, Application.updated_at.desc(), Application.id.desc())
    ).scalars().all()
    apply_ghosting(db, applications)
    return applications

# Get a specific application by ID
@router.get("/{application_id}", response_model=ApplicationRead)
def get_application(application_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    application = db.execute(
        select(Application).where(
            Application.id == application_id,
            Application.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    apply_ghosting(db, [application])
    return application

# Update a specific application by ID
@router.patch("/{application_id}", response_model=ApplicationRead)
def update_application(application_id: int, application_update: ApplicationUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Fetch application by ID, return 404 if not found
    application = db.execute(
        select(Application).where(
            Application.id == application_id,
            Application.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    # Get only fields the client wants to update via .model_dump(exclude_unset=True), apply changes to object, if status among updated fields then create new StatusHistory row
    for key, value in application_update.model_dump(exclude_unset=True).items():
        setattr(application, key, value)
        if key == "status":
            db_status_history = StatusHistory(
                application_id=application.id,
                status=application.status
            )
            db.add(db_status_history)

    # Commit changes in one transaction, refresh application, and return
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=422, detail="Invalid field value: check status and source constraints")
    db.refresh(application)
    return application

@router.delete("/{application_id}", status_code=204)
def delete_application(application_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    application = db.execute(
        select(Application).where(
            Application.id == application_id,
            Application.user_id == current_user.id,
        )
    ).scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    db.delete(application)
    db.commit()
