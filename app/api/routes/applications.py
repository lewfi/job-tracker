from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.models.application import Application
from app.api.deps import get_db
from app.schemas.application import ApplicationCreate, ApplicationRead, ApplicationUpdate
from app.models.status_history import StatusHistory

router = APIRouter()

# Create a new application
@router.post("/", response_model=ApplicationRead, status_code=201)
def create_application(application: ApplicationCreate, db: Session = Depends(get_db)):
    # Create a new application, add it to the database, flush the changes
    db_application = Application(**application.model_dump())
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

# Get all applications
@router.get("/", response_model=list[ApplicationRead])
def get_applications(db: Session = Depends(get_db)):
    return db.execute(select(Application)).scalars().all()

# Get a specific application by ID
@router.get("/{application_id}", response_model=ApplicationRead)
def get_application(application_id: int, db: Session = Depends(get_db)):
    application = db.get(Application, application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    return application

# Update a specific application by ID
@router.patch("/{application_id}", response_model=ApplicationRead)
def update_application(application_id: int, application_update: ApplicationUpdate, db: Session = Depends(get_db)):
    # Fetch application by ID, return 404 if not found
    application = db.get(Application, application_id)
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
    db.commit()
    db.refresh(application)
    return application

@router.delete("/{application_id}", status_code=204)
def delete_application(application_id: int, db: Session = Depends(get_db)):
    application = db.get(Application, application_id)
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    db.delete(application)
    db.commit()
    