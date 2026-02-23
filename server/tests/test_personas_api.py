import time
from models import Persona, User

def get_auth_headers(user_id="testuser_owner"):
    """Bypasses standard auth using the X-User-Id fallback (requires ALLOW_X_USER_ID=1)"""
    return {"X-User-Id": user_id}

def setup_data(db_session):
    now = int(time.time() * 1000)
    owner = User(id="testuser_owner", handle="owner")
    other = User(id="testuser_other", handle="other")
    persona1 = Persona(id="persona-1", displayName="Test Persona 1", ownerId="testuser_owner", createdAt=now, updatedAt=now)
    persona2 = Persona(id="persona-2", displayName="Test Persona 2", ownerId="testuser_other", createdAt=now, updatedAt=now)
    db_session.add_all([owner, other, persona1, persona2])
    db_session.commit()

# --- Tests ---

def test_delete_persona_not_found(client, db_session, monkeypatch):
    monkeypatch.setenv("ALLOW_X_USER_ID", "1")
    setup_data(db_session)
    
    response = client.delete("/api/personas/non-existent-persona", headers=get_auth_headers())
    assert response.status_code == 404
    assert response.json()["detail"] == "Persona not found"

def test_delete_persona_unauthorized(client, db_session, monkeypatch):
    monkeypatch.setenv("ALLOW_X_USER_ID", "1")
    setup_data(db_session)
    
    # Try deleting persona-1 (owned by testuser_owner) using testuser_other
    response = client.delete("/api/personas/persona-1", headers=get_auth_headers("testuser_other"))
    assert response.status_code == 403
    assert response.json()["detail"] == "Not authorized"

def test_transfer_persona_admin(client, db_session, monkeypatch):
    monkeypatch.setenv("ALLOW_X_USER_ID", "1")
    monkeypatch.setenv("ADMIN_USER_IDS", "admin-user")
    setup_data(db_session)
    
    # Ensure transfer_persona_ownership_admin branch is taken
    response = client.post(
        "/api/personas/persona-1/transfer",
        json={"newOwnerId": "testuser_other"},
        headers=get_auth_headers("admin-user")
    )
    assert response.status_code == 200
    assert response.json()["success"] is True

def test_transfer_persona_regular_user_failure(client, db_session, monkeypatch):
    monkeypatch.setenv("ALLOW_X_USER_ID", "1")
    setup_data(db_session)
    
    # Try transferring a persona we don't own
    response = client.post(
        "/api/personas/persona-1/transfer",
        json={"newOwnerId": "testuser_other"},
        headers=get_auth_headers("testuser_other") # wrong owner
    )
    assert response.status_code == 400
    assert "Transfer failed" in response.json()["detail"]

def test_get_user_personas_with_owner_id_query_non_admin(client, db_session, monkeypatch):
    monkeypatch.setenv("ALLOW_X_USER_ID", "1")
    setup_data(db_session)
    
    # Non-admin trying to query another user's personas defaults to their own
    response = client.get(
        "/api/personas?ownerIdQuery=testuser_other",
        headers=get_auth_headers("testuser_owner")
    )
    assert response.status_code == 200
    # Should get persona-1 (owner's) not persona-2
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == "persona-1"

def test_get_user_personas_with_owner_id_query_admin(client, db_session, monkeypatch):
    monkeypatch.setenv("ALLOW_X_USER_ID", "1")
    monkeypatch.setenv("ADMIN_USER_IDS", "admin-user")
    setup_data(db_session)
    
    # Admin can successfully query another user's personas
    response = client.get(
        "/api/personas?ownerIdQuery=testuser_owner",
        headers=get_auth_headers("admin-user")
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == "persona-1"
