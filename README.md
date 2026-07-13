## Live Demo

- **Frontend:** https://job-tracker-6qjb.vercel.app
- **API:** https://job-tracker-production-23d0.up.railway.app
- **Interactive API docs (Swagger UI):** https://job-tracker-production-23d0.up.railway.app/docs

## Architecture Overview

```
┌──────────┐   HTTPS + JWT bearer   ┌──────────────┐   psycopg2 (SQLAlchemy)   ┌────────────┐
│  Vercel   │ ─────────────────────> │   Railway    │ ─────────────────────────> │    Neon    │
│  (React)  │ <──────── JSON ─────── │  (FastAPI)   │ <─────────── rows ──────── │ (Postgres) │
└──────────┘                        └──────────────┘                           └────────────┘
```

Axios (`src/api.js`) attaches the JWT to every outgoing request via a request interceptor, and Postgres is only ever reached through Railway's API layer — the frontend never talks to the database directly.

**Local dev stack** (`docker-compose.yml`), separate from the deployed one above:

```
docker compose up
├── db   → postgres:16, port 5432, named volume `postgres_data` (data survives container restarts)
└── api  → built from Dockerfile (python:3.11-slim), port 8000, `uvicorn --reload`
            volume-mounted to the project dir (`.:/app`) so code edits on my Mac
            appear inside the container immediately — no rebuild needed for a Python change
```

The frontend isn't in Compose — I run it separately with `npm run dev` (Vite, port 5173) since hot-reload works better outside Docker for React.

## Key Engineering Decisions & Why

### 1. Denormalized `status` column (`applications.status` + `status_history`)
`status` is stored on `applications` **and** re-derived from the latest row in `status_history` — the same fact in two places. That's denormalization, and I did it on purpose. The single most common query in this app is "show me all applications currently at status X," and with a denormalized column that's a one-table filter. Without it, that query becomes "for every application, find its most recent `status_history` row, then filter" — a much more expensive query I'd be running on every page load. The tradeoff is I now have two places that can disagree, so every status change has to write both rows in the same transaction, or the two tables drift out of sync. I accepted that cost because reads (viewing your pipeline) happen far more often than writes (changing one application's status).

### 2. `CHECK` constraints over native Postgres `ENUM`
Both `status` and `source` are `String` columns with a `CHECK (status IN (...))` constraint, not a Postgres `ENUM` type. I chose this specifically for migration friction: adding a value to a native `ENUM` type in Postgres historically couldn't run inside the same transaction as other schema changes (older Postgres versions flat-out disallowed it, and even now it's a special case Alembic handles differently from a normal column change). A `CHECK` constraint is just "drop the old constraint, add a new one" — a completely standard Alembic migration, no special-casing. I get the same enforcement (the database rejects `status = 'foo'`) with none of the ceremony.

### 3. `status_history` as an append-only event log
Rows in `status_history` are never updated or deleted — only inserted. That's what makes it an event log instead of just a second copy of the current state. Every insert is a timestamped fact: "this application was `screen` starting at this instant." That's the only way to answer "how long did this application spend in screen?" — you find two consecutive rows for the same `application_id`, take the gap between their `changed_at` timestamps, and that's the answer. If I overwrote status instead of appending, that history would be gone the moment the status changed.

### 4. Pydantic schemas separate from SQLAlchemy models
`models/` holds SQLAlchemy classes — the database's shape. `schemas/` holds Pydantic classes — the API's shape. They're deliberately not the same shape. `ApplicationCreate` has no `id`, `created_at`, or `updated_at` fields because the client doesn't get to set those — the server assigns them. `ApplicationRead` *does* include them, because by the time you're reading a row back, the server has already filled them in and the client should see them. If I used the SQLAlchemy model directly as the request body, a client could POST `{"id": 1, "created_at": "2020-01-01", ...}` and I'd have to remember to strip those fields by hand on every route. Pydantic makes "what the client is allowed to send" and "what the client gets back" two explicit, separately-typed contracts instead of one model doing double duty.

### 5. `db.flush()` before `db.commit()` in `POST /applications`
Creating an application also creates its first `status_history` row, and that row needs the new application's `id` as a foreign key — but Postgres doesn't assign that `id` until the `INSERT` actually runs. `db.commit()` would finalize the whole transaction, which is more than I want yet. `db.flush()` sends the pending `INSERT` to Postgres and gets the generated `id` back, *without* closing the transaction — so I can use `db_application.id` to build the `status_history` row, `add()` it, and only then `commit()` once, atomically. Both rows land together or neither does.

