from models import PublicFeedback
from routers import public as public_router


def test_public_feedback_persists_and_enqueues_notification(client, db_session, monkeypatch):
    sent = []
    monkeypatch.setattr(
        public_router,
        "send_public_feedback_notification",
        lambda payload: sent.append(payload),
    )

    response = client.post(
        "/api/public-feedback",
        json={
            "kind": "listing",
            "contactName": "測試使用者",
            "contactEmail": "visitor@example.com",
            "content": "希望可以收錄這份公開台本。",
            "pageUrl": "https://open-scripts.shawnup.com/",
        },
        headers={"X-Forwarded-For": "203.0.113.20"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["feedbackId"]
    row = db_session.query(PublicFeedback).filter(PublicFeedback.id == payload["feedbackId"]).one()
    assert row.kind == "listing"
    assert row.contactEmail == "visitor@example.com"
    assert sent and sent[0]["id"] == row.id


def test_public_feedback_honeypot_does_not_store_message(client, db_session):
    response = client.post(
        "/api/public-feedback",
        json={
            "contactName": "bot",
            "content": "spam message",
            "website": "https://example.com",
        },
    )

    assert response.status_code == 200
    assert response.json()["feedbackId"] == ""
    assert db_session.query(PublicFeedback).count() == 0


def test_public_feedback_requires_contact_and_content(client):
    missing_contact = client.post(
        "/api/public-feedback",
        json={"content": "這是一段足夠長的內容"},
    )
    assert missing_contact.status_code == 400

    missing_content = client.post(
        "/api/public-feedback",
        json={"contactEmail": "visitor@example.com", "content": "短"},
    )
    assert missing_content.status_code == 400


def test_admin_can_delete_public_feedback(client, db_session, monkeypatch):
    monkeypatch.setattr(public_router, "send_public_feedback_notification", lambda payload: None)
    created = client.post(
        "/api/public-feedback",
        json={
            "contactName": "待刪除回報",
            "content": "這筆資料用來測試刪除功能。",
        },
    )
    assert created.status_code == 200
    feedback_id = created.json()["feedbackId"]

    forbidden = client.delete(
        f"/api/admin/public-feedback/{feedback_id}",
        headers={"X-User-ID": "not-an-admin"},
    )
    assert forbidden.status_code == 403

    deleted = client.delete(
        f"/api/admin/public-feedback/{feedback_id}",
        headers={"X-User-ID": "admin-owner"},
    )
    assert deleted.status_code == 200
    assert deleted.json() == {"success": True}
    assert db_session.query(PublicFeedback).filter(PublicFeedback.id == feedback_id).one_or_none() is None
