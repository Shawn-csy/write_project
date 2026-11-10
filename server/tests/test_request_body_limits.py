"""Public write payloads are bounded before request parsing or database work."""

import pytest


@pytest.mark.parametrize("method,path,limit", [
    ("POST", "/api/public-terms-acceptances", 4 * 1024),
    ("POST", "/api/public-feedback", 32 * 1024),
    ("POST", "/api/public-demo-submissions", 32 * 1024),
    ("POST", "/api/public-audio-work-submissions", 16 * 1024),
    ("POST", "/api/external-author-profile-submissions", 128 * 1024),
    ("POST", "/api/voice-actor-profile-submissions", 128 * 1024),
    ("POST", "/api/voice-actor-claims", 8 * 1024),
    ("POST", "/api/my-demo-submissions", 32 * 1024),
    ("PUT", "/api/my-demo-submissions/submission-1", 32 * 1024),
    ("POST", "/api/public-scripts/script-1/like", 4 * 1024),
    ("POST", "/api/public-external-scripts/work-1/view", 4 * 1024),
    ("POST", "/api/scripts/script-1/view", 4 * 1024),
])
def test_public_write_rejects_oversized_content_length(client, method, path, limit):
    response = client.request(method, path, content=b"x" * (limit + 1))
    assert response.status_code == 413


def test_public_feedback_rejects_chunked_oversized_body(client):
    response = client.post(
        "/api/public-feedback",
        content=iter([b'{"content":"', b"x" * (32 * 1024), b'"}']),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 413


def test_public_feedback_accepts_small_body(client):
    response = client.post(
        "/api/public-feedback",
        json={"kind": "bug", "contactEmail": "test@example.com", "content": "頁面顯示異常"},
    )
    assert response.status_code == 200


def test_private_script_endpoint_is_not_subject_to_public_form_limit(client):
    response = client.post("/api/scripts", content=b"x" * (128 * 1024 + 1))
    assert response.status_code != 413


@pytest.mark.parametrize("method,path", [
    ("POST", "/api/personas"),
    ("PUT", "/api/orgs/org-1"),
    ("PATCH", "/api/admin/public-feedback/feedback-1/status"),
    ("POST", "/api/future-json-route"),
])
def test_other_api_writes_have_a_default_limit(client, method, path):
    response = client.request(method, path, content=b"x" * (1024 * 1024 + 1))
    assert response.status_code == 413


def test_default_limit_counts_streamed_body(client):
    response = client.post(
        "/api/personas",
        content=iter([b"x" * (512 * 1024), b"x" * (512 * 1024 + 1)]),
    )
    assert response.status_code == 413


@pytest.mark.parametrize("method,path", [
    ("POST", "/api/scripts"),
    ("PUT", "/api/scripts/script-1"),
    ("POST", "/api/export/docx"),
    ("POST", "/api/media/upload"),
    ("POST", "/api/admin/external-public-scripts"),
    ("PUT", "/api/admin/external-public-scripts/work-1"),
])
def test_large_content_routes_keep_their_existing_allowance(client, method, path):
    response = client.request(method, path, content=b"x" * (1024 * 1024 + 1))
    assert response.status_code != 413


def test_long_script_content_can_still_be_saved(client):
    content = "劇本內容" * 150_000
    response = client.post(
        "/api/scripts",
        json={"title": "Long script", "content": content},
        headers={"X-User-ID": "body-limit-author"},
    )
    assert response.status_code == 200
    assert response.json()["content"] == content
