from datetime import date, timedelta

RECENT_DATE = (date.today() - timedelta(days=5)).isoformat()


def create_app(client, company, status="applied", headers=None):
    response = client.post(
        "/applications/",
        json={
            "company": company,
            "role": "Engineer",
            "status": status,
            "date_applied": RECENT_DATE,
            "source": "linkedin",
        },
        headers=headers,
    )
    assert response.status_code == 201
    return response.json()


def register_second_user(client):
    # Per-request headers override the fixture's default Authorization header
    response = client.post(
        "/auth/register",
        json={"email": "second@example.com", "password": "password123"},
    )
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


# ===== PRIORITY ENDPOINT =====


def test_priority_route_is_not_parsed_as_application_id(client):
    # If /priority were registered after /{application_id}, this would be a 422
    response = client.get("/applications/priority")
    assert response.status_code == 200
    assert response.json() == []


def test_priority_includes_late_stage_statuses_and_starred(client):
    create_app(client, "Applied Co", "applied")
    create_app(client, "Screen Co", "screen")
    create_app(client, "Rejected Co", "rejected")
    create_app(client, "Technical Co", "technical")
    create_app(client, "Onsite Co", "onsite")
    create_app(client, "Offer Co", "offer")
    starred = create_app(client, "Starred Co", "oa")
    client.patch(f"/applications/{starred['id']}", json={"is_priority": True})

    response = client.get("/applications/priority")
    assert response.status_code == 200
    companies = [app["company"] for app in response.json()]
    # offer -> onsite -> technical -> starred-at-earlier-stage
    assert companies == ["Offer Co", "Onsite Co", "Technical Co", "Starred Co"]


def test_priority_starred_late_stage_is_not_duplicated_or_demoted(client):
    onsite = create_app(client, "Onsite Co", "onsite")
    client.patch(f"/applications/{onsite['id']}", json={"is_priority": True})
    create_app(client, "Technical Co", "technical")

    companies = [app["company"] for app in client.get("/applications/priority").json()]
    assert companies == ["Onsite Co", "Technical Co"]


def test_priority_same_tier_sorted_by_most_recently_updated(client):
    first = create_app(client, "First Co", "technical")
    create_app(client, "Second Co", "technical")

    # Touch the older one so it becomes the most recently updated
    client.patch(f"/applications/{first['id']}", json={"notes": "followed up"})

    companies = [app["company"] for app in client.get("/applications/priority").json()]
    assert companies == ["First Co", "Second Co"]


def test_priority_is_scoped_per_user(client):
    create_app(client, "User One Offer", "offer")
    one_starred = create_app(client, "User One Starred", "applied")
    client.patch(f"/applications/{one_starred['id']}", json={"is_priority": True})

    second_headers = register_second_user(client)
    create_app(client, "User Two Onsite", "onsite", headers=second_headers)
    create_app(client, "User Two Applied", "applied", headers=second_headers)

    first_view = [app["company"] for app in client.get("/applications/priority").json()]
    assert first_view == ["User One Offer", "User One Starred"]

    second_view = [app["company"] for app in client.get("/applications/priority", headers=second_headers).json()]
    assert second_view == ["User Two Onsite"]


def test_priority_requires_auth(unauthenticated_client):
    response = unauthenticated_client.get("/applications/priority")
    assert response.status_code == 401


# ===== is_priority TOGGLE =====


def test_new_application_defaults_to_not_priority(client):
    data = create_app(client, "Default Co")
    assert data["is_priority"] is False


def test_create_ignores_is_priority(client):
    # is_priority is not part of ApplicationCreate — new applications always start unstarred
    response = client.post(
        "/applications/",
        json={
            "company": "Sneaky Co",
            "role": "Engineer",
            "status": "applied",
            "date_applied": RECENT_DATE,
            "source": "linkedin",
            "is_priority": True,
        },
    )
    assert response.status_code == 201
    assert response.json()["is_priority"] is False


def test_patch_toggles_is_priority(client):
    app = create_app(client, "Toggle Co", "screen")

    on = client.patch(f"/applications/{app['id']}", json={"is_priority": True})
    assert on.status_code == 200
    assert on.json()["is_priority"] is True
    assert on.json()["status"] == "screen"
    # Starring is not a status change, so no history row is added
    assert len(on.json()["status_history"]) == 1
    assert [a["id"] for a in client.get("/applications/priority").json()] == [app["id"]]

    off = client.patch(f"/applications/{app['id']}", json={"is_priority": False})
    assert off.status_code == 200
    assert off.json()["is_priority"] is False
    assert client.get("/applications/priority").json() == []


def test_patch_is_priority_cannot_touch_another_users_application(client):
    app = create_app(client, "Mine Co")
    second_headers = register_second_user(client)

    response = client.patch(f"/applications/{app['id']}", json={"is_priority": True}, headers=second_headers)
    assert response.status_code == 404
    assert client.get(f"/applications/{app['id']}").json()["is_priority"] is False


# ===== behavioral STATUS REMOVED =====


def test_behavioral_status_is_rejected(client):
    response = client.post(
        "/applications/",
        json={
            "company": "Behavioral Co",
            "role": "Engineer",
            "status": "behavioral",
            "date_applied": RECENT_DATE,
            "source": "linkedin",
        },
    )
    assert response.status_code == 422


# ===== IDEMPOTENT CREATE (double-submit) =====


def test_double_submit_with_same_idempotency_key_creates_one_application(client):
    payload = {
        "company": "Slow Co",
        "role": "Engineer",
        "status": "applied",
        "date_applied": RECENT_DATE,
        "source": "linkedin",
    }
    headers = {"Idempotency-Key": "form-123"}
    first = client.post("/applications/", json=payload, headers=headers)
    second = client.post("/applications/", json=payload, headers=headers)

    assert first.status_code == 201
    assert second.status_code == 201
    assert second.json()["id"] == first.json()["id"]
    assert len(client.get("/applications/").json()) == 1
    assert len(second.json()["status_history"]) == 1


def test_different_idempotency_keys_create_separate_applications(client):
    payload = {
        "company": "Twice Co",
        "role": "Engineer",
        "status": "applied",
        "date_applied": RECENT_DATE,
        "source": "linkedin",
    }
    client.post("/applications/", json=payload, headers={"Idempotency-Key": "form-a"})
    client.post("/applications/", json=payload, headers={"Idempotency-Key": "form-b"})
    client.post("/applications/", json=payload)
    assert len(client.get("/applications/").json()) == 3


def test_idempotency_key_is_scoped_per_user(client):
    payload = {
        "company": "Shared Key Co",
        "role": "Engineer",
        "status": "applied",
        "date_applied": RECENT_DATE,
        "source": "linkedin",
    }
    first = client.post("/applications/", json=payload, headers={"Idempotency-Key": "same-key"})
    second_headers = register_second_user(client)
    second = client.post("/applications/", json=payload, headers={**second_headers, "Idempotency-Key": "same-key"})

    assert second.status_code == 201
    assert second.json()["id"] != first.json()["id"]
    assert len(client.get("/applications/", headers=second_headers).json()) == 1
