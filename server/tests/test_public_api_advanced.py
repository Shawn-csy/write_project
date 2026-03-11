import pytest
import time
from models import User, Script, Persona, Organization, OrganizationMembership, PersonaOrganizationMembership

def setup_data(db_session):
    now = int(time.time() * 1000)
    # User 1 (no persona, but has an organization)
    # Organization tags stored as string (JSON) to test decoding
    org = Organization(id="org-public-1", name="Public Org", tags='["studio"]', ownerId="user-no-persona", createdAt=now, updatedAt=now)
    user1 = User(id="user-no-persona", handle="nopersona", organizationId="org-public-1")
    
    # User 2 (has persona) with broken JSON in db
    user2 = User(id="user-has-persona", handle="haspersona")
    persona = Persona(id="persona-public-1", ownerId="user-has-persona", 
                      displayName="Public Author",
                      tags='["author"]', 
                      links='[{"title":"site","url":"test"}]',
                      organizationIds='["org-public-1"]',
                      defaultLicenseSpecialTerms='["term1"]',
                      createdAt=now, updatedAt=now)
                      
    persona_broken = Persona(id="persona-broken-1", ownerId="user-has-persona", 
                             displayName="Broken Author",
                             tags='invalid-json', 
                             links='invalid-json',
                             organizationIds='invalid-json',
                             defaultLicenseSpecialTerms='invalid-json',
                             createdAt=now, updatedAt=now)
                             
    # Parent/Folder inheritance scripts
    script_root_private = Script(id="script-root-private", title="priv", ownerId="user-no-persona", folder="/", isPublic=0, type="script", createdAt=now, lastModified=now)
    
    script_folder_public = Script(id="folder-public", title="pub-folder", ownerId="user-no-persona", folder="/", isPublic=1, type="folder", createdAt=now, lastModified=now)
    script_in_pub_folder = Script(id="script-in-pub", title="in-pub", ownerId="user-no-persona", folder="/pub-folder", isPublic=1, type="script", createdAt=now, lastModified=now)
    
    script_folder_private = Script(id="folder-private", title="priv-folder", ownerId="user-no-persona", folder="/", isPublic=0, type="folder", createdAt=now, lastModified=now)
    script_in_priv_folder = Script(id="script-in-priv", title="in-priv", ownerId="user-no-persona", folder="/priv-folder", isPublic=1, type="script", createdAt=now, lastModified=now) # The script itself is public, but parent is private
    script_in_priv_explicit_false = Script(id="script-in-priv-explicit-false", title="in-priv-false", ownerId="user-no-persona", folder="/priv-folder", isPublic=0, type="script", createdAt=now, lastModified=now) # Script is private, parent is private
    script_org_public = Script(
        id="script-org-public",
        title="org-public-script",
        ownerId="user-has-persona",
        personaId="persona-public-1",
        organizationId="org-public-1",
        folder="/",
        isPublic=1,
        type="script",
        createdAt=now,
        lastModified=now,
    )

    db_session.add_all([org, user1, user2, persona, persona_broken, 
                script_root_private, script_folder_public, script_in_pub_folder, 
                script_folder_private, script_in_priv_folder, script_in_priv_explicit_false, script_org_public])
    db_session.commit()

def test_get_public_persona_user_fallback(client, db_session):
    setup_data(db_session)
    # /api/public-personas/{id} should fallback to User if Persona not found
    response = client.get("/api/public-personas/user-no-persona")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "user-no-persona"
    assert len(data["organizations"]) == 1
    assert data["organizations"][0]["id"] == "org-public-1"
    assert data["organizations"][0]["tags"] == ["studio"] # DB string converted back to list

def test_get_public_persona_json_parsing(client, db_session):
    setup_data(db_session)
    response = client.get("/api/public-personas/persona-public-1")
    assert response.status_code == 200
    data = response.json()
    assert data["tags"] == ["author"]
    assert len(data["organizations"]) == 1 # Valid org link


def test_public_persona_filters_non_public_orgs(client, db_session):
    setup_data(db_session)
    now = int(time.time() * 1000)
    private_org = Organization(
        id="org-private-1",
        name="Private Org",
        tags='["secret"]',
        ownerId="user-has-persona",
        createdAt=now,
        updatedAt=now,
    )
    persona = db_session.query(Persona).filter(Persona.id == "persona-public-1").first()
    persona.organizationIds = '["org-public-1","org-private-1"]'
    db_session.add(private_org)
    db_session.commit()

    res = client.get("/api/public-personas/persona-public-1")
    assert res.status_code == 200
    payload = res.json()
    returned_org_ids = [o["id"] for o in payload.get("organizations", [])]
    assert "org-public-1" in returned_org_ids
    assert "org-private-1" not in returned_org_ids

