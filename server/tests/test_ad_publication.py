import json
from utils import normalize_homepage_banner_value, public_banner_value

ADMIN = {"X-User-ID": "admin-owner"}
AD = {"placement": "audio-works", "title": "Campaign", "link": "https://example.com/work", "imageUrl": "/media/owner/banner.webp", "startDate": "2026-11-01", "endDate": "2099-11-30"}


def test_legacy_schedule_and_placement():
    value = normalize_homepage_banner_value(json.dumps({"items": [
        {"id": "legacy", "title": "Legacy", "imageCrop": {"zoom": 2}},
        {"id": "audio", "title": "Audio", "placement": "audio-works"},
        {"id": "future", "title": "Future", "startDate": "2026-11-17"},
        {"id": "today", "title": "Today", "endDate": "2026-11-16"},
        {"id": "expired", "title": "Expired", "endDate": "2026-11-15"},
    ]}))
    result = public_banner_value(value, "homepage", today="2026-11-16")
    assert [item["id"] for item in result["items"]] == ["legacy", "today"]
    assert result["items"][0]["imageCrop"] == {"zoom": 2}
    assert len(value["items"]) == 5  # Filtering never mutates stored settings.


def test_application_explicit_publication_and_duplicate_protection(client):
    response = client.post("/api/public-feedback", json={"kind": "ad_application", "contactName": "Private applicant", "contactEmail": "private@example.com", "adApplication": AD})
    assert response.status_code == 200, response.text
    feedback_id = response.json()["feedbackId"]
    path = f"/api/admin/public-feedback/{feedback_id}"
    reviewed = client.patch(path + "/status", json={"status": "reviewed"}, headers=ADMIN)
    assert reviewed.status_code == 200
    assert client.get("/api/public-bundle?sections=audioWorkBanner").json()["audioWorkBanner"]["items"] == []
    denied = client.post(path + "/publish-ad", json=AD, headers={"X-User-ID": "normal-user"})
    assert denied.status_code == 403
    published = client.post(path + "/publish-ad", json=AD, headers=ADMIN)
    assert published.status_code == 200, published.text
    public = client.get("/api/public-bundle?sections=audioWorkBanner")
    assert public.status_code == 200
    assert public.json()["audioWorkBanner"]["items"][0]["id"] == f"ad-{feedback_id}"
    assert "private@example.com" not in public.text
    assert "Private applicant" not in public.text
    assert client.get("/api/admin/homepage-banner", headers=ADMIN).json()["items"] == []
    assert client.get("/api/admin/demo-banner", headers=ADMIN).json()["items"] == []
    assert client.post(path + "/publish-ad", json={**AD, "placement": "homepage"}, headers=ADMIN).status_code == 409
    # Marker survives a manual removal and a status change.
    client.put("/api/admin/audio-work-banner", json={"items": []}, headers=ADMIN)
    client.patch(path + "/status", json={"status": "new"}, headers=ADMIN)
    assert client.post(path + "/publish-ad", json=AD, headers=ADMIN).status_code == 409


def test_application_validation(client):
    for patch in [{"link": "javascript:alert(1)"}, {"imageUrl": "//evil.example/a.png"}, {"endDate": "2026-01-01"}, {"startDate": "2026-02-30"}, {"placement": "unknown"}]:
        result = client.post("/api/public-feedback", json={"kind": "ad_application", "contactName": "Test", "adApplication": {**AD, **patch}})
        assert result.status_code == 422, result.text


def test_audio_banner_schedule_admin_round_trip_and_public_filter(client):
    items = [{"id": "future", "title": "Future", "startDate": "2099-01-01", "imageCrop": {"zoom": 3}}, {"id": "legacy", "title": "Legacy"}]
    saved = client.put("/api/admin/audio-work-banner", json={"items": items}, headers=ADMIN)
    assert saved.status_code == 200, saved.text
    assert saved.json()["items"][0]["imageCrop"] == {"zoom": 3}
    assert len(client.get("/api/admin/audio-work-banner", headers=ADMIN).json()["items"]) == 2
    result = client.get("/api/public-bundle?sections=audioWorkBanner")
    assert [item["id"] for item in result.json()["audioWorkBanner"]["items"]] == ["legacy"]
    assert result.headers["cache-control"] == "no-store"
