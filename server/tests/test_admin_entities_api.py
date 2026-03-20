import time

from models import Organization, Persona, Script, Tag, User


def _seed_user(db_session, user_id: str, email: str):
    now = int(time.time() * 1000)
    row = User(
        id=user_id,
        handle=user_id,
        email=email,
        createdAt=now,
        lastLogin=now,
    )
    db_session.add(row)
    db_session.commit()
    return row


def test_admin_list_all_orgs_personas_scripts(client, db_session):
    now = int(time.time() * 1000)
    _seed_user(db_session, "owner-a", "owner-a@example.com")

    org = Organization(
        id="org-a",
        name="Org Alpha",
        description="d",
        ownerId="owner-a",
        tags='["team"]',
        createdAt=now,
        updatedAt=now,
    )
    db_session.add(org)

    persona = Persona(
        id="persona-a",
        ownerId="owner-a",
        displayName="Persona Alpha",
        tags='["tag1"]',
        links='[{"label":"site","url":"https://example.com"}]',
        organizationIds='["org-a"]',
        defaultLicenseSpecialTerms='["term"]',
        createdAt=now,
        updatedAt=now,
    )
    db_session.add(persona)

    script = Script(
        id="script-a",
        ownerId="owner-a",
        title="Script Alpha",
        content="hello world",
        type="script",
        folder="/",
        createdAt=now,
        lastModified=now,
        isPublic=0,
    )
    db_session.add(script)
    db_session.commit()

    org_res = client.get("/api/admin/all-organizations?q=alpha", headers={"X-User-ID": "admin-owner"})
    assert org_res.status_code == 200
    assert len(org_res.json()) == 1
    assert org_res.json()[0]["id"] == "org-a"

    persona_res = client.get("/api/admin/all-personas?q=persona alpha", headers={"X-User-ID": "admin-owner"})
    assert persona_res.status_code == 200
    assert len(persona_res.json()) == 1
    payload = persona_res.json()[0]
    assert payload["id"] == "persona-a"
    assert isinstance(payload["tags"], list)
    assert isinstance(payload["links"], list)
    assert isinstance(payload["organizationIds"], list)
    assert isinstance(payload["defaultLicenseSpecialTerms"], list)

    script_res = client.get("/api/admin/all-scripts?q=script alpha", headers={"X-User-ID": "admin-owner"})
    assert script_res.status_code == 200
    assert len(script_res.json()) == 1
    assert script_res.json()[0]["id"] == "script-a"
    assert script_res.json()[0]["contentLength"] == len("hello world")


def test_admin_delete_org_persona_script_and_not_found(client, db_session):
    now = int(time.time() * 1000)
    _seed_user(db_session, "owner-b", "owner-b@example.com")

    db_session.add(
        Organization(
            id="org-b",
            name="Org Beta",
            ownerId="owner-b",
            createdAt=now,
            updatedAt=now,
        )
    )
    db_session.add(
        Persona(
            id="persona-b",
            ownerId="owner-b",
            displayName="Persona Beta",
            createdAt=now,
            updatedAt=now,
        )
    )
    db_session.add(
        Script(
            id="script-b",
            ownerId="owner-b",
            title="Script Beta",
            content="abc",
            type="script",
            folder="/",
            createdAt=now,
            lastModified=now,
            isPublic=0,
        )
    )
    db_session.commit()

    assert client.delete("/api/admin/all-organizations/org-b", headers={"X-User-ID": "admin-owner"}).status_code == 200
    assert client.delete("/api/admin/all-personas/persona-b", headers={"X-User-ID": "admin-owner"}).status_code == 200
    assert client.delete("/api/admin/all-scripts/script-b", headers={"X-User-ID": "admin-owner"}).status_code == 200

    assert client.delete("/api/admin/all-organizations/org-b", headers={"X-User-ID": "admin-owner"}).status_code == 404
    assert client.delete("/api/admin/all-personas/persona-b", headers={"X-User-ID": "admin-owner"}).status_code == 404
    assert client.delete("/api/admin/all-scripts/script-b", headers={"X-User-ID": "admin-owner"}).status_code == 404


def test_admin_can_update_script_metadata_with_tags(client, db_session):
    now = int(time.time() * 1000)
    _seed_user(db_session, "owner-d", "owner-d@example.com")
    script = Script(
        id="script-d",
        ownerId="owner-d",
        title="Old Title",
        content="SECRET",
        type="script",
        folder="/",
        createdAt=now,
        lastModified=now,
        isPublic=0,
        status="Private",
        customMetadata=[],
    )
    db_session.add(script)
    tag = Tag(ownerId="owner-d", name="女性向", color="bg-gray-500")
    db_session.add(tag)
    db_session.commit()
    db_session.refresh(tag)

    res = client.put(
        "/api/admin/all-scripts/script-d/metadata",
        headers={"X-User-ID": "admin-owner"},
        json={
            "title": "New Title",
            "status": "Public",
            "customMetadata": [{"key": "Synopsis", "value": "hello"}],
            "tags": [tag.id],
        },
    )
    assert res.status_code == 200
    body = res.json()
    assert body["id"] == "script-d"
    assert body["title"] == "New Title"
    assert body["status"] == "Public"
    assert "content" not in body
    assert isinstance(body.get("tags"), list)
    assert len(body["tags"]) == 1
    assert body["tags"][0]["id"] == tag.id

    get_res = client.get("/api/admin/all-scripts/script-d/metadata", headers={"X-User-ID": "admin-owner"})
    assert get_res.status_code == 200
    get_body = get_res.json()
    assert get_body["id"] == "script-d"
    assert get_body["title"] == "New Title"
    assert "content" not in get_body

    denied = client.get("/api/admin/all-scripts/script-d/metadata", headers={"X-User-ID": "owner-d"})
    assert denied.status_code == 403
