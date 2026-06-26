# job-tracker

6/25/2026:

1: Tables and their relationship
- 2 tables: applications and status_history
- Linked by applicaton_id column in status_history, which stores id of application in each history row that it belongs to
- Column type is a foreign key as it references primary key of another table
- One-to-many relationship as one application can have many status history rows

2: Denormalization
- status in both tables, pattern is called Denormalization, which is intentionally storing same piece of data (status) in two places for convenience
- Do this over making status_history single source of truth because most common query ("Show me all applications currently at status ___"), becomes a simple one-table lookup on applications
- Without denormalized status column, every similar query would need to find most recent row in status_history per application (more complex and slower)
- Cost is that both places must stay in sync with every status update needing to touch both tables

3: CHECK constraint vs Postgres ENUM
- A CHECK constraint tells the database to reject any row where acolumn's value isn't in a specified list
- Choose this over native Postgres ENUM because changing the allowed values later is simpler (just drop old constraint and add new one in standard migration)
- Native Postgres ENUMs can sometimes cause new value additions to not run in same transaction as other schema changes, which could make migrations complex
- CHECK constraint gives same enforcements but with less friction

4: Append-only event log
- status_history only gets rows added to it because each row represents a timestamped event that occurred.
- Never editing the history and only appending is called an append-only event log.
- This allows us to calculate: "How long did this application spend in the screen stage" by finding the gap betbween consecutive changed_at timestamps for the same application_id

5: Three libraries
- FastAPI: handles HTTP; receive requests, routes them to the right function, and sends responses back to the client; auto-generates Swagger/ReDoc documentation
- SQLAlchemy: ORM (Object-Relational Mapper); translates between Python objects and SQL database rows; lets you work with database records as Python class instances instead of writing raw SQL
- Pydantic: validates data crossing the API boundary by checking that incoming requests have right fields and types; shapes outgoing responses; All validation is delegated to Pydantic automatically

6: models/ VS schemas/: 
- models/ contains SQLAlchemy classes (Python representation of database tables) while schemas/ contains Pydantic classes (shapes of data flowing through the API)
- Keep the folders seperate because the database shape and API shape aren't identical
- Ex. id, created_at, and updated_at exist in Application SQLAlchemy Model but don't exist in ApplicationCreate because client doesn't provide those fields, just the server; But ApplicationRead includes them because by the time you're reading a row back, the server has assigned those values so the client should see them

7: Docker Compose
- Docker Compose lets you define and run multiple containers together as one application using a single docker-compose.yml file
- In this project, run 2 services: db (Postgres database using postgres:16 image) and api (our FastAPI app built by Dockerfile)
- Docker Compose handles the networking between them, injects env vars, maps ports (so my Mac can reach the containers), and persists Postgres data between restarts via a named volume (postgres_data)

8: Environment variables
- Hardcoding credentials in code is dangerous, if pushed to GitHub, they become public forever even when deleted
- Env variables keep secrets outside code entirely
- core/config.py reads them on Python side using Pydantic Settings (BaseSettings), which automatically reads from the environment or .env file
- Priority order: actual env variables (used inside Docker via docker-compose.yml) -> .env file (local development) -> hardcoded defaults

9: Alembic
- Alembic is a database migration tool, so it tracks schema changes over time like how git does for code
- Generating a migration compares SQLAlchemy models against the current database state and writes a Python script describing what changed
- Applying it executes that script against the actual database
- The 2 steps are separated so you can review and edit the generated script before it touches your data

10: flush vs commit:
- db.flush() sends pending SQL statements to Postgres within current transaction, database processes them, and assigns server-generated values like id, but DOESN'T finalize anything yet.
- db.commit() finalizes the entire transaction and makes all changes permanent
- Need to use flush() specifically in POST /applications because we had to create a StatusHistory row with application_id set to the new application's id, but it didn't exist until Postgres processes the INSERT; so flush() triggers that INSERTZ and makes id available while keeping both inserts inside one transaction so they succeed or fail together

11: Dependency injection vs get_db
- Dependency injection means FastAPI automatically calls a function and passes its result to your route handler; you declare it as a parameter with Depends(get_db) and FastAPI handles the rest
- get_db creates a SessionLocal() database session, yield will yield it to the route handler, then close it in a finally block after the request finishes regardless of request succession or failure
- It's a generator function using yield specifically because try/finally pattern guarentees the session is always closed, preventing connection leaks that would eventually exhaust your database connection pool

12: response_model
- response_model=ApplicationRead does 3 things:
    (1) filters the response to only include fields defined in ApplicationRead, so even if SQLAlchemy object has extra attributes, they won't leak into response
    (2) validates the outgoing data against that schema
    (3) tells FastAPI's doc generator the exact shape of a successful response, which appears in Swagger/ReDoc automatically

13: db as hostname
- Inside Docker Compose, each service is reachable by its service name on Docker's internal network
- db is the service name of Postgres container so api container can reach it at db:5432
- localhost insde the api container refers to the api containers itself, not db container
- Since they're separate containers, localhost would find nothing, but Docker's internal DNS automatically resolves db to the Postgres container's IP address

14: Missing module error
- pydantic_settings wasn't in requirements.txt, so when Docker built the image and ran pip install -r requirements.txt, it was never installed inside the container
- The fix was adding pydantic-settings==2.14.2 to requirements.txt and rebuilding with docker compose build --no-cache; the --no-cache flag was necessary because Docker had cached the old pip install layer and wouldn't rerun it without being forced to

15: Migration file not appearing locally
- Docker copies your code into the container at build time via COPY .. in the Dockerfile like a one-time snapshot
- Files created inside the container afterward don't sync back to my Mac
- The fix was adding - .:/app as a volume mount in docker-compose.yml, which creates a live two-way sync between local project directory and /app inside the container, so migration files generated inside the container appear on my local Mac instantly

16: Hostname error with local alembic
- Running alembic from your Mac terminal means it runs directly on your Mac, outside Docker's network entirely
- Tries to connect to a host named db but that hostname exists only inside Docker's internal network
- The fix was running it via docker compose exec api alembic ... executes the commands inside the running api container on Docker's network so their internal DNS resolves db to the Postgres container successfully