def test_get_public_persona_invalid_json(client, db_session):
    setup_data(db_session)
    db_session.add(Script(id="pub-persona-broken-1", ownerId="user-has-persona", personaId="persona-broken-1", isPublic=1, type="script", folder="/"))
    db_session.commit()
    # Check fallback when db strings are corrupted
    response = client.get("/api/public-personas/persona-broken-1")
    assert response.status_code == 200
    data = response.json()
    assert data["tags"] == []
    assert data["organizationIds"] == []
    assert data["links"] == []

def test_get_public_personas_list_decoding(client, db_session):
    setup_data(db_session)
    # Add a public script so personas show up in the list
    db_session.add(Script(id="pub-trigger-1", ownerId="user-has-persona", personaId="persona-public-1", isPublic=1, type="script", folder="/"))
    db_session.add(Script(id="pub-trigger-2", ownerId="user-has-persona", personaId="persona-broken-1", isPublic=1, type="script", folder="/"))
    db_session.commit()
    
    response = client.get("/api/public-personas")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2

def test_public_script_folder_inheritance(client, db_session):
    setup_data(db_session)
    
    # 1. Root private script
    response = client.get("/api/public-scripts/script-root-private")
    assert response.status_code == 404
    
    # 2. Public folder script
    response = client.get("/api/public-scripts/script-in-pub")
    assert response.status_code == 200
    
    # 3. Private folder script (script marked public but folder is private)
    # This SHOULD return 200 because the script is explicitly public.
    response = client.get("/api/public-scripts/script-in-priv")
    assert response.status_code == 200
    
    # 4. Private folder script, explicitly private
    response = client.get("/api/public-scripts/script-in-priv-explicit-false")
    assert response.status_code == 404

def test_public_script_raw_folder_inheritance(client, db_session):
    setup_data(db_session)
    
    response = client.get("/api/public-scripts/script-root-private/raw")
    assert response.status_code == 404
    
    response = client.get("/api/public-scripts/script-in-pub/raw")
    assert response.status_code == 200
    
    response = client.get("/api/public-scripts/script-in-priv/raw")
    assert response.status_code == 200
    
    response = client.get("/api/public-scripts/script-in-priv-explicit-false/raw")
    assert response.status_code == 404

def test_get_public_script_json_parsing(client, db_session):
    setup_data(db_session)
    # Link script directly to persona with valid/invalid JSON
    script = Script(id="script-json-parse", title="json", ownerId="user-has-persona", personaId="persona-public-1", organizationId="org-public-1", folder="/", isPublic=1, type="script")
    db_session.add(script)
    db_session.commit()
    
    response = client.get("/api/public-scripts/script-json-parse")
    assert response.status_code == 200
    data = response.json()
    assert data["persona"]["tags"] == ["author"]
    assert data["persona"]["defaultLicenseSpecialTerms"] == ["term1"]
    assert data["organization"]["tags"] == ["studio"]

def test_list_public_org_empty_members_parsing(client, db_session):
    setup_data(db_session)
    response = client.get("/api/public-organizations/org-public-1")
    assert response.status_code == 200
    data = response.json()
    # persona-public-1 is a member
    assert len(data["members"]) == 1
    assert data["members"][0]["id"] == "persona-public-1"

    response_list = client.get("/api/public-organizations")
    assert response_list.status_code == 200
    assert len(response_list.json()) == 1
    assert response_list.json()[0]["tags"] == ["studio"]


def test_public_org_members_only_include_personas_with_public_scripts(client, db_session):
    setup_data(db_session)
    now = int(time.time() * 1000)
    p_hidden = Persona(
        id="persona-hidden-member",
        ownerId="user-has-persona",
        displayName="Hidden Member",
        organizationIds='["org-public-1"]',
        createdAt=now,
        updatedAt=now,
    )
    p_visible = Persona(
        id="persona-visible-member",
        ownerId="user-has-persona",
        displayName="Visible Member",
        organizationIds='["org-public-1"]',
        createdAt=now,
        updatedAt=now,
    )
    db_session.add_all([p_hidden, p_visible])
    db_session.add(
        Script(
            id="pub-org-member-visible-script",
            ownerId="user-has-persona",
            personaId="persona-visible-member",
            organizationId="org-public-1",
            isPublic=1,
            type="script",
            folder="/",
        )
    )
    db_session.commit()

    res = client.get("/api/public-organizations/org-public-1")
    assert res.status_code == 200
    member_ids = {m["id"] for m in res.json().get("members", [])}
    assert "persona-visible-member" in member_ids
    assert "persona-hidden-member" not in member_ids


def test_public_personas_list_includes_folder_inherited_public_visibility(client, db_session):
    setup_data(db_session)
    now = int(time.time() * 1000)
    persona = Persona(
        id="persona-inherited-public",
        ownerId="user-has-persona",
        displayName="Inherited Public Persona",
        createdAt=now,
        updatedAt=now,
    )
    folder = Script(
        id="folder-inherited-public",
        title="shared-folder",
        ownerId="user-has-persona",
        folder="/",
        isPublic=1,
        type="folder",
        createdAt=now,
        lastModified=now,
    )
    inherited_script = Script(
        id="script-inherited-public",
        title="child-in-folder",
        ownerId="user-has-persona",
        personaId="persona-inherited-public",
        folder="/shared-folder",
        isPublic=0,
        type="script",
        createdAt=now,
        lastModified=now,
    )
    db_session.add_all([persona, folder, inherited_script])
    db_session.commit()

    detail = client.get("/api/public-personas/persona-inherited-public")
    assert detail.status_code == 200

    listing = client.get("/api/public-personas")
    assert listing.status_code == 200
    ids = {row["id"] for row in listing.json()}
    assert "persona-inherited-public" in ids


def test_public_persona_uses_persona_org_membership_table(client, db_session):
    setup_data(db_session)
    now = int(time.time() * 1000)
    persona = Persona(
        id="persona-membership-1",
        ownerId="user-has-persona",
        displayName="Membership Persona",
        organizationIds="[]",
        createdAt=now,
        updatedAt=now,
    )
    membership = PersonaOrganizationMembership(
        id="pom-1",
        orgId="org-public-1",
        personaId="persona-membership-1",
        createdAt=now,
        updatedAt=now,
    )
    db_session.add(persona)
    db_session.add(membership)
    db_session.add(
        Script(
            id="pub-membership-persona-1",
            ownerId="user-has-persona",
            personaId="persona-membership-1",
            isPublic=1,
            type="script",
            folder="/",
        )
    )
    db_session.commit()

    response = client.get("/api/public-personas/persona-membership-1")
    assert response.status_code == 200
    data = response.json()
    assert data["organizationIds"] == ["org-public-1"]
    assert len(data["organizations"]) == 1
    assert data["organizations"][0]["id"] == "org-public-1"


def test_user_fallback_uses_user_org_membership_table(client, db_session):
    setup_data(db_session)
    now = int(time.time() * 1000)
    user = User(id="user-membership-fallback", handle="member-fallback", organizationId=None)
    membership = OrganizationMembership(
        id="om-1",
        orgId="org-public-1",
        userId="user-membership-fallback",
        createdAt=now,
        updatedAt=now,
    )
    db_session.add(user)
    db_session.add(membership)
    db_session.add(
        Script(
            id="pub-user-fallback-1",
            ownerId="user-membership-fallback",
            personaId=None,
            isPublic=1,
            type="script",
            folder="/",
        )
    )
    db_session.commit()

    response = client.get("/api/public-personas/user-membership-fallback")
    assert response.status_code == 200
    data = response.json()
    assert data["organizationIds"] == ["org-public-1"]
    assert len(data["organizations"]) == 1
    assert data["organizations"][0]["id"] == "org-public-1"


def test_get_public_persona_without_public_scripts_returns_404(client, db_session):
    setup_data(db_session)
    response = client.get("/api/public-personas/persona-broken-1")
    assert response.status_code == 404


def test_get_public_organization_without_public_scripts_returns_404(client, db_session):
    setup_data(db_session)
    now = int(time.time() * 1000)
    db_session.add(
        Organization(
            id="org-no-public-script",
            name="No Public Script Org",
            tags="[]",
            ownerId="user-no-persona",
            createdAt=now,
            updatedAt=now,
        )
    )
    db_session.commit()
    response = client.get("/api/public-organizations/org-no-public-script")
    assert response.status_code == 404
