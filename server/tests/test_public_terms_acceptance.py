import time
import pytest

from models import PublicTermsAcceptance, Script, User


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


def _seed_private_script(db_session):
    now = int(time.time() * 1000)
    user = User(id="terms-owner-private", handle="terms-owner-private")
    script = Script(
        id="terms-script-private-1",
        ownerId="terms-owner-private",
        title="Terms Script Private",
        content="Title: Private\n\nINT. ROOM - NIGHT",
        folder="/",
        type="script",
        isPublic=0,
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
    assert row["ipAddress"] != "203.0.113.10"
    assert row["forwardedFor"] == ""
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


def test_public_terms_acceptance_ignores_spoofed_x_user_id(client, db_session):
    _seed_script(db_session)
    config = client.get("/api/public-terms-config").json()
    required_ids = [item["id"] for item in (config.get("requiredChecks") or [])]

    res = client.post(
        "/api/public-terms-acceptances",
        json={
            "termsVersion": config["version"],
            "scriptId": "terms-script-1",
            "visitorId": "visitor-spoof-check",
            "acceptedChecks": required_ids,
        },
        headers={"X-User-ID": "forged-user-id"},
    )
    assert res.status_code == 200
    acceptance_id = res.json()["acceptanceId"]

    from models import PublicTermsAcceptance

    row = db_session.query(PublicTermsAcceptance).filter(PublicTermsAcceptance.id == acceptance_id).first()
    assert row is not None
    assert row.userId is None


def test_public_terms_acceptance_rejects_private_script(client, db_session):
    _seed_private_script(db_session)
    config = client.get("/api/public-terms-config").json()
    required_ids = [item["id"] for item in (config.get("requiredChecks") or [])]

    res = client.post(
        "/api/public-terms-acceptances",
        json={
            "termsVersion": config["version"],
            "scriptId": "terms-script-private-1",
            "visitorId": "visitor-private-script",
            "acceptedChecks": required_ids,
        },
    )
    assert res.status_code == 404


@pytest.mark.parametrize("field,value", [
    ("visitorId", "x" * 129),
    ("screen", {"width": 1920, "unexpected": "x" * 200}),
    ("viewport", {"width": -1}),
    ("acceptedChecks", ["x"] * 17),
])
def test_public_terms_acceptance_rejects_unbounded_metadata(client, db_session, field, value):
    config = client.get("/api/public-terms-config").json()
    res = client.post("/api/public-terms-acceptances", json={
        "termsVersion": config["version"],
        "acceptedChecks": [item["id"] for item in config["requiredChecks"]],
        field: value,
    })
    assert res.status_code == 422
    assert db_session.query(PublicTermsAcceptance).count() == 0


def test_public_terms_acceptance_rejects_oversized_body_before_parsing(client, db_session):
    res = client.post(
        "/api/public-terms-acceptances",
        content='{"padding":"' + "x" * 4096 + '"}',
        headers={"Content-Type": "application/json"},
    )
    assert res.status_code == 413
    assert db_session.query(PublicTermsAcceptance).count() == 0


def test_public_terms_acceptance_rejects_streamed_oversized_body(client, db_session):
    res = client.post(
        "/api/public-terms-acceptances",
        content=iter([b'{"padding":"', b"x" * 4096, b'"}']),
        headers={"Content-Type": "application/json"},
    )
    assert res.status_code == 413
    assert db_session.query(PublicTermsAcceptance).count() == 0


def test_public_terms_acceptance_bounds_recorded_headers(client, db_session):
    config = client.get("/api/public-terms-config").json()
    res = client.post("/api/public-terms-acceptances", json={
        "termsVersion": config["version"],
        "acceptedChecks": [item["id"] for item in config["requiredChecks"]],
    }, headers={
        "User-Agent": "u" * 2048,
        "Accept-Language": "l" * 2048,
        "Referer": "r" * 4096,
        "Sec-CH-UA": "c" * 2048,
    })
    assert res.status_code == 200
    row = db_session.query(PublicTermsAcceptance).filter_by(id=res.json()["acceptanceId"]).one()
    assert len(row.userAgent) == 512
    assert len(row.acceptLanguage) == 256
    assert len(row.referer) == 2048
    assert len(row.headerSnapshot["sec-ch-ua"]) == 512