### 6. `get_db` as a generator with `yield` inside `try`/`finally`
```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```
FastAPI's dependency injection calls this, hands the yielded session to my route handler, and — because it's a generator — resumes execution *after* the `yield` once the request is done, running the `finally` block no matter what happened in between. That `finally` is the part that matters: if the route handler raises an exception, the session still gets closed. Without that guarantee, a failing request would leak a database connection every time, and I'd eventually exhaust Postgres's connection pool under any real load.

### 7. SQLite for tests, via `app.dependency_overrides`
Tests never touch the real Postgres database. `conftest.py` swaps `get_db` for a version that yields a SQLite session instead, using FastAPI's `app.dependency_overrides` — every route handler still just says `Depends(get_db)` and has no idea it's talking to SQLite instead of Postgres. I chose SQLite specifically so the test suite doesn't need Docker running: it creates a fresh database in milliseconds per test function (`scope="function"`, so every test starts from a completely empty schema — no state leaking between tests) and tears it down just as fast. The tradeoff is real: SQLite and Postgres don't enforce every constraint identically, so this suite proves my CRUD logic and validation are correct, but it can't catch a Postgres-only behavior difference. For this project's scope, that tradeoff is worth the speed.

### 8. App-level validation *and* DB-level `CHECK` constraints — defense in depth
Pydantic already rejects a request with a garbage `status` value... except it doesn't, because `status: str` in my schemas is just typed as a string, not a literal/enum — Pydantic will happily accept `"banana"`. The `CHECK` constraint at the database is what actually rejects it, by raising `IntegrityError`. I catch that in the route handler and turn it into a clean `422`. So the real validation is the database constraint; the `try/except IntegrityError` is what keeps that database-level rejection from surfacing as an ugly 500. Two layers, and each one is covering a gap the other layer has.

### 9. `LEAD()` window function for time-in-stage — and why it needs a subquery
For every `status_history` row, I want to know "how long until the *next* status change for this same application?" That's exactly what `LEAD(changed_at) OVER (PARTITION BY application_id ORDER BY changed_at)` computes — it looks one row ahead within each application's own timeline and hands back that next timestamp on the *current* row, so I can subtract. The subquery is required, not optional: a window function computes a value per row *within* its partition, and you cannot wrap an aggregate like `AVG()` directly around a window function in the same `SELECT` — they operate at different stages of query execution. So I compute `time_spent` per row in an inner query (materialized as a subquery), then `GROUP BY status` and `AVG(time_spent)` in an outer query over that subquery's output. One more gotcha this surfaced: the *current* status of an application has no "next" row, so `LEAD()` returns `NULL` for it — dividing that by `86400` to convert seconds to days threw an unhandled error before I added an explicit `is not None` check to skip those rows.

