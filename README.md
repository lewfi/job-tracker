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

6/26/2026:

1: CRUD + HTTP Methods
- CRUD stands for Create, Read, Update, Delete
- Create => POST, Read => GET, Update => PATCH or PUT, Delete => DELETE

2: Path parameter
- Path parameter is the variable you find in the URL, like the application_id within the URL
- FastAPI extracts path parameters automatically by matching the parameter name in the URL pattern to a function argument with the same name and a type hint
- Ex: @router.get("/{application_id}") paired with def get_application(application_id: int, ...) tells FastAPI to extract what's in that URL position, convert it to an int, and pass it in; if conversion fails (ex. /applications/apple), FastAPI returns a 422 automatically

3: Fetching single application by ID
- If you fetch for a single application and it doesn't exist, then a 404 Not Found exception is raised via FastAPI's HTTPException
- HTTPException is imported from fastapi, raises status_code=404 and a detail message; FastAPI catches it and converts it to a proper JSON error response automatically so you don't have to build response yourself

4: exclude_unset=TRUE
- exclude_unset=TRUE within the PATCH endpoint will allow for any unset values for fields to not change the data and this is important for partial updates because it lets you update data without having to either re-enter all the original fields or change all fields
- Without exclude_unset=TRUE, calling .model_dump() would include all fields with their default values (None for optional fields), which would overwrite all the non-updated fields to None; this destroys all existing data

5: setattr()
- Because we are looping over a dictionary of field names and values, can't use dot notation when field name is a variable
- setattr() equivalent to application.{key} = value; works when key is a string var
- Without setattr(), would need a big if/else block for every possible field name

6: Updating a status
- Updating a status requires writing to two tables because we do something called denormalization where we keep the same field in different tables
- Ensuring atomicity is SQLAlchemy session transaction with setattr() and db.add(db_status_history) happening before db_commit(), so either both land or fail

7: HTTP status code for successful DELETE
- 204 No Content is the status code for a successful delete and we return no body to show that it was deleted, because there's nothing meaningful there now

8: Difference between db.get(Model, id) and db.execute(select(Model).where(...))
- You would use db.execute(...) for arbitrary queries where you have a specific condition and not a primary key 
- You use db.get() fetches by primary key specifically and best when you want access to one data entry

9: Cascade delete
- Cascade delete is when you want to delete an entry that's relied upon by child entries
- We need this because status_history rows rely on the application id, so cascade tells SQLAlchemy to delete all the child rows first in status_history, then delete the parent

10: --reload in Docker cmd
- --reload makes uvicorn watch your code files for changes and automatically restart the server when it detects a save
- Works because the volume mount (-.:/app) syncs local files into the container in real time, so when save happens on my Mac, uvicorn sees change inside container and reloads

11: CheckViolation error
- CheckViolation error means that a CheckConstraint error is occurring where the input doesn't match the CheckConstraint list
- This was caused by the source: "string" because "string" isn't a source within our CheckConstraint list.

Final sprint:
1. Test isolation
Test isolation is when you isolate the testing environment away from production — specifically the production database. This prevents test data (fake companies, roles, etc.) from polluting real data, and ensures tests start from a predictable clean state rather than being affected by leftover data from previous runs.

2. pytest fixture and scope="function"
A pytest fixture sets up something a test needs and tears it down after the test finishes. scope="function" means the fixture runs once per test function — each test gets a completely fresh database created and destroyed just for it. If it were scope="session", all tests would share one database and leftover data from one test could affect the next, breaking isolation.

3. app.dependency_overrides
app.dependency_overrides lets you swap out any FastAPI dependency for a different one during tests. We use it to replace get_db (which normally connects to the real Postgres database) with a function that returns a SQLite test database session instead. Every route handler that calls Depends(get_db) automatically gets the test database without knowing or caring — the handler code doesn't change at all.

4. SQLite for tests
SQLite is used because it runs entirely in memory — no server needed, no Docker container required. Using Postgres for tests would mean spinning up a Docker container every time you run the test suite, which is slow and adds complexity. SQLite creates and destroys in milliseconds, making the test suite fast and self-contained. The tradeoff is that SQLite and Postgres have slight differences (like how they handle some constraints), but for testing basic CRUD behavior it's perfectly adequate.

5. conftest.py
conftest.py is a special pytest file that defines shared fixtures, test engine setup, and the test client. Pytest auto-discovers it without needing an import — any fixture defined inside it is automatically available to every test file in the same directory and subdirectories. It's not a test file itself, it's shared configuration that runs before any tests start.

6. IntegrityError
An IntegrityError is raised when data violates a database constraint — in this project, when status or source values don't match the CHECK constraint list. Without the handler, an invalid value would cause an unhandled exception that crashed the entire request, returning a confusing raw 500 error with a SQLAlchemy traceback to the client. With the handler, the database rolls back cleanly and the client gets a meaningful 422 response explaining what went wrong. This is the difference between a robust API and a fragile one.

7. Pattern for testing endpoints requiring an existing resource
Always create the resource you need within the test itself via a POST request, extract the id from the response, then use that id in the subsequent request. Never assume a specific id exists in the database — since each test runs against a fresh database, you must create everything the test depends on from scratch inside that test.