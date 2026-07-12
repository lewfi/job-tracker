from fastapi.testclient import TestClient
from app.main import app


def test_register_success(unauthenticated_client):
    response = unauthenticated_client.post(
        "/auth/register",
        json={"email": "newuser@example.com", "password": "password123"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@example.com"
    assert data["token_type"] == "bearer"
    assert data["access_token"]


def test_register_duplicate_email(unauthenticated_client):
    unauthenticated_client.post(
        "/auth/register",
        json={"email": "dupe@example.com", "password": "password123"}
    )
    response = unauthenticated_client.post(
        "/auth/register",
        json={"email": "dupe@example.com", "password": "password456"}
    )
    assert response.status_code == 409


def test_login_success(unauthenticated_client):
    unauthenticated_client.post(
        "/auth/register",
        json={"email": "loginuser@example.com", "password": "password123"}
    )
    response = unauthenticated_client.post(
        "/auth/login",
        json={"email": "loginuser@example.com", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "loginuser@example.com"
    assert data["access_token"]


def test_login_wrong_password(unauthenticated_client):
    unauthenticated_client.post(
        "/auth/register",
        json={"email": "wrongpw@example.com", "password": "password123"}
    )
    response = unauthenticated_client.post(
        "/auth/login",
        json={"email": "wrongpw@example.com", "password": "incorrect"}
    )
    assert response.status_code == 401


def test_login_nonexistent_email(unauthenticated_client):
    response = unauthenticated_client.post(
        "/auth/login",
        json={"email": "ghost@example.com", "password": "password123"}
    )
    assert response.status_code == 401


def test_no_token_returns_401(unauthenticated_client):
    response = unauthenticated_client.get("/applications/")
    assert response.status_code == 401


def test_garbage_token_returns_401(unauthenticated_client):
    unauthenticated_client.headers["Authorization"] = "Bearer not.a.valid.jwt"
    response = unauthenticated_client.get("/applications/")
    assert response.status_code == 401


def test_cross_user_isolation(client):
    # `client` is pre-authenticated as user A (test@example.com)
    create_response = client.post(
        "/applications/",
        json={
            "company": "User A Company",
            "role": "Engineer",
            "status": "applied",
            "date_applied": "2026-01-01",
            "source": "linkedin",
        }
    )
    assert create_response.status_code == 201
    application_id = create_response.json()["id"]

    # Second client, sharing the same overridden get_db (same underlying test DB),
    # registered as a different user
    with TestClient(app) as client_b:
        register_response = client_b.post(
            "/auth/register",
            json={"email": "userb@example.com", "password": "password123"}
        )
        token_b = register_response.json()["access_token"]
        client_b.headers["Authorization"] = f"Bearer {token_b}"

        # User B's list should not include user A's application
        list_response = client_b.get("/applications/")
        assert list_response.status_code == 200
        assert all(app_["id"] != application_id for app_ in list_response.json())

        # User B cannot read, update, or delete user A's application
        assert client_b.get(f"/applications/{application_id}").status_code == 404
        assert client_b.patch(f"/applications/{application_id}", json={"notes": "hijacked"}).status_code == 404
        assert client_b.delete(f"/applications/{application_id}").status_code == 404

    # User A's application is untouched
    get_response = client.get(f"/applications/{application_id}")
    assert get_response.status_code == 200
    assert get_response.json()["notes"] != "hijacked"
