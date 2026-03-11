import pytest
from fastapi.testclient import TestClient
import crud_ops as crud
import schemas

def test_create_organization(client: TestClient):
    resp = client.post("/api/organizations", json={
        "name": "Test Org",
        "description": "Org Desc",
        "website": "https://test.org"
    }, headers={"X-User-Id": "u1"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Test Org"
    assert data["ownerId"] == "u1"
    
def test_read_organizations(client: TestClient):
    # Setup
    client.post("/api/organizations", json={"name": "Org 1"}, headers={"X-User-Id": "u1"})
    client.post("/api/organizations", json={"name": "Org 2"}, headers={"X-User-Id": "u2"})
    
    # Read my orgs
    resp = client.get("/api/organizations", headers={"X-User-Id": "u1"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["name"] == "Org 1"

def test_read_organization_detail_and_update(client: TestClient):
    resp = client.post("/api/organizations", json={"name": "Org 1"}, headers={"X-User-Id": "u1"})
    org_id = resp.json()["id"]
    
    # Read as owner
    resp = client.get(f"/api/organizations/{org_id}", headers={"X-User-Id": "u1"})
    assert resp.status_code == 200
    
    # Read as non-member
    resp = client.get(f"/api/organizations/{org_id}", headers={"X-User-Id": "u2"})
    assert resp.status_code == 403
    
    # Read as admin
    resp = client.get(f"/api/organizations/{org_id}", headers={"X-User-Id": "admin-owner"})
    assert resp.status_code == 200
    
    # Update as owner
    resp = client.put(f"/api/organizations/{org_id}", json={"name": "Updated Org"}, headers={"X-User-Id": "u1"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated Org"
    
def test_delete_organization(client: TestClient):
    resp = client.post("/api/organizations", json={"name": "Org Del"}, headers={"X-User-Id": "u1"})
    org_id = resp.json()["id"]
    
    resp = client.delete(f"/api/organizations/{org_id}", headers={"X-User-Id": "u2"})
    assert resp.status_code == 404  # Because crud returns false if permissions fail here in some paths
    
    resp = client.delete(f"/api/organizations/{org_id}", headers={"X-User-Id": "u1"})
    assert resp.status_code == 200
    
    # Verify deleted
    resp = client.get(f"/api/organizations/{org_id}", headers={"X-User-Id": "admin-owner"})
    assert resp.status_code == 404

def test_organization_members(client: TestClient, db_session):
    import models
    db_session.add(models.User(id="u2", email="u2@example.com"))
    db_session.commit()

    resp = client.post("/api/organizations", json={"name": "Org Mem"}, headers={"X-User-Id": "u1"})
    org_id = resp.json()["id"]
    
    # Add member
    resp = client.post(f"/api/organizations/{org_id}/members", json={"userId": "u2"}, headers={"X-User-Id": "u1"})
    assert resp.status_code == 200
    
    # List members
    resp = client.get(f"/api/organizations/{org_id}/members", headers={"X-User-Id": "u1"})
    assert resp.status_code == 200
    data = resp.json()
    # Expect users: u1 and u2 (in backend u1 is not strictly in users unless added? Wait, let's see)
    # the endpoint returns members. It will return u2.
    
    # Remove member
    resp = client.delete(f"/api/organizations/{org_id}/members/u2", headers={"X-User-Id": "u1"})
    assert resp.status_code == 200

def test_organization_invites_flow(client: TestClient, db_session):
    # Precreate u2 in db for email search if needed
    import models
    db_session.add(models.User(id="u2", email="u2@example.com"))
    db_session.commit()

    resp = client.post("/api/organizations", json={"name": "Org Inv"}, headers={"X-User-Id": "u1"})
    org_id = resp.json()["id"]
    
    # Invite u2
    resp = client.post(f"/api/organizations/{org_id}/invite", json={"userId": "u2"}, headers={"X-User-Id": "u1"})
    assert resp.status_code == 200
    invite_id = resp.json()["id"]
    
    # List my invites (for u2)
    resp = client.get("/api/organizations/me/invites", headers={"X-User-Id": "u2"})
    assert resp.status_code == 200
    assert len(resp.json()["invites"]) == 1
    
    # Decline invite
    resp = client.post(f"/api/organizations/invites/{invite_id}/decline", headers={"X-User-Id": "u2"})
    assert resp.status_code == 200
    
    # Invite u2 again (using email this time)
    resp = client.post(f"/api/organizations/{org_id}/invite", json={"email": "u2@example.com"}, headers={"X-User-Id": "u1"})
    assert resp.status_code == 200
    invite_id2 = resp.json()["id"]
    
    # Accept invite
    resp = client.post(f"/api/organizations/invites/{invite_id2}/accept", headers={"X-User-Id": "u2"})
    assert resp.status_code == 200
    
def test_organization_requests_flow(client: TestClient, db_session):
    import models
    db_session.add(models.User(id="u2", email="u2@example.com"))
    db_session.add(models.User(id="u3", email="u3@example.com"))
    db_session.commit()

    resp = client.post("/api/organizations", json={"name": "Org Req"}, headers={"X-User-Id": "u1"})
    org_id = resp.json()["id"]
    
    # u2 requests to join
    resp = client.post(f"/api/organizations/{org_id}/request", headers={"X-User-Id": "u2"})
    assert resp.status_code == 200
    req_id = resp.json()["id"]
    
    # List org requests (as u1)
    resp = client.get(f"/api/organizations/{org_id}/requests", headers={"X-User-Id": "u1"})
    assert resp.status_code == 200
    assert len(resp.json()["requests"]) == 1
    
    # Decline request
    resp = client.post(f"/api/organizations/requests/{req_id}/decline", headers={"X-User-Id": "u1"})
    assert resp.status_code == 200
    
    # Request again
    resp = client.post(f"/api/organizations/{org_id}/request", headers={"X-User-Id": "u3"})
    req_id2 = resp.json()["id"]
    
    # Accept request
    resp = client.post(f"/api/organizations/requests/{req_id2}/accept", headers={"X-User-Id": "u1"})
    assert resp.status_code == 200

def test_organization_transfer(client: TestClient, db_session):
    import models
    db_session.add(models.User(id="u2", email="u2@example.com"))
    db_session.commit()

    resp = client.post("/api/organizations", json={"name": "Org Trans"}, headers={"X-User-Id": "u1"})
    org_id = resp.json()["id"]
    
    resp = client.post(f"/api/organizations/{org_id}/transfer", json={"newOwnerId": "u2"}, headers={"X-User-Id": "u1"})
    assert resp.status_code == 200
    assert resp.json()["newOwnerId"] == "u2"
    
    resp = client.get(f"/api/organizations/{org_id}", headers={"X-User-Id": "u2"})
    assert resp.status_code == 200


def test_organization_member_role_and_remove_permissions(client: TestClient, db_session):
    import models
    import time
    import uuid

    now = int(time.time() * 1000)
    db_session.add(models.User(id="u2", email="u2@example.com"))
    db_session.add(models.User(id="u3", email="u3@example.com"))
    db_session.add(models.Persona(id="persona-u3", ownerId="u3", displayName="P3", createdAt=now, updatedAt=now))
    db_session.commit()

    resp = client.post("/api/organizations", json={"name": "Org Perm"}, headers={"X-User-Id": "u1"})
    org_id = resp.json()["id"]

    # Owner adds u2 and u3 as members.
    assert client.post(f"/api/organizations/{org_id}/members", json={"userId": "u2"}, headers={"X-User-Id": "u1"}).status_code == 200
    assert client.post(f"/api/organizations/{org_id}/members", json={"userId": "u3"}, headers={"X-User-Id": "u1"}).status_code == 200

    # Bind a persona to this org.
    db_session.add(
        models.PersonaOrganizationMembership(
            id=str(uuid.uuid4()),
            orgId=org_id,
            personaId="persona-u3",
            role="member",
            createdAt=now,
            updatedAt=now,
        )
    )
    db_session.commit()

    # Owner promotes u2 to admin.
    resp = client.patch(
        f"/api/organizations/{org_id}/members/u2/role",
        json={"role": "admin"},
        headers={"X-User-Id": "u1"},
    )
    assert resp.status_code == 200

    # Admin removes member u3.
    resp = client.delete(f"/api/organizations/{org_id}/members/u3", headers={"X-User-Id": "u2"})
    assert resp.status_code == 200

    # Admin removes persona membership.
    resp = client.delete(f"/api/organizations/{org_id}/personas/persona-u3", headers={"X-User-Id": "u2"})
    assert resp.status_code == 200

    # Non-manager cannot change role.
    resp = client.patch(
        f"/api/organizations/{org_id}/members/u2/role",
        json={"role": "member"},
        headers={"X-User-Id": "u3"},
    )
    assert resp.status_code == 400


def test_persona_org_ids_cannot_grant_unauthorized_org_access(client: TestClient):
    owner_headers = {"X-User-Id": "org-owner-locked"}
    attacker_headers = {"X-User-Id": "org-attacker-locked"}

    create_org_res = client.post("/api/organizations", json={"name": "Locked Org"}, headers=owner_headers)
    assert create_org_res.status_code == 200
    org_id = create_org_res.json()["id"]

    blocked_res = client.get(f"/api/organizations/{org_id}", headers=attacker_headers)
    assert blocked_res.status_code == 403

    create_persona_res = client.post(
        "/api/personas",
        json={"displayName": "Attacker Persona", "organizationIds": [org_id]},
        headers=attacker_headers,
    )
    assert create_persona_res.status_code == 200
    assert create_persona_res.json().get("organizationIds") == []

    blocked_again = client.get(f"/api/organizations/{org_id}", headers=attacker_headers)
    assert blocked_again.status_code == 403

    blocked_members = client.get(f"/api/organizations/{org_id}/members", headers=attacker_headers)
    assert blocked_members.status_code == 403
