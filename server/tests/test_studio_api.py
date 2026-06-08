def _create_script(client, headers, title, **extra):
    payload = {"title": title, "type": "script", "folder": "/", **extra}
    res = client.post("/api/scripts", json=payload, headers=headers)
    assert res.status_code == 200
    return res.json()


def test_studio_bootstrap_uses_dedicated_contract(client):
    headers = {"X-User-ID": "u1"}
    _create_script(
        client,
        headers,
        "Needs Metadata",
        content="INT. ROOM - DAY\n" * 50,
        customMetadata=[{"key": "PublishAs", "value": "persona:p1", "type": "text"}],
    )
    _create_script(client, headers, "Published", isPublic=True, status="Public")

    res = client.get("/api/studio/bootstrap?limit=1", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert set(data.keys()) >= {"scripts", "personas", "organizations", "tags", "series", "myInvites"}
    assert data["scripts"]["limit"] == 1
    assert data["scripts"]["total"] == 2
    assert data["scripts"]["nextOffset"] == 1
    assert data["scripts"]["counts"]["all"] == 2
    assert data["scripts"]["counts"]["published"] == 1

    item = data["scripts"]["items"][0]
    assert "content" not in item
    assert "customMetadata" not in item
    assert "persona" not in item
    assert "organization" not in item
    assert item["contentLength"] == 0


def test_studio_scripts_paginates_and_filters(client):
    headers = {"X-User-ID": "u1"}
    first = _create_script(client, headers, "Alpha")
    second = _create_script(client, headers, "Beta Published", isPublic=True, status="Public")

    page = client.get("/api/studio/scripts?limit=1&offset=0&sort=title_asc", headers=headers)
    assert page.status_code == 200
    body = page.json()
    assert [item["id"] for item in body["items"]] == [first["id"]]
    assert body["nextOffset"] == 1

    filtered = client.get("/api/studio/scripts?status=published", headers=headers)
    assert filtered.status_code == 200
    filtered_body = filtered.json()
    assert filtered_body["total"] == 1
    assert [item["id"] for item in filtered_body["items"]] == [second["id"]]


def test_studio_readiness_is_persisted_and_filterable(client):
    headers = {"X-User-ID": "u1"}
    persona = client.post(
        "/api/personas",
        json={
            "displayName": "Licensed Persona",
            "defaultLicenseCommercial": "allow",
            "defaultLicenseDerivative": "allow",
            "defaultLicenseNotify": "not_required",
        },
        headers=headers,
    )
    assert persona.status_code == 200
    created = _create_script(client, headers, "Ready Candidate", personaId=persona.json()["id"])

    first_page = client.get("/api/studio/scripts?status=ready", headers=headers)
    assert first_page.status_code == 200
    assert first_page.json()["total"] == 0

    audience = client.post("/api/tags", json={"name": "全年齡", "color": "blue"}, headers=headers)
    rating = client.post("/api/tags", json={"name": "普遍級", "color": "green"}, headers=headers)
    assert audience.status_code == 200
    assert rating.status_code == 200
    assert client.post(f"/api/scripts/{created['id']}/tags", json={"tagId": audience.json()["id"]}, headers=headers).status_code == 200
    assert client.post(f"/api/scripts/{created['id']}/tags", json={"tagId": rating.json()["id"]}, headers=headers).status_code == 200

    ready_page = client.get("/api/studio/scripts?status=ready", headers=headers)
    assert ready_page.status_code == 200
    body = ready_page.json()
    assert body["total"] == 1
    assert body["counts"]["ready"] == 1
    assert body["items"][0]["id"] == created["id"]
    assert body["items"][0]["publishReadiness"] == "ready"


def test_studio_publish_context_loads_single_script(client):
    headers = {"X-User-ID": "u1"}
    created = _create_script(
        client,
        headers,
        "Context Target",
        content="Should not be returned",
        customMetadata=[{"key": "Series", "value": "Legacy Series", "type": "text"}],
    )

    res = client.get(f"/api/studio/scripts/{created['id']}/publish-context", headers=headers)
    assert res.status_code == 200
    item = res.json()
    assert item["id"] == created["id"]
    assert item["metadataSeriesName"] == "Legacy Series"
    assert "content" not in item
    assert "customMetadata" not in item

    not_owner = client.get(f"/api/studio/scripts/{created['id']}/publish-context", headers={"X-User-ID": "u2"})
    assert not_owner.status_code == 404
