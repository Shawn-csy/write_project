import time

from models import User


def _seed_user(db_session, user_id: str, email: str, display_name: str = ""):
    now = int(time.time() * 1000)
    row = User(
        id=user_id,
        handle=user_id,
        email=email,
        displayName=display_name,
        createdAt=now,
        lastLogin=now,
    )
    db_session.add(row)
    db_session.commit()
    return row


def test_admin_can_list_all_users_with_query(client, db_session):
    _seed_user(db_session, "u-alpha", "alpha@example.com", "Alpha")
    _seed_user(db_session, "u-beta", "beta@example.com", "Beta")

    all_res = client.get("/api/admin/all-users", headers={"X-User-ID": "admin-owner"})
    assert all_res.status_code == 200
    assert len(all_res.json()) >= 2

    filtered = client.get("/api/admin/all-users?q=beta@example.com", headers={"X-User-ID": "admin-owner"})
    assert filtered.status_code == 200
    items = filtered.json()
    assert len(items) == 1
    assert items[0]["id"] == "u-beta"


def test_non_admin_cannot_list_all_users(client, db_session):
    _seed_user(db_session, "normal-user", "normal@example.com")
    res = client.get("/api/admin/all-users", headers={"X-User-ID": "normal-user"})
    assert res.status_code == 403


def test_admin_delete_user_guards_and_success(client, db_session):
    _seed_user(db_session, "admin-owner", "admin-owner@example.com")
    _seed_user(db_session, "delete-me", "delete-me@example.com")

    cannot_self = client.delete("/api/admin/all-users/admin-owner", headers={"X-User-ID": "admin-owner"})
    assert cannot_self.status_code == 400

    missing = client.delete("/api/admin/all-users/no-such-user", headers={"X-User-ID": "admin-owner"})
    assert missing.status_code == 404

    deleted = client.delete("/api/admin/all-users/delete-me", headers={"X-User-ID": "admin-owner"})
    assert deleted.status_code == 200
    assert deleted.json()["success"] is True