### 10. JWT auth with bcrypt password hashing
Passwords are hashed with bcrypt (via `passlib`'s `CryptContext`) before they ever touch the database — I never store or log a plaintext password. On login, I don't decrypt anything (bcrypt hashes aren't reversible); I hash the submitted password the same way and compare hashes. On success, I issue a JWT: a signed, base64-encoded blob containing `sub` (the user's id) and `exp` (an expiry timestamp, 7 days out), signed with `SECRET_KEY` using HMAC-SHA256. The frontend stores that token in `localStorage` and attaches it as `Authorization: Bearer <token>` on every request via an Axios interceptor. The backend never stores the token anywhere — that's what "stateless" means here: any request carrying a validly-signed, unexpired token is trusted, with no database lookup or server-side session table required to check it. `SECRET_KEY` is the only thing that makes a token trustworthy; anyone who has it can forge a valid token for any user id, which is why it's a required environment variable with no default in code — the app refuses to start without one.

### 11. Docker Compose service networking — why `db` works as a hostname
Inside `docker-compose.yml`, the Postgres container is named `db`. From inside the `api` container, `db:5432` resolves — Docker Compose creates an internal DNS network where each service is reachable by its service name. `localhost` inside the `api` container refers to the `api` container itself, which has no Postgres running on it, so that connection would just fail. This only works between containers on the same Compose network; running `alembic` directly from my Mac's terminal (outside Docker) can't resolve `db` at all, since that hostname doesn't exist outside Docker's internal network — I have to run migrations via `docker compose exec api alembic upgrade head` so they execute *inside* the container, on the network where `db` means something.

### 12. Alembic migrations — not `Base.metadata.create_all()`
`create_all()` would get me a working schema on day one, but it can't express "add a column to a table that already has data" or "rename this constraint" — it only knows how to create tables that don't exist yet. Alembic tracks schema changes as an ordered sequence of versioned Python scripts, the same way git tracks code changes as commits. "Generate" and "apply" are two separate steps on purpose: generating a migration diffs my SQLAlchemy models against the database's current state and writes a script describing the difference, but it doesn't touch the database yet — I get to read that script and edit it before "apply" (`alembic upgrade head`) actually runs it. That mattered for real: the migration that added `applications.user_id` for auth had to delete pre-existing rows that had no owner before making the column `NOT NULL`, which is exactly the kind of destructive step I wanted to write and review by hand, not have silently autogenerated.

## Data Model

**`applications`**

| Column | Type | Constraints |
|---|---|---|
| `id` | Integer | PK, indexed |
| `user_id` | Integer | FK → `users.id`, `ON DELETE CASCADE`, `NOT NULL`, indexed |
| `company` | String(255) | `NOT NULL` |
| `role` | String(255) | `NOT NULL` |
| `status` | String(50) | `NOT NULL`, `CHECK IN (applied, screen, onsite, offer, rejected, withdrawn)` |
| `date_applied` | Date | `NOT NULL` |
| `source` | String(50) | `NOT NULL`, `CHECK IN (linkedin, indeed, company_website, referral, handshake, other)` |
| `location` | String(255) | nullable |
| `salary_min` / `salary_max` | Integer | nullable |
| `salary_text` | String(255) | nullable |
| `notes` | String(1000) | nullable |
| `created_at` / `updated_at` | DateTime | `NOT NULL`, server-side defaults |

**`status_history`**

| Column | Type | Constraints |
|---|---|---|
| `id` | Integer | PK, indexed |
| `application_id` | Integer | FK → `applications.id`, `NOT NULL` |
| `status` | String(50) | `NOT NULL`, same `CHECK` constraint as above |
| `changed_at` | DateTime | `NOT NULL`, defaults to insert time |

One `applications` row → many `status_history` rows. Worth knowing cold: this cascade is enforced two different ways at two different levels. `applications.user_id` has `ON DELETE CASCADE` *at the database level* — deleting a user deletes their applications even via raw SQL. `status_history.application_id` has **no** `ON DELETE CASCADE` in the schema; deleting an application's history rows is handled entirely by SQLAlchemy's `cascade="all, delete-orphan"` on the ORM relationship, which only fires when you delete through the ORM (`db.delete(application)`). A raw `DELETE FROM applications` outside the ORM would leave orphaned `status_history` rows behind. I know this asymmetry exists; if I were hardening this further I'd add the DB-level cascade there too instead of relying on "always delete through the ORM."

**`users`** (added for auth): `id` (PK), `email` (String(255), unique, indexed, `NOT NULL`), `hashed_password` (String(255), `NOT NULL`), `created_at` (DateTime, `NOT NULL`).

## API Endpoints

| Method | Path | Description | Auth |
|---|---|---|---|
| GET | `/` | Health check | No |
| POST | `/auth/register` | Create a user, returns a JWT | No |
| POST | `/auth/login` | Verify credentials, returns a JWT | No |
| POST | `/applications/` | Create an application (+ initial `status_history` row) | Yes |
| GET | `/applications/` | List the current user's applications | Yes |
| GET | `/applications/{id}` | Get one application (404 if it's not yours) | Yes |
| PATCH | `/applications/{id}` | Partial update; writes a new `status_history` row if `status` changed | Yes |
| DELETE | `/applications/{id}` | Delete an application and its history | Yes |
| GET | `/analytics/pipeline` | Count of applications per current status | Yes |
| GET | `/analytics/funnel` | Count + conversion rate per stage | Yes |
| GET | `/analytics/weekly` | Applications submitted, grouped by week | Yes |
| GET | `/analytics/time-in-stage` | Average days spent per stage before moving on | Yes |

"Auth required" means the request needs `Authorization: Bearer <token>`, validated by `get_current_user`. Every one of these queries is additionally filtered to `user_id == current_user.id` — there's no endpoint anywhere that can return another user's data.

## Analytics Layer

- **`/pipeline`** — a single `GROUP BY status` with `COUNT(*)`. The simplest of the four; this is "how many applications are currently in each stage."
- **`/funnel`** — starts as the same `GROUP BY`, but conversion rate (`count / total`) isn't something I compute in SQL here — I pull the grouped counts back and do the division in Python, because I also need to backfill stages with zero applications (the `GROUP BY` only returns rows for statuses that actually exist in the data, and a funnel with a missing stage looks like a bug).
- **`/weekly`** — `date_trunc('week', date_applied)` collapses every date into the Monday that starts its week, then a normal `GROUP BY` on that truncated value counts applications per week.
- **`/time-in-stage`** — the most involved one: a `LEAD()` window function computes, per `status_history` row, the timestamp of that application's *next* status change, wrapped in a subquery so an outer query can `GROUP BY status` and `AVG()` the resulting per-row durations. See decision #9 above for why the subquery specifically is structurally required, not a style choice.

## Auth Flow

**Register** (`POST /auth/register`): client sends `{email, password}` → backend checks the email isn't already taken (409 if it is) → hashes the password with bcrypt → creates the `User` row → issues a JWT (`sub` = the new user's id, `exp` = 7 days out, signed with `SECRET_KEY`) → returns `{access_token, token_type: "bearer", email}`.

**Login** (`POST /auth/login`): looks up the user by email, verifies the submitted password against the stored bcrypt hash. On failure — wrong password *or* email that doesn't exist — it returns the exact same `401 "Invalid email or password"` either way, so a failed login never reveals whether the email itself is registered.

**Frontend**: `App.jsx` stores `access_token` and the user's email in `localStorage` after either flow succeeds. `src/api.js` has a request interceptor that reads the token from `localStorage` on *every* outgoing Axios call and attaches `Authorization: Bearer <token>` — individual components never think about auth headers at all. A response interceptor watches for `401`s; if one comes back from anywhere other than `/auth/*` itself (so a failed login attempt doesn't wipe a still-valid session), it clears `localStorage` and reloads, which drops the user back to the login screen since `App.jsx` decides what to render based on whether a token exists.

