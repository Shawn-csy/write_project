
import json
import time

from models import OrganizationMembership, User

def test_get_settings_empty(client):
    """Test getting settings for a new user"""
    response = client.get(
        "/api/me",
        headers={"X-User-ID": "test_user_1"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "test_user_1"
    assert data["settings"] == {}

def test_update_settings(client):
    """Test updating and retrieving settings"""
    user_id = "test_user_update"
    headers = {"X-User-ID": user_id}
    
    settings_payload = {
        "accent": "violet",
        "fontSize": 18,
        "markerThemes": [{"id": "theme1", "configs": []}]
    }
    
    # Update
    response = client.put(
        "/api/me",
        json={"settings": settings_payload},
        headers=headers
    )
    assert response.status_code == 200
    
    # Retrieve
    response = client.get("/api/me", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["settings"]["accent"] == "violet"
    assert data["settings"]["fontSize"] == 18

def test_marker_themes(client):
    """Test creating and retrieving marker themes"""
    user_id = "test_user_themes"
    headers = {"X-User-ID": user_id}
    
    # Create Theme
    theme_payload = {
        "name": "My Custom Theme",
        "configs": json.dumps([{"id": "c1", "color": "red"}]),
        "isPublic": False
    }
    
    response = client.post("/api/themes", json=theme_payload, headers=headers)
    assert response.status_code == 200
    created_theme = response.json()
    assert created_theme["name"] == "My Custom Theme"
    
    # Get Themes
    response = client.get("/api/themes", headers=headers)
    assert response.status_code == 200
    themes = response.json()
    assert len(themes) == 1
    assert themes[0]["id"] == created_theme["id"]


def test_get_settings_invalid_json_falls_back_to_empty_and_sets_primary_org(client, db_session):
    now = int(time.time() * 1000)
    db_session.add(
        User(
            id="settings_invalid_json_user",
            handle="settings_invalid_json_user",
            settings="{not-json",
            createdAt=now,
            lastLogin=now,
        )
    )
    db_session.add(
        OrganizationMembership(
            id="membership-1",
            userId="settings_invalid_json_user",
            orgId="org-primary",
            role="member",
            createdAt=now,
            updatedAt=now,
        )
    )
    db_session.commit()

    response = client.get("/api/me", headers={"X-User-ID": "settings_invalid_json_user"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["settings"] == {}
    assert payload["organizationIds"] == ["org-primary"]
    assert payload["organizationId"] == "org-primary"


def test_get_settings_admin_user_returns_is_admin_true(client):
    response = client.get("/api/me", headers={"X-User-ID": "admin-owner"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["id"] == "admin-owner"
    assert payload["isAdmin"] is True


def test_update_settings_duplicate_handle_returns_409(client, db_session):
    now = int(time.time() * 1000)
    db_session.add(
        User(
            id="owner_a",
            handle="taken_handle",
            createdAt=now,
            lastLogin=now,
        )
    )
    db_session.add(
        User(
            id="owner_b",
            handle="free_handle",
            createdAt=now,
            lastLogin=now,
        )
    )
    db_session.commit()

    response = client.put(
        "/api/me",
        json={"handle": "taken_handle"},
        headers={"X-User-ID": "owner_b"},
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Handle already taken"


def test_read_me_does_not_dirty_user_settings_before_other_writes(client, db_session):
    now = int(time.time() * 1000)
    db_session.add(
        User(
            id="settings_flush_user",
            handle="settings_flush_user",
            settings='{"accent":"blue"}',
            createdAt=now,
            lastLogin=now,
        )
    )
    db_session.commit()

    headers = {"X-User-ID": "settings_flush_user"}
    me_res = client.get("/api/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["settings"]["accent"] == "blue"

    # Regression: this used to fail with sqlite binding error because /api/me
    # mutated ORM user.settings from JSON string to dict in-session.
    create_res = client.post("/api/scripts", json={"title": "AfterMe"}, headers=headers)
    assert create_res.status_code == 200
