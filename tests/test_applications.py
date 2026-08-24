from datetime import date, timedelta

# A recent date well within the 45-day ghosting window, used by tests that
# don't care about ghosting behavior specifically.
RECENT_DATE = (date.today() - timedelta(days=5)).isoformat()

# ===== CORE TESTS =====


def test_create_application(client):
    # Test creating a new application
    response = client.post(
        "/applications/",
        json={
            "company": "Test Company",
            "role": "Software Engineer",
            "status": "applied",
            "date_applied": RECENT_DATE,
            "source": "linkedin",
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["company"] == "Test Company"
    assert data["role"] == "Software Engineer"
    assert data["status"] == "applied"
    assert data["date_applied"] == RECENT_DATE
    assert data["source"] == "linkedin"

def test_get_applications(client):
    # Test retrieving all applications
    response = client.get("/applications/")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_get_application_by_id(client):
    # Test retrieving a specific application by ID
    # First, create an application to retrieve
    create_response = client.post(
        "/applications/",
        json={
            "company": "Test Company",
            "role": "Software Engineer",
            "status": "applied",
            "date_applied": RECENT_DATE,
            "source": "linkedin",
        }
    )
    assert create_response.status_code == 201
    created_data = create_response.json()
    application_id = created_data["id"]

    # Now, retrieve the application by ID
    response = client.get(f"/applications/{application_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == application_id
    assert data["company"] == "Test Company"
    assert data["role"] == "Software Engineer"
    assert data["status"] == "applied"
    assert data["date_applied"] == RECENT_DATE
    assert data["source"] == "linkedin"

def test_get_application_not_found(client):
    # Test retrieving a non-existent application
    response = client.get("/applications/9999")  # Assuming 9999 does not exist
    assert response.status_code == 404
    data = response.json()
    assert data["detail"] == "Application not found"

def test_delete_application(client):
    # Test deleting an application
    # First, create an application to delete
    create_response = client.post(
        "/applications/",
        json={
            "company": "Test Company",
            "role": "Software Engineer",
            "status": "applied",
            "date_applied": RECENT_DATE,
            "source": "linkedin",
        }
    )
    assert create_response.status_code == 201
    created_data = create_response.json()
    application_id = created_data["id"]

    # Now, delete the application
    response = client.delete(f"/applications/{application_id}")
    assert response.status_code == 204

    # Verify that the application is deleted
    get_response = client.get(f"/applications/{application_id}")
    assert get_response.status_code == 404


# ===== ADDITIONAL TESTS =====


# Validation tests
def test_create_application_missing_required_field(client):
    # Missing company, role, date_applied, source — should return 422
    response = client.post(
        "/applications/",
        json={"status": "applied"}
    )
    assert response.status_code == 422

def test_create_application_invalid_status(client):
    # Invalid status value — should return 422 from Pydantic or 500 from CHECK constraint
    response = client.post(
        "/applications/",
        json={
            "company": "Test Company",
            "role": "Software Engineer",
            "status": "invalid_status",
            "date_applied": RECENT_DATE,
            "source": "linkedin",
        }
    )
    assert response.status_code in [422, 500]

def test_create_application_invalid_source(client):
    # Invalid source value
    response = client.post(
        "/applications/",
        json={
            "company": "Test Company",
            "role": "Software Engineer",
            "status": "applied",
            "date_applied": RECENT_DATE,
            "source": "invalid_source",
        }
    )
    assert response.status_code in [422, 500]

# PATCH tests
def test_patch_application_valid_field(client):
    # Create an application first
    create_response = client.post(
        "/applications/",
        json={
            "company": "Test Company",
            "role": "Software Engineer",
            "status": "applied",
            "date_applied": RECENT_DATE,
            "source": "linkedin",
        }
    )
    application_id = create_response.json()["id"]

    # Patch the notes field
    response = client.patch(
        f"/applications/{application_id}",
        json={"notes": "Updated notes"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["notes"] == "Updated notes"
    assert data["company"] == "Test Company"  # unchanged

def test_patch_application_status_creates_history(client):
    # Create an application
    create_response = client.post(
        "/applications/",
        json={
            "company": "Test Company",
            "role": "Software Engineer",
            "status": "applied",
            "date_applied": RECENT_DATE,
            "source": "linkedin",
        }
    )
    application_id = create_response.json()["id"]

    # Patch the status
    response = client.patch(
        f"/applications/{application_id}",
        json={"status": "screen"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "screen"

    # Verify status history has two entries (applied + screen)
    assert len(data["status_history"]) == 2
    assert data["status_history"][0]["status"] == "applied"
    assert data["status_history"][1]["status"] == "screen"

def test_patch_application_not_found(client):
    # Patch a non-existent application
    response = client.patch(
        "/applications/9999",
        json={"notes": "Updated notes"}
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Application not found"

def test_patch_application_empty_body(client):
    # Create an application
    create_response = client.post(
        "/applications/",
        json={
            "company": "Test Company",
            "role": "Software Engineer",
            "status": "applied",
            "date_applied": RECENT_DATE,
            "source": "linkedin",
        }
    )
    application_id = create_response.json()["id"]

    # Patch with empty body — should return unchanged application
    response = client.patch(
        f"/applications/{application_id}",
        json={}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["company"] == "Test Company"
    assert data["status"] == "applied"

# Status history tests
def test_create_application_has_initial_status_history(client):
    # Create an application
    create_response = client.post(
        "/applications/",
        json={
            "company": "Test Company",
            "role": "Software Engineer",
            "status": "applied",
            "date_applied": RECENT_DATE,
            "source": "linkedin",
        }
    )
    assert create_response.status_code == 201
    data = create_response.json()

    # Should have exactly one status history entry
    assert len(data["status_history"]) == 1
    assert data["status_history"][0]["status"] == "applied"
    assert data["status_history"][0]["application_id"] == data["id"]

def test_multiple_status_changes_create_history(client):
    # Create an application
    create_response = client.post(
        "/applications/",
        json={
            "company": "Test Company",
            "role": "Software Engineer",
            "status": "applied",
            "date_applied": RECENT_DATE,
            "source": "linkedin",
        }
    )
    application_id = create_response.json()["id"]

    # First status change
    client.patch(f"/applications/{application_id}", json={"status": "screen"})

    # Second status change
    client.patch(f"/applications/{application_id}", json={"status": "onsite"})

    # Get the application and verify history has three entries
    response = client.get(f"/applications/{application_id}")
    data = response.json()
    assert len(data["status_history"]) == 3
    assert data["status_history"][0]["status"] == "applied"
    assert data["status_history"][1]["status"] == "screen"
    assert data["status_history"][2]["status"] == "onsite"

# Edge case tests
def test_get_applications_empty_database(client):
    # No applications created — should return empty list
    response = client.get("/applications/")
    assert response.status_code == 200
    assert response.json() == []

def test_delete_already_deleted_application(client):
    # Create and delete an application
    create_response = client.post(
        "/applications/",
        json={
            "company": "Test Company",
            "role": "Software Engineer",
            "status": "applied",
            "date_applied": RECENT_DATE,
            "source": "linkedin",
        }
    )
    application_id = create_response.json()["id"]
    client.delete(f"/applications/{application_id}")

    # Try to delete again — should return 404
    response = client.delete(f"/applications/{application_id}")
    assert response.status_code == 404
    assert response.json()["detail"] == "Application not found"

def test_create_multiple_applications(client):
    # Create three applications and verify all are returned
    companies = ["Company A", "Company B", "Company C"]
    for company in companies:
        client.post(
            "/applications/",
            json={
                "company": company,
                "role": "Software Engineer",
                "status": "applied",
                "date_applied": RECENT_DATE,
                "source": "linkedin",
            }
        )

    response = client.get("/applications/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    returned_companies = [app["company"] for app in data]
    assert "Company A" in returned_companies
    assert "Company B" in returned_companies
    assert "Company C" in returned_companies

def test_patch_does_not_affect_other_applications(client):
    # Create two applications
    app1 = client.post(
        "/applications/",
        json={
            "company": "Company A",
            "role": "Software Engineer",
            "status": "applied",
            "date_applied": RECENT_DATE,
            "source": "linkedin",
        }
    ).json()

    app2 = client.post(
        "/applications/",
        json={
            "company": "Company B",
            "role": "Product Manager",
            "status": "applied",
            "date_applied": RECENT_DATE,
            "source": "indeed",
        }
    ).json()

    # Patch app1
    client.patch(f"/applications/{app1['id']}", json={"status": "screen"})

    # Verify app2 is unchanged
    response = client.get(f"/applications/{app2['id']}")
    data = response.json()
    assert data["status"] == "applied"
    assert data["company"] == "Company B"


# ===== GHOSTING TESTS =====

OLD_DATE = (date.today() - timedelta(days=46)).isoformat()
BOUNDARY_DATE = (date.today() - timedelta(days=45)).isoformat()

def test_get_application_ghosts_after_45_days(client):
    # Applied over 45 days ago and still "applied" — should flip to "ghosted" on read
    create_response = client.post(
        "/applications/",
        json={
            "company": "Test Company",
            "role": "Software Engineer",
            "status": "applied",
            "date_applied": OLD_DATE,
            "source": "linkedin",
        }
    )
    application_id = create_response.json()["id"]

    response = client.get(f"/applications/{application_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ghosted"

    # A status_history entry recording the transition to ghosted should exist
    assert data["status_history"][-1]["status"] == "ghosted"

def test_get_applications_list_ghosts_stale_entries(client):
    client.post(
        "/applications/",
        json={
            "company": "Stale Co",
            "role": "Engineer",
            "status": "applied",
            "date_applied": OLD_DATE,
            "source": "linkedin",
        }
    )
    client.post(
        "/applications/",
        json={
            "company": "Fresh Co",
            "role": "Engineer",
            "status": "applied",
            "date_applied": RECENT_DATE,
            "source": "linkedin",
        }
    )

    response = client.get("/applications/")
    data = response.json()
    statuses = {app["company"]: app["status"] for app in data}
    assert statuses["Stale Co"] == "ghosted"
    assert statuses["Fresh Co"] == "applied"

def test_ghosting_respects_45_day_boundary(client):
    # Exactly at the 45-day mark should already be ghosted (inclusive cutoff)
    create_response = client.post(
        "/applications/",
        json={
            "company": "Boundary Co",
            "role": "Engineer",
            "status": "applied",
            "date_applied": BOUNDARY_DATE,
            "source": "linkedin",
        }
    )
    application_id = create_response.json()["id"]

    response = client.get(f"/applications/{application_id}")
    assert response.json()["status"] == "ghosted"

def test_ghosting_does_not_affect_non_applied_statuses(client):
    # An old application that already moved past "applied" should not be ghosted
    create_response = client.post(
        "/applications/",
        json={
            "company": "In Progress Co",
            "role": "Engineer",
            "status": "applied",
            "date_applied": OLD_DATE,
            "source": "linkedin",
        }
    )
    application_id = create_response.json()["id"]
    client.patch(f"/applications/{application_id}", json={"status": "screen"})

    response = client.get(f"/applications/{application_id}")
    data = response.json()
    assert data["status"] == "screen"

def test_ghosted_application_can_be_reactivated(client):
    # Create an application old enough to ghost, and let it ghost
    create_response = client.post(
        "/applications/",
        json={
            "company": "Reactivate Co",
            "role": "Engineer",
            "status": "applied",
            "date_applied": OLD_DATE,
            "source": "linkedin",
        }
    )
    application_id = create_response.json()["id"]

    ghosted_response = client.get(f"/applications/{application_id}")
    assert ghosted_response.json()["status"] == "ghosted"

    # User gets contacted after all — manually reactivate it
    patch_response = client.patch(f"/applications/{application_id}", json={"status": "applied"})
    assert patch_response.status_code == 200
    assert patch_response.json()["status"] == "applied"

    # Re-fetching should NOT immediately re-ghost it, even though date_applied
    # is still more than 45 days in the past — the reactivation resets the clock
    response = client.get(f"/applications/{application_id}")
    data = response.json()
    assert data["status"] == "applied"
    assert data["status_history"][-1]["status"] == "applied"

def test_can_manually_set_status_to_ghosted(client):
    # Manually marking an application as ghosted should be allowed even
    # though it's nowhere near the 45-day auto-ghosting threshold
    create_response = client.post(
        "/applications/",
        json={
            "company": "Manual Ghost Co",
            "role": "Engineer",
            "status": "applied",
            "date_applied": RECENT_DATE,
            "source": "linkedin",
        }
    )
    application_id = create_response.json()["id"]

    patch_response = client.patch(f"/applications/{application_id}", json={"status": "ghosted"})
    assert patch_response.status_code == 200
    data = patch_response.json()
    assert data["status"] == "ghosted"
    assert data["status_history"][-1]["status"] == "ghosted"

    # Persists on re-fetch
    response = client.get(f"/applications/{application_id}")
    assert response.json()["status"] == "ghosted"