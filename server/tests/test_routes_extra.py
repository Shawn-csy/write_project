import main
import models

def _create_user(db, user_id):
    user = models.User(id=user_id, displayName=user_id)
    db.add(user)
    db.commit()
    return user


def test_public_themes_route(client):
    headers = {"X-User-ID": "theme-user"}

    res1 = client.post("/api/themes", json={"name": "Public Theme", "configs": "[]", "isPublic": True}, headers=headers)
    assert res1.status_code == 200
    res2 = client.post("/api/themes", json={"name": "Private Theme", "configs": "[]", "isPublic": False}, headers=headers)
    assert res2.status_code == 200

    public_res = client.get("/api/themes/public")
    assert public_res.status_code == 200
    public_ids = {t["id"] for t in public_res.json()}
    assert res1.json()["id"] in public_ids
    assert res2.json()["id"] not in public_ids


def test_organization_routes(client, db_session):
    owner_id = "org-owner"
    member_id = "org-member"
    new_owner_id = "org-new-owner"
    _create_user(db_session, owner_id)
    _create_user(db_session, member_id)
    _create_user(db_session, new_owner_id)

    headers = {"X-User-ID": owner_id}

    create_res = client.post("/api/organizations", json={"name": "Org One"}, headers=headers)
    assert create_res.status_code == 200
    org_id = create_res.json()["id"]

    update_res = client.put(f"/api/organizations/{org_id}", json={"name": "Org One Updated"}, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "Org One Updated"

    add_res = client.post(f"/api/organizations/{org_id}/members", json={"userId": member_id}, headers=headers)
    assert add_res.status_code == 200

    remove_res = client.delete(f"/api/organizations/{org_id}/members/{member_id}", headers=headers)
    assert remove_res.status_code == 200

    transfer_res = client.post(
        f"/api/organizations/{org_id}/transfer",
        json={"newOwnerId": new_owner_id, "transferScripts": True},
        headers=headers,
    )
    assert transfer_res.status_code == 200

    org = db_session.query(models.Organization).filter(models.Organization.id == org_id).first()
    assert org.ownerId == new_owner_id


def test_persona_and_public_routes(client, db_session):
    owner_id = "persona-owner"
    _create_user(db_session, owner_id)
    headers = {"X-User-ID": owner_id}

    org_res = client.post("/api/organizations", json={"name": "Org P"}, headers=headers)
    assert org_res.status_code == 200
    org_id = org_res.json()["id"]

    persona_res = client.post(
        "/api/personas",
        json={"displayName": "Persona A", "organizationIds": [org_id], "tags": ["t1"]},
        headers=headers,
    )
    assert persona_res.status_code == 200
    persona_id = persona_res.json()["id"]

    script_res = client.post(
        "/api/scripts",
        json={"title": "Public Script", "isPublic": True},
        headers=headers,
    )
    assert script_res.status_code == 200
    script_id = script_res.json()["id"]

    update_res = client.put(
        f"/api/scripts/{script_id}",
        json={"personaId": persona_id, "organizationId": org_id, "isPublic": True},
        headers=headers,
    )
    assert update_res.status_code == 200

    public_personas = client.get("/api/public-personas")
    assert public_personas.status_code == 200
    ids = {p["id"] for p in public_personas.json()}
    assert persona_id in ids

    public_persona = client.get(f"/api/public-personas/{persona_id}")
    assert public_persona.status_code == 200
    data = public_persona.json()
    assert data["id"] == persona_id
    assert any(o["id"] == org_id for o in data.get("organizations", []))

    public_orgs = client.get("/api/public-organizations")
    assert public_orgs.status_code == 200
    org_ids = {o["id"] for o in public_orgs.json()}
    assert org_id in org_ids

    public_org = client.get(f"/api/public-organizations/{org_id}")
    assert public_org.status_code == 200
    org_data = public_org.json()
    assert org_data["id"] == org_id
    assert any(m["id"] == persona_id for m in org_data.get("members", []))


def test_script_transfer_route(client, db_session):
    owner_id = "script-owner"
    new_owner_id = "script-new-owner"
    _create_user(db_session, owner_id)
    _create_user(db_session, new_owner_id)

    headers = {"X-User-ID": owner_id}
    create_res = client.post("/api/scripts", json={"title": "Transfer Me"}, headers=headers)
    assert create_res.status_code == 200
    script_id = create_res.json()["id"]

    transfer_res = client.post(
        f"/api/scripts/{script_id}/transfer",
        json={"newOwnerId": new_owner_id},
        headers=headers,
    )
    assert transfer_res.status_code == 200

    script = db_session.query(models.Script).filter(models.Script.id == script_id).first()
    assert script.ownerId == new_owner_id


def test_theme_copy_route(client, db_session):
    owner_id = "theme-owner"
    other_id = "theme-other"
    _create_user(db_session, owner_id)
    _create_user(db_session, other_id)

    headers_owner = {"X-User-ID": owner_id}
    headers_other = {"X-User-ID": other_id}

    # Public theme can be copied by anyone
    public_res = client.post(
        "/api/themes",
        json={"name": "Public Theme", "configs": "[]", "isPublic": True},
        headers=headers_owner,
    )
    assert public_res.status_code == 200
    public_id = public_res.json()["id"]

    copy_public = client.post(f"/api/themes/{public_id}/copy", headers=headers_other)
    assert copy_public.status_code == 200
    assert copy_public.json()["name"].endswith("(Copy)")
    assert copy_public.json()["ownerId"] == other_id

    # Private theme cannot be copied by other users
    private_res = client.post(
        "/api/themes",
        json={"name": "Private Theme", "configs": "[]", "isPublic": False},
        headers=headers_owner,
    )
    assert private_res.status_code == 200
    private_id = private_res.json()["id"]

    copy_private = client.post(f"/api/themes/{private_id}/copy", headers=headers_other)
    assert copy_private.status_code == 403


def test_public_script_visibility_route(client, db_session):
    owner_id = "public-owner"
    _create_user(db_session, owner_id)
    headers = {"X-User-ID": owner_id}

    folder_res = client.post(
        "/api/scripts",
        json={"title": "PublicFolder", "type": "folder", "isPublic": True, "folder": "/"},
        headers=headers,
    )
    assert folder_res.status_code == 200

    child_res = client.post(
        "/api/scripts",
        json={"title": "Child", "type": "script", "isPublic": False, "folder": "/PublicFolder"},
        headers=headers,
    )
    assert child_res.status_code == 200
    child_id = child_res.json()["id"]

    private_res = client.post(
        "/api/scripts",
        json={"title": "PrivateRoot", "type": "script", "isPublic": False, "folder": "/"},
        headers=headers,
    )
    assert private_res.status_code == 200
    private_id = private_res.json()["id"]

    # Inherit public visibility from folder
    public_child = client.get(f"/api/public-scripts/{child_id}")
    assert public_child.status_code == 200

    # Private root should 404
    private_root = client.get(f"/api/public-scripts/{private_id}")
    assert private_root.status_code == 404


def test_admin_user_search_and_engagement_routes(client, db_session):
    owner_id = "admin-owner"
    _create_user(db_session, owner_id)
    headers = {"X-User-ID": owner_id}

    user = models.User(id="u-search", handle="handle123", displayName="Search Name")
    db_session.add(user)
    db_session.commit()

    search_res = client.get("/api/admin/users?q=handle123", headers=headers)
    assert search_res.status_code == 200
    ids = {u["id"] for u in search_res.json()}
    assert "u-search" in ids

    script_res = client.post("/api/scripts", json={"title": "Engage"}, headers=headers)
    assert script_res.status_code == 200
    script_id = script_res.json()["id"]

    view_res = client.post(f"/api/scripts/{script_id}/view")
    assert view_res.status_code == 200

    like_res = client.post(f"/api/scripts/{script_id}/like", headers=headers)
    assert like_res.status_code == 200
    assert like_res.json()["liked"] is True

    unlike_res = client.post(f"/api/scripts/{script_id}/like", headers=headers)
    assert unlike_res.status_code == 200
    assert unlike_res.json()["liked"] is False

    script = db_session.query(models.Script).filter(models.Script.id == script_id).first()
    assert script.views == 1
    assert script.likes == 0


def test_public_scripts_filters(client, db_session):
    owner_id = "filter-owner"
    _create_user(db_session, owner_id)
    headers = {"X-User-ID": owner_id}

    org_res = client.post("/api/organizations", json={"name": "Filter Org"}, headers=headers)
    assert org_res.status_code == 200
    org_id = org_res.json()["id"]

    persona_res = client.post("/api/personas", json={"displayName": "Filter Persona"}, headers=headers)
    assert persona_res.status_code == 200
    persona_id = persona_res.json()["id"]

    s1 = client.post(
        "/api/scripts",
        json={"title": "Org Script", "isPublic": True},
        headers=headers,
    )
    assert s1.status_code == 200
    s1_id = s1.json()["id"]
    client.put(
        f"/api/scripts/{s1_id}",
        json={"organizationId": org_id, "isPublic": True},
        headers=headers,
    )

    s2 = client.post(
        "/api/scripts",
        json={"title": "Persona Script", "isPublic": True},
        headers=headers,
    )
    assert s2.status_code == 200
    s2_id = s2.json()["id"]
    client.put(
        f"/api/scripts/{s2_id}",
        json={"personaId": persona_id, "isPublic": True},
        headers=headers,
    )

    by_org = client.get(f"/api/public-scripts?organizationId={org_id}")
    assert by_org.status_code == 200
    org_titles = {s["title"] for s in by_org.json()}
    assert "Org Script" in org_titles
    assert "Persona Script" not in org_titles

    by_persona = client.get(f"/api/public-scripts?personaId={persona_id}")
    assert by_persona.status_code == 200
    persona_titles = {s["title"] for s in by_persona.json()}
    assert "Persona Script" in persona_titles
    assert "Org Script" not in persona_titles


def test_public_personas_and_orgs_empty(client):
    res_personas = client.get("/api/public-personas")
    assert res_personas.status_code == 200
    assert res_personas.json() == []

    res_orgs = client.get("/api/public-organizations")
    assert res_orgs.status_code == 200
    assert res_orgs.json() == []

    res_bundle = client.get("/api/public-bundle")
    assert res_bundle.status_code == 200
    payload = res_bundle.json()
    assert payload.get("scripts") == []
    assert payload.get("personas") == []
    assert payload.get("organizations") == []


def test_public_script_missing_returns_404(client):
    res = client.get("/api/public-scripts/missing-script-id")
    assert res.status_code == 404


def test_missing_user_header_returns_401(client):
    res = client.get("/api/scripts")
    assert res.status_code == 401


def test_read_script_seo_injects_meta(client, db_session, tmp_path, monkeypatch):
    owner_id = "seo-owner"
    _create_user(db_session, owner_id)
    headers = {"X-User-ID": owner_id}

    script_res = client.post(
        "/api/scripts",
        json={"title": "SEO Title", "content": "Hello world", "isPublic": True},
        headers=headers,
    )
    assert script_res.status_code == 200
    script_id = script_res.json()["id"]

    html = (
        "<html><head>"
        "<title>Screenplay Reader</title>"
        "<meta property=\"og:title\" content=\"Screenplay Reader\" />"
        "<meta property=\"og:description\" content=\"線上閱讀、瀏覽與分享 Fountain 劇本的閱讀器。\" />"
        "<meta name=\"description\" content=\"線上閱讀、瀏覽與分享 Fountain 劇本的閱讀器。\" />"
        "</head><body>App</body></html>"
    )
    index_path = tmp_path / "index.html"
    index_path.write_text(html, encoding="utf-8")

    import routers.seo as seo
    monkeypatch.setattr(seo, "INDEX_PATH", str(index_path))

    res = client.get(f"/read/{script_id}")
    assert res.status_code == 200
    body = res.text
    assert "<title>SEO Title｜Screenplay Reader</title>" in body
    assert "og:title" in body
    assert "SEO Title" in body
