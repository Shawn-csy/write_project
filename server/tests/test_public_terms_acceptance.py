import time

from models import Script, User


def _seed_script(db_session):
    now = int(time.time() * 1000)
    user = User(id="terms-owner", handle="terms-owner")
    script = Script(
        id="terms-script-1",
        ownerId="terms-owner",
        title="Terms Script",
        content="Title: Terms\n\nINT. ROOM - DAY",
        folder="/",
        type="script",
        isPublic=1,
        createdAt=now,
        lastModified=now,
    )
    db_session.add_all([user, script])
    db_session.commit()


def test_public_terms_config_endpoint(client):
    res = client.get("/api/public-terms-config")
    assert res.status_code == 200
    payload = res.json()
    assert isinstance(payload.get("termsKey"), str)
    assert payload["termsKey"]
    assert isinstance(payload["version"], str)
    assert len(payload["requiredChecks"]) > 0


def test_public_terms_acceptance_create_and_admin_list(client, db_session):
    _seed_script(db_session)
    config = client.get("/api/public-terms-config").json()
    required_ids = [item["id"] for item in (config.get("requiredChecks") or [])]

    create_res = client.post(
        "/api/public-terms-acceptances",
        json={
            "termsVersion": config["version"],
            "scriptId": "terms-script-1",
            "visitorId": "visitor-abc-123",
            "locale": "zh-TW",
            "timezone": "Asia/Taipei",
            "acceptedChecks": required_ids,
            "screen": {"width": 1920, "height": 1080},
            "viewport": {"width": 1200, "height": 820},
            "pagePath": "/read/terms-script-1",
        },
        headers={
            "User-Agent": "pytest-agent",
            "X-Forwarded-For": "203.0.113.10",
        },
    )
    assert create_res.status_code == 200
    data = create_res.json()
    assert data["success"] is True
    assert data["acceptanceId"]
    assert isinstance(data["acceptedAt"], int)

    admin_res = client.get(
        "/api/admin/public-terms-acceptances?limit=20",
        headers={"X-User-ID": "admin-owner"},
    )
    assert admin_res.status_code == 200
    body = admin_res.json()
    assert body["total"] >= 1
    row = body["items"][0]
    assert row["scriptId"] == "terms-script-1"
    assert row["visitorId"] == "visitor-abc-123"
    assert row["ipAddress"] == "203.0.113.10"
    assert row["userAgent"] == "pytest-agent"


def test_public_terms_acceptance_requires_all_checks(client):
    config = client.get("/api/public-terms-config").json()
    required_ids = [item["id"] for item in (config.get("requiredChecks") or [])]
    partial = required_ids[:-1] if len(required_ids) > 1 else []

    res = client.post(
        "/api/public-terms-acceptances",
        json={
            "termsVersion": config["version"],
            "visitorId": "visitor-partial",
            "acceptedChecks": partial,
        },
    )
    assert res.status_code == 400