**Backend**: any protected route declares `current_user: User = Depends(get_current_user)`. That dependency pulls the token off the `Authorization` header (via `OAuth2PasswordBearer` — which here is only used for that header extraction; `/auth/login` still takes a plain JSON body, not OAuth2 form data), decodes and verifies the JWT's signature and expiry with `jose.jwt.decode`, reads `sub` back out as the user id, and does a real `db.get(User, user_id)` lookup — so a token for a since-deleted user correctly fails instead of trusting a stale claim. Any failure along that chain — expired, tampered, malformed, or a user that no longer exists — returns a `401`.

## Testing

26 tests total: 18 in `test_applications.py` (CRUD, field validation, `CHECK`-constraint violations, partial updates, cascade delete, edge cases like double-deleting or patching a nonexistent id) and 8 in `test_auth.py` (register, duplicate email, login success/failure, missing/garbage tokens, and cross-user isolation — proving user B genuinely cannot see or modify user A's data, not just that the endpoint returns *something*).

`conftest.py` builds a fresh SQLite database per test function via `Base.metadata.create_all()`/`drop_all()`, `scope="function"` so no test can leak state into the next one, and swaps `get_db` out via `app.dependency_overrides` (see decision #7). The `client` fixture pre-registers one fixed test user and attaches its token as a default header — which is why none of the 18 CRUD tests needed to change at all when auth was added later; they were all already implicitly "logged in" as that one user. A separate `unauthenticated_client` fixture exists for the auth-specific tests that need a blank slate with no token.

The `IntegrityError` handling in `POST /applications` exists *because* testing surfaced its absence: posting an invalid `status` or `source` value violated the `CHECK` constraint, and without a handler that came back as a raw, unhandled 500 with a SQLAlchemy traceback leaking to the client. Wrapping the insert in `try/except IntegrityError` → `db.rollback()` → `HTTPException(422, ...)` turned an application crash into a clean, expected validation error — a good example of a test not just confirming correct behavior, but actually finding a real gap.

## What I'd Do Differently

- **`frontend/.env.development` and `.env.production` define `VITE_API_URL`, but `api.js` never reads it** — it hardcodes the Railway URL directly. Those env files exist and do nothing; switching environments currently means editing source instead of setting a variable. Small, but it's the kind of thing that looks careless in code review.
- **No refresh tokens.** Every access token is valid for a flat 7 days with no way to revoke one early — there's no server-side session to invalidate on logout, no rotation, nothing. If a token leaked, it's live until it expires no matter what I do. A short-lived access token plus a refresh token (or at minimum a server-side revocation list) would close that gap.
- **No rate limiting on `/auth/login` or `/auth/register`.** Nothing currently stops repeated password guesses against a known email address.
- **The `status` / `status_history` sync is entirely an application-code discipline, not a database guarantee.** Every place that changes `status` has to remember to also insert a `status_history` row in the same transaction — I got this right in the one route that does it, but nothing in the schema would stop a future route (or a raw SQL fix in prod) from updating `status` alone and quietly breaking the history. A trigger would make that a guarantee instead of a convention.
- **Zero frontend tests.** The backend has 26 pytest tests; the React side has none. The UI redesign was verified with a one-off Playwright script I wrote and ran by hand, not something that runs in CI or catches a regression six weeks from now.

## Debugging War Stories

**Docker on Apple Silicon needed Rosetta emulation.** Early on, `docker compose up` on my M-series Mac choked trying to run the Postgres/Python images built for `linux/amd64` — Docker Desktop has to emulate x86 via Rosetta for images without a native `arm64` build, and that emulation path wasn't working out of the box. The fix was making sure Docker Desktop's "Use Rosetta for x86/amd64 emulation" setting was actually enabled, not something I'd have thought to check if the containers had just silently worked.

**`pydantic_settings` wasn't in `requirements.txt`.** The app imported it fine locally (already installed in my venv from another project) but crashed inside Docker with `ModuleNotFoundError` the moment I containerized it, because the container only has what `pip install -r requirements.txt` actually installs. Adding `pydantic-settings==2.14.2` to the file fixed it — but the first rebuild *still* failed, because Docker had cached the `pip install` layer from before the fix and wouldn't rerun it. `docker compose build --no-cache` forced it to actually reinstall.

**Alembic migration files weren't showing up on my Mac.** I generated a migration inside the running `api` container, and the file just... wasn't in my local `alembic/versions/` folder. `COPY . .` in the Dockerfile copies code into the image once, at build time — it's a snapshot, not a sync. Anything created inside the container afterward stays inside the container. Adding `- .:/app` as a volume mount in `docker-compose.yml` made it a live two-way sync instead, so a file created inside the container appears on my Mac (and vice versa) immediately.

**Railway had `DATEBASE_URL` instead of `DATABASE_URL`.** Deployed API returned 500s on every DB-touching route with no useful error visible from the Railway logs alone. I temporarily added a `/debug-env` endpoint that echoed back whether `DATABASE_URL` was set and its prefix, hit it, and immediately saw it was unset — because I'd fat-fingered the env var name in Railway's dashboard. Fixed the typo, deleted the debug endpoint the same day (it's the kind of thing you do not want to accidentally leave in prod).

**CORS silently broke across a redirect.** The frontend called `/applications` (no trailing slash); the route is actually defined at `/applications/`. FastAPI's default behavior is to 307-redirect the first to the second — and that redirect response doesn't carry the same CORS headers as a normal response, so the browser blocked it as a CORS failure with an error message that had nothing to do with the real cause. My first instinct was to set `redirect_slashes=False` on the app to kill the redirect entirely — that "worked," but it was a band-aid on top of not understanding the real problem. I reverted it and fixed the actual source: changed the frontend's Axios calls to hit `/applications/` directly, matching how the route is actually defined, so no redirect happens at all.

**`passlib` and `bcrypt>=4.1` don't get along.** Installing `passlib[bcrypt]` fresh pulled in the latest `bcrypt`, and hashing a password immediately threw `AttributeError: module 'bcrypt' has no attribute '__about__'` — followed by a second, stranger error (`password cannot be longer than 72 bytes`) once passlib fell back to a broken compatibility path. `bcrypt` 4.1 removed the `__about__` submodule that `passlib`'s version-detection code depends on, and passlib hasn't caught up. Pinning `bcrypt==4.0.1` (the last version that still has `__about__`) fixed both errors in one shot. I found this by writing a two-line smoke test (`hash_password`/`verify_password` in isolation) *before* wiring auth into any route — worth doing that in general before building on top of a new dependency.

## Running Locally

```bash
git clone <repo-url>
cd job-tracker

# Backend env
cp .env.example .env
# fill in DATABASE_URL (a local Postgres is fine — see docker-compose.yml for the local one)
# generate a SECRET_KEY:
python -c "import secrets; print(secrets.token_hex(32))"
# paste it into .env as SECRET_KEY=...

# Start Postgres + API
docker compose up -d

# Run migrations *inside* the container (see decision #11 — `db` only resolves on Docker's network)
docker compose exec api alembic upgrade head

# Frontend
cd frontend
npm install
npm run dev   # http://localhost:5173, talks to the API on http://localhost:8000
```

To run the backend test suite (doesn't need Docker — it's all SQLite, see decision #7):

```bash
pip install -r requirements.txt
pytest
```
