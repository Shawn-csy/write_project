from sqlalchemy import event

import models
from routers.public import list_public_organizations


def test_audio_organization_list_does_not_load_user_memberships(db_session):
    for index in range(3):
        org_id = f"audio-org-{index}"
        db_session.add(models.Organization(id=org_id, name=f"Audio Org {index}", ownerId="platform-owner"))
        db_session.add(models.PublicAudioWorkSubmission(
            id=f"audio-work-{index}", title=f"Work {index}", url=f"https://example.test/{index}",
            organizationId=org_id, status="approved",
        ))
    db_session.flush()
    db_session.expunge_all()

    user_queries = []

    def track_query(_conn, _cursor, statement, _parameters, _context, _executemany):
        if statement.lstrip().upper().startswith("SELECT") and "FROM users" in statement:
            user_queries.append(statement)

    connection = db_session.connection()
    event.listen(connection, "before_cursor_execute", track_query)
    try:
        organizations = list_public_organizations(db_session)
    finally:
        event.remove(connection, "before_cursor_execute", track_query)

    assert {org.id for org in organizations} == {f"audio-org-{index}" for index in range(3)}
    assert all(org.members == [] for org in organizations)
    assert user_queries == []
