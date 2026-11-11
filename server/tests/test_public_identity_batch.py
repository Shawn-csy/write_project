from sqlalchemy import event

from models import ExternalAuthor, ExternalAuthorPageProfile, ExternalPublicScript, Organization, Persona, PersonaRole, Script, User
from routers.external_public_scripts import get_published_external_public_scripts
from routers.public import _build_public_identity_context, _public_script_identity_ids
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


def test_curated_external_author_link_overrides_stale_author_row(db_session):
    persona_id = "persona-linked-author"
    author_id = "external-author-stale-link"
    author_key = "curated-author"
    db_session.add(Persona(id=persona_id, displayName="作者兼聲演"))
    db_session.add(PersonaRole(id="role-linked-author", personaId=persona_id, role="scriptwriter", isVisible=True))
    db_session.add(ExternalAuthor(id=author_id, canonicalKey=author_key, displayName="舊作者", linkedPersonaId=None))
    db_session.add(ExternalAuthorPageProfile(authorKey=author_key, displayName="已確認作者", linkedPersonaId=persona_id))
    db_session.add(ExternalPublicScript(id="external-linked-work", externalAuthorId=author_id,
                                        authorKey=author_key, authorName="舊作者", sourceUrl="https://example.com/work",
                                        status="published"))
    db_session.flush()

    works = get_published_external_public_scripts(db_session)
    context = _build_public_identity_context(db_session, [persona_id])

    assert next(work for work in works if work["id"] == "external-linked-work")["authorPersonaId"] == persona_id
    assert [author.id for author in context["externalAuthors"][persona_id]] == [author_id]
    assert [work.id for work in context["externalScripts"][author_id]] == ["external-linked-work"]


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
