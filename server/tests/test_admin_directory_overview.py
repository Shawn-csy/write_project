from models import Organization, Persona, Script, User


def test_directory_overview_matches_list_counts_and_author_filter(client, db_session):
    db_session.add_all([
        User(id="u1", handle="u1", email="one@example.com", displayName="One", lastLogin=2),
        User(id="u2", handle="u2", email="two@example.com", displayName="Two", lastLogin=1),
        Organization(id="o1", name="Org", ownerId="u1"),
        Persona(id="p1", displayName="Tagged writer", ownerId="u1", tags='["台本師"]'),
        Persona(id="p2", displayName="Linked writer", ownerId="u2", tags=[]),
        Persona(id="p3", displayName="Voice only", ownerId="u2", tags=["聲演"]),
        Script(id="s1", title="Script", ownerId="u2", personaId="p2", type="script", lastModified=2),
        Script(id="f1", title="Folder", ownerId="u1", personaId="p3", type="folder", lastModified=1),
    ])
    db_session.commit()
    headers = {"X-User-ID": "admin-owner"}
    response = client.get("/api/admin/directory-overview", headers=headers)
    assert response.status_code == 200
    overview = response.json()
    assert overview["users"] == 2
    assert overview["organizations"] == 1
    assert overview["personas"] == 3
    assert overview["authors"] == 2
    assert overview["scripts"] == 1
    assert set(overview["writerPersonaIds"]) == {"p1", "p2"}
    assert overview["ownerLabels"] == {"u1": "One", "u2": "Two"}
    assert overview["scripts"] == sum(item["type"] != "folder" for item in client.get("/api/admin/all-scripts", headers=headers).json())

    filtered = client.get("/api/admin/directory-overview?q=one%40example.com", headers=headers).json()
    assert filtered["users"] == 1
    assert filtered["ownerLabels"] == {"u1": "One"}


def test_directory_overview_requires_admin(client):
    response = client.get("/api/admin/directory-overview", headers={"X-User-ID": "ordinary-user"})
    assert response.status_code == 403
