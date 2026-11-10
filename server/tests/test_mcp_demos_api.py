import models


def test_local_mcp_demo_routes_are_scoped_and_reuse_admin_workflow(client, db_session, monkeypatch):
    monkeypatch.setenv("MCP_LOCAL_API_KEY", "test-local-demo-key-1234567890123456")
    monkeypatch.setenv("MCP_OWNER_ID", "admin-owner")
    headers = {"X-MCP-Key": "test-local-demo-key-1234567890123456"}

    db_session.add(models.ExternalPublicScript(
        id="external-demo-target",
        sourceUrl="https://example.com/script",
        remoteTitle="外部台本",
        status="published",
    ))
    db_session.add(models.PublicDemoSubmission(
        id="pending-demo",
        scriptType="external",
        externalScriptId="external-demo-target",
        scriptTitle="外部台本",
        scriptUrl="https://example.com/script",
        demoName="待審 Demo",
        demoUrl="https://example.com/pending-audio",
        status="pending",
        createdAt=1,
    ))
    db_session.commit()

    assert client.get("/api/admin/mcp/demos/targets").status_code == 401
    assert client.get("/api/admin/mcp/demos/targets", headers={"X-MCP-Key": "wrong"}).status_code == 401
    assert client.get("/api/admin/all-demos", headers=headers).status_code == 401
    assert client.post("/api/admin/mcp/demos/voice-actors", json={"displayName": "測試聲演"}).status_code == 401

    actor = client.post("/api/admin/mcp/demos/voice-actors", headers=headers, json={"displayName": "測試聲演"})
    assert actor.status_code == 200
    assert client.post("/api/admin/mcp/demos/voice-actors", headers=headers, json={"displayName": "測試聲演"}).json()["id"] == actor.json()["id"]
    assert any(item["id"] == actor.json()["id"] for item in client.get("/api/admin/mcp/demos/voice-actors", headers=headers).json())

    targets = client.get("/api/admin/mcp/demos/targets", headers=headers)
    assert targets.status_code == 200
    assert any(item["id"] == "external-demo-target" for item in targets.json())

    created = client.post("/api/admin/mcp/demos", headers=headers, json={
        "sourceKind": "external",
        "parentId": "external-demo-target",
        "demoName": "公開 Demo",
        "demoUrl": "https://example.com/audio",
        "voiceActorIds": [actor.json()["id"]],
    })
    assert created.status_code == 200
    assert created.json()["voiceActorIds"] == [actor.json()["id"]]
    demo_id = created.json()["id"]

    listed = client.get("/api/admin/mcp/demos", headers=headers)
    assert listed.status_code == 200
    assert any(item["id"] == demo_id for item in listed.json()["items"])

    updated = client.put(
        f"/api/admin/mcp/demos/external/external-demo-target/{demo_id}",
        headers=headers,
        json={
            "sourceKind": "external", "parentId": "external-demo-target",
            "demoName": "修改後 Demo", "demoUrl": "https://example.com/audio",
        },
    )
    assert updated.status_code == 200
    assert updated.json()["demoName"] == "修改後 Demo"

    submissions = client.get("/api/admin/mcp/demos/submissions", headers=headers)
    assert submissions.status_code == 200
    assert submissions.json()["total"] == 1

    reviewed = client.patch(
        "/api/admin/mcp/demos/submissions/pending-demo/status",
        headers=headers,
        json={"status": "approved"},
    )
    assert reviewed.status_code == 200
    assert reviewed.json()["status"] == "approved"


def test_local_mcp_demo_routes_require_configured_admin_owner(client, monkeypatch):
    monkeypatch.setenv("MCP_LOCAL_API_KEY", "test-local-demo-key-1234567890123456")
    monkeypatch.setenv("MCP_OWNER_ID", "non-admin")
    response = client.get("/api/admin/mcp/demos", headers={"X-MCP-Key": "test-local-demo-key-1234567890123456"})
    assert response.status_code == 403
