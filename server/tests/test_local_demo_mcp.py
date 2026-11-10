from mcp_server import server as local_mcp


def test_add_demo_previews_before_writing(monkeypatch):
    calls = []

    def fake_request(method, path, payload=None):
        calls.append((method, path, payload))
        if path == "/admin/mcp/demos/targets":
            return [{"id": "script-1", "sourceKind": "external", "title": "台本"}]
        if method == "POST":
            return {"id": "demo-1", "sourceKind": "external", "parentId": "script-1", "demoName": "試聽", "demoUrl": "https://example.com/audio", "status": "approved"}
        raise AssertionError(path)

    monkeypatch.setattr(local_mcp, "_request", fake_request)
    preview = local_mcp.add_demo("external", "script-1", "https://example.com/audio", demo_name="試聽")
    assert preview["status"] == "confirmation_required"
    assert all(method == "GET" for method, _, _ in calls)

    created = local_mcp.add_demo("external", "script-1", "https://example.com/audio", demo_name="試聽", confirm=True)
    assert created["status"] == "added"
    assert calls[-1][0:2] == ("POST", "/admin/mcp/demos")


def test_submit_demo_for_review_checks_rights_before_post(monkeypatch):
    calls = []

    def fake_request(method, path, payload=None):
        calls.append((method, path, payload))
        if path == "/admin/mcp/demos/targets":
            return [{"id": "script-1", "sourceKind": "external", "title": "台本"}]
        if path == "/public-demo-submissions":
            return {"submissionId": "submitted-1"}
        raise AssertionError(path)

    monkeypatch.setattr(local_mcp, "_request", fake_request)
    preview = local_mcp.submit_demo_for_review(
        "external", "script-1", "https://example.com/audio",
        manual_voice_actors=[{"name": "聲演 A", "socialUrl": "https://example.com/actor"}],
    )
    assert preview["status"] == "confirmation_required"
    assert all(method == "GET" for method, _, _ in calls)

    try:
        local_mcp.submit_demo_for_review(
            "external", "script-1", "https://example.com/audio",
            manual_voice_actors=[{"name": "聲演 A"}], confirm=True,
        )
        raise AssertionError("rights check should have failed")
    except ValueError:
        pass
    assert all(method == "GET" for method, _, _ in calls)

    result = local_mcp.submit_demo_for_review(
        "external", "script-1", "https://example.com/audio",
        manual_voice_actors=[{"name": "聲演 A"}],
        confirm_public_rights=True, confirm_voice_actor_profiles=True, confirm=True,
    )
    assert result["submissionId"] == "submitted-1"
    assert calls[-1][0:2] == ("POST", "/public-demo-submissions")


def test_review_demo_submission_previews_before_writing(monkeypatch):
    calls = []

    def fake_request(method, path, payload=None):
        calls.append((method, path, payload))
        if path.startswith("/admin/mcp/demos/submissions?"):
            return {"total": 1, "items": [{"id": "submission-1", "demoUrl": "https://example.com/audio", "status": "pending"}]}
        if method == "PATCH":
            return {"id": "submission-1", "demoUrl": "https://example.com/audio", "status": "approved"}
        raise AssertionError(path)

    monkeypatch.setattr(local_mcp, "_request", fake_request)
    preview = local_mcp.review_demo_submission("submission-1", "approved")
    assert preview["status"] == "confirmation_required"
    assert all(method == "GET" for method, _, _ in calls)

    result = local_mcp.review_demo_submission("submission-1", "approved", confirm=True)
    assert result["status"] == "reviewed"
    assert calls[-1][0:2] == ("PATCH", "/admin/mcp/demos/submissions/submission-1/status")
