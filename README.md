# job-tracker

6/25/2026:
Data Modeling and Database Design:
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

4:
- status_history only gets rows added to it because it creates a log of the statuses relating back to the application_id

Three Core Libraries:
5:
- FastAPI: establishes connection between client and API and sends HTTP response back to the client
- SQLAlchemy: maps the data to the corresponding columns of the database
- Pydantic: constructs a Python model of the database that can be used to verify the structure of the data

6:
- models/ and schemas/ are separated because schemas is the Python structure of the data while models is the SQL structure of the database.
- An example is when I send the POST with a job application filled, it gets processed by Pydantic then gets mapped to the SQL version for the database by SQLAlchemy.

Project Infrastructure:
7:
- Docker Compose establishes the containers for the application

8:
- We use environment variables for DB credentials because hardcoding it would make our credentials publicized.
- To keep it secret, we create a .env file place the keys and credentials in there so that we can use it locally without having to publicize our credentials.

9:
- Alembic allows us to migrate and update our database when changes occur to our Python model of it.
- The difference between generating a migration vs applying a change, applying a change could harm the data existing in the table already while the migration will safely apply schema changes or roll back.

10:
- db.flush() will apply changes but not commit them to the database while db.commit() will commit all changes that have occured to the database
- We flushed first to prevent multiple commits occuring in one script.

FastAPI Patterns:
11: 
- Dependency injection in FastAPI allows for a DB session to be created so the client can update their data.
- get_db will do yield to attempt to apply DB changes, otherwise it will close it's DB session if it fails.

12:
- response_model=ApplicationRead will define the structure of the data returned by the API, validates data against model schema, and generates schema document in Swagger UI

13:
- api container uses db as the hostname to reach Postgres because localhost will only have the data saved locally?

14:
- ModuleNotFoundError: No module named 'pydantic_settings' was hit because it was not in the requirements.txt for Docker to use, so we added it to requirements.txt and added it's version 

15:
- The migration file generated inside the container wasn't appearing on my Mac, so we added volumes to the docker-compose.yml?

16:
- alembic revision --autogenerate failed with hostname error but running docker compose exec api alembic... worked because it initialized a rebuild?