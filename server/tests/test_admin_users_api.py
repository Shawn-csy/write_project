import os
import time

from models import User


def _seed_user(db_session, user_id: str, email: str):
    now = int(time.time() * 1000)
    row = User(
        id=user_id,
        handle=user_id,
        email=email,
        createdAt=now,
        lastLogin=now,
    )
    db_session.add(row)
    db_session.commit()
    return row


def test_non_admin_cannot_access_admin_users(client, db_session):
    _seed_user(db_session, "normal-user", "normal@example.com")
    res = client.get("/api/admin/admin-users", headers={"X-User-ID": "normal-user"})
    assert res.status_code == 403


def test_admin_users_create_list_delete_flow(client, db_session):
    _seed_user(db_session, "target-user", "target@example.com")

    bad_create = client.post(
        "/api/admin/admin-users",
        json={},
        headers={"X-User-ID": "admin-owner"},
    )
    assert bad_create.status_code == 400

    not_found_create = client.post(
        "/api/admin/admin-users",
        json={"userId": "not-found-user"},
        headers={"X-User-ID": "admin-owner"},
    )
    assert not_found_create.status_code == 404

    create = client.post(
        "/api/admin/admin-users",
        json={"email": "target@example.com"},
        headers={"X-User-ID": "admin-owner"},
    )
    assert create.status_code == 200
    created = create.json()
    assert created["userId"] == "target-user"
    assert created["email"] == "target@example.com"

    dup = client.post(
        "/api/admin/admin-users",
        json={"userId": "target-user"},
        headers={"X-User-ID": "admin-owner"},
    )
    assert dup.status_code == 409

    listing = client.get("/api/admin/admin-users", headers={"X-User-ID": "admin-owner"})
    assert listing.status_code == 200
    assert any(row["id"] == created["id"] for row in listing.json())

    delete_ok = client.delete(f"/api/admin/admin-users/{created['id']}", headers={"X-User-ID": "admin-owner"})
    assert delete_ok.status_code == 200
    assert delete_ok.json()["success"] is True

    delete_missing = client.delete(f"/api/admin/admin-users/{created['id']}", headers={"X-User-ID": "admin-owner"})
    assert delete_missing.status_code == 404


def test_env_admin_email_row_cannot_be_deleted(client):
    old_env = os.environ.get("ADMIN_USER_EMAILS")
    os.environ["ADMIN_USER_EMAILS"] = "boss@example.com"
    try:
        listing = client.get("/api/admin/admin-users", headers={"X-User-ID": "admin-owner"})
        assert listing.status_code == 200
        assert any(row["id"] == "env-email:boss@example.com" for row in listing.json())

        delete_env = client.delete(
            "/api/admin/admin-users/env-email:boss@example.com",
            headers={"X-User-ID": "admin-owner"},
        )
        assert delete_env.status_code == 400
    finally:
        if old_env is None:
            os.environ.pop("ADMIN_USER_EMAILS", None)
        else:
            os.environ["ADMIN_USER_EMAILS"] = old_env
