from sqlalchemy import event

from models import Organization, Persona, Script, User
from routers.public import _public_script_identity_ids
from crud_ops.publish_state import is_publicly_visible


def test_public_identity_batch_preserves_visibility_and_uses_one_query(db_session):
    db_session.add_all([
        User(id="owner-batch", handle="owner-batch"),
        Persona(id="persona-batch", ownerId="owner-batch", displayName="Author"),
        Organization(id="org-batch", ownerId="owner-batch", name="Org"),
        Script(id="folder-batch", ownerId="owner-batch", title="shared", folder="/", type="folder", isPublic=1),
        Script(id="inherited-batch", ownerId="owner-batch", title="Inherited", folder="/shared", type="script", isPublic=0,
               personaId="persona-batch", organizationId="org-batch"),
        Script(id="private-batch", ownerId="owner-batch", title="Private", folder="/private", type="script", isPublic=0,
               personaId="persona-batch", organizationId="org-batch"),
        Script(id="explicit-batch", ownerId="owner-batch", title="Explicit", folder="/private", type="script", isPublic=1,
               personaId="persona-batch", organizationId="org-batch"),
    ])
    db_session.flush()

    statements = []
    def record(_conn, _cursor, statement, _parameters, _context, _executemany):
        statements.append(statement)

    event.listen(db_session.bind, "before_cursor_execute", record)
    try:
        script_ids, persona_ids, org_ids = _public_script_identity_ids(db_session)
    finally:
        event.remove(db_session.bind, "before_cursor_execute", record)

    assert len(statements) == 1
    expected = {
        row.id for row in db_session.query(Script).all()
        if is_publicly_visible(db_session, row)
    }
    assert script_ids == expected
    assert persona_ids == {"persona-batch"}
    assert org_ids == {"org-batch"}


def test_public_persona_list_reads_memberships_in_one_query(client, db_session):
    db_session.add(User(id="owner-many", handle="owner-many"))
    for index in range(5):
        persona_id = f"persona-many-{index}"
        db_session.add(Persona(id=persona_id, ownerId="owner-many", displayName=persona_id))
        db_session.add(Script(id=f"script-many-{index}", ownerId="owner-many", personaId=persona_id,
                              title=persona_id, folder="/", type="script", isPublic=1))
    db_session.flush()

    statements = []
    def record(_conn, _cursor, statement, _parameters, _context, _executemany):
        if "FROM persona_organization_memberships" in statement:
            statements.append(statement)

    event.listen(db_session.bind, "before_cursor_execute", record)
    try:
        response = client.get("/api/public-personas")
    finally:
        event.remove(db_session.bind, "before_cursor_execute", record)

    assert response.status_code == 200
    assert {row["id"] for row in response.json()} == {f"persona-many-{index}" for index in range(5)}
    assert len(statements) == 1
