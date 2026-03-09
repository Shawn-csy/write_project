import time

from models import User


def _seed_admin_user(db_session):
    now = int(time.time() * 1000)
    user = User(
        id="admin-owner",
        handle="admin-owner",
        email="admin-owner@example.com",
        createdAt=now,
        lastLogin=now,
    )
    db_session.add(user)
    db_session.commit()


def test_public_default_marker_configs_endpoint(client):
    res = client.get("/api/default-marker-configs")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_admin_can_update_default_marker_configs(client, db_session):
    _seed_admin_user(db_session)
    payload = [
        {
            "id": "rule-test-prefix",
            "label": "測試標記",
            "type": "block",
            "matchMode": "prefix",
            "start": "//TT",
            "isBlock": True,
        }
    ]

    put_res = client.put(
        "/api/admin/default-marker-configs",
        json=payload,
        headers={"X-User-ID": "admin-owner"},
    )
    assert put_res.status_code == 200
    assert isinstance(put_res.json(), list)
    assert put_res.json()[0]["id"] == "rule-test-prefix"

    get_admin_res = client.get(
        "/api/admin/default-marker-configs",
        headers={"X-User-ID": "admin-owner"},
    )
    assert get_admin_res.status_code == 200
    assert get_admin_res.json()[0]["id"] == "rule-test-prefix"

    get_public_res = client.get("/api/default-marker-configs")
    assert get_public_res.status_code == 200
    assert get_public_res.json()[0]["id"] == "rule-test-prefix"


def test_non_admin_cannot_update_default_marker_configs(client, db_session):
    now = int(time.time() * 1000)
    user = User(id="normal-user", handle="normal-user", createdAt=now, lastLogin=now)
    db_session.add(user)
    db_session.commit()

    res = client.put(
        "/api/admin/default-marker-configs",
        json=[],
        headers={"X-User-ID": "normal-user"},
    )
    assert res.status_code == 403
