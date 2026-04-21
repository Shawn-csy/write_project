def test_scripts_list_includes_persona_id(client):
    headers = {"X-User-ID": "u1"}

    persona_res = client.post("/api/personas", json={"displayName": "作者"}, headers=headers)
    assert persona_res.status_code == 200
    persona_id = persona_res.json()["id"]

    script_res = client.post(
        "/api/scripts",
        json={"title": "附授權劇本", "type": "script", "folder": "/", "personaId": persona_id},
        headers=headers,
    )
    assert script_res.status_code == 200

    list_res = client.get("/api/scripts", headers=headers)
    assert list_res.status_code == 200
    scripts = list_res.json()

    target = next((s for s in scripts if s["title"] == "附授權劇本"), None)
    assert target is not None, "找不到剛建立的劇本"
    assert "personaId" in target, "ScriptSummary 應包含 personaId 欄位"
    assert target["personaId"] == persona_id


def test_scripts_list_persona_id_is_none_when_not_set(client):
    headers = {"X-User-ID": "u1"}

    script_res = client.post(
        "/api/scripts",
        json={"title": "無 persona 劇本", "type": "script", "folder": "/"},
        headers=headers,
    )
    assert script_res.status_code == 200

    list_res = client.get("/api/scripts", headers=headers)
    scripts = list_res.json()

    target = next((s for s in scripts if s["title"] == "無 persona 劇本"), None)
    assert target is not None
    assert "personaId" in target
    assert target["personaId"] is None


def test_scripts_list_license_fields_synced_from_custom_metadata(client):
    headers = {"X-User-ID": "u1"}

    script_res = client.post(
        "/api/scripts",
        json={
            "title": "授權劇本",
            "type": "script",
            "folder": "/",
            "customMetadata": [
                {"key": "LicenseCommercial", "value": "allow", "type": "text"},
                {"key": "LicenseDerivative", "value": "disallow", "type": "text"},
                {"key": "LicenseNotify", "value": "required", "type": "text"},
            ],
        },
        headers=headers,
    )
    assert script_res.status_code == 200

    list_res = client.get("/api/scripts", headers=headers)
    scripts = list_res.json()

    target = next((s for s in scripts if s["title"] == "授權劇本"), None)
    assert target is not None
    assert target["licenseCommercial"] == "allow"
    assert target["licenseDerivative"] == "disallow"
    assert target["licenseNotify"] == "required"


def test_admin_all_scripts_includes_persona_id(client):
    admin_headers = {"X-User-ID": "admin-owner"}
    user_headers = {"X-User-ID": "u1"}

    persona_res = client.post(
        "/api/personas", json={"displayName": "Admin Persona"}, headers=user_headers
    )
    assert persona_res.status_code == 200
    persona_id = persona_res.json()["id"]

    client.post(
        "/api/scripts",
        json={"title": "Admin Test Script", "type": "script", "folder": "/", "personaId": persona_id},
        headers=user_headers,
    )

    list_res = client.get("/api/admin/all-scripts", headers=admin_headers)
    assert list_res.status_code == 200
    scripts = list_res.json()

    target = next((s for s in scripts if s["title"] == "Admin Test Script"), None)
    assert target is not None
    assert "personaId" in target
    assert target["personaId"] == persona_id
