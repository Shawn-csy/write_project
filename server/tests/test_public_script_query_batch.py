from sqlalchemy import event

import crud_ops as crud
import models


def test_public_script_feed_loads_persona_memberships_in_one_query(db_session):
    db_session.add(models.Organization(id="org-1", name="One", ownerId="owner"))
    db_session.add(models.Organization(id="org-2", name="Two", ownerId="owner"))
    for index in range(3):
        persona_id = f"persona-{index}"
        db_session.add(models.Persona(id=persona_id, displayName=f"Actor {index}"))
        db_session.add(models.PersonaOrganizationMembership(
            id=f"membership-{index}", personaId=persona_id,
            orgId="org-1" if index < 2 else "org-2", role="member",
        ))
        db_session.add(models.Script(
            id=f"script-{index}", ownerId="owner", title=f"Script {index}",
            content="台詞" * (index + 1), isPublic=1, type="script",
            folder="/", personaId=persona_id,
        ))
    db_session.flush()
    db_session.expunge_all()

    membership_queries = []

    def track_query(_conn, _cursor, statement, _parameters, _context, _executemany):
        if "persona_organization_memberships" in statement and statement.lstrip().upper().startswith("SELECT"):
            membership_queries.append(statement)

    connection = db_session.connection()
    event.listen(connection, "before_cursor_execute", track_query)
    try:
        scripts = crud.get_public_scripts(db_session)
    finally:
        event.remove(connection, "before_cursor_execute", track_query)

    assert len(membership_queries) == 1
    assert {script.id: script.persona.organizationIds for script in scripts} == {
        "script-0": ["org-1"],
        "script-1": ["org-1"],
        "script-2": ["org-2"],
    }
    assert {script.id: script.contentLength for script in scripts} == {
        "script-0": 2,
        "script-1": 4,
        "script-2": 6,
    }
