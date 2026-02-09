import json
import uuid

import crud
import models
import schemas


def _create_user(db, user_id):
    user = models.User(id=user_id, displayName=user_id)
    db.add(user)
    db.commit()
    return user


def _create_script(db, owner_id, **kwargs):
    script = models.Script(
        id=str(uuid.uuid4()),
        ownerId=owner_id,
        title=kwargs.get("title", "Script"),
        content=kwargs.get("content", ""),
        type=kwargs.get("type", "script"),
        folder=kwargs.get("folder", "/"),
        isPublic=1 if kwargs.get("isPublic", False) else 0,
        organizationId=kwargs.get("organizationId"),
        personaId=kwargs.get("personaId"),
    )
    db.add(script)
    db.commit()
    db.refresh(script)
    return script


def test_organization_crud_and_get_user_orgs(db_session):
    owner_id = "owner-1"
    _create_user(db_session, owner_id)

    org = crud.create_organization(
        db_session,
        schemas.OrganizationCreate(name="Org A", description="Desc", tags=["a", "b"]),
        owner_id,
    )
    assert org.ownerId == owner_id
    assert org.tags == ["a", "b"]

    # Force tags into string form to exercise conversion
    org.tags = json.dumps(["x", "y"])
    db_session.commit()

    orgs = crud.get_user_organizations(db_session, owner_id)
    assert len(orgs) == 1
    assert orgs[0].tags == ["x", "y"]


def test_update_organization_tags_none(db_session):
    owner_id = "owner-2"
    _create_user(db_session, owner_id)

    org = crud.create_organization(db_session, schemas.OrganizationCreate(name="Org B"), owner_id)
    prev_updated = org.updatedAt

    updated = crud.update_organization(
        db_session,
        org.id,
        schemas.OrganizationUpdate(name="Org B2", tags=None),
        owner_id,
    )
    assert updated.name == "Org B2"
    assert updated.tags == []
    assert updated.updatedAt >= prev_updated


def test_transfer_organization_and_scripts(db_session):
    owner_id = "owner-3"
    new_owner_id = "owner-4"
    _create_user(db_session, owner_id)
    _create_user(db_session, new_owner_id)

    org = crud.create_organization(db_session, schemas.OrganizationCreate(name="Org C"), owner_id)
    script = _create_script(db_session, owner_id, organizationId=org.id)

    ok = crud.transfer_organization(db_session, org.id, new_owner_id, owner_id, transfer_scripts=True)
    assert ok is True

    db_session.refresh(org)
    db_session.refresh(script)
    assert org.ownerId == new_owner_id
    assert script.ownerId == new_owner_id


def test_transfer_organization_requires_new_owner(db_session):
    owner_id = "owner-5"
    _create_user(db_session, owner_id)
    org = crud.create_organization(db_session, schemas.OrganizationCreate(name="Org D"), owner_id)

    ok = crud.transfer_organization(db_session, org.id, "missing-user", owner_id, transfer_scripts=True)
    assert ok is False


def test_organization_membership(db_session):
    owner_id = "owner-6"
    member_id = "member-1"
    _create_user(db_session, owner_id)
    _create_user(db_session, member_id)

    org = crud.create_organization(db_session, schemas.OrganizationCreate(name="Org E"), owner_id)

    ok_add = crud.add_organization_member(db_session, org.id, member_id, owner_id)
    assert ok_add is True

    member = db_session.query(models.User).filter(models.User.id == member_id).first()
    assert member.organizationId == org.id

    ok_remove = crud.remove_organization_member(db_session, org.id, member_id, owner_id)
    assert ok_remove is True

    db_session.refresh(member)
    assert member.organizationId is None


def test_persona_crud_and_get_user_personas(db_session):
    owner_id = "owner-7"
    _create_user(db_session, owner_id)

    persona = crud.create_persona(
        db_session,
        schemas.PersonaCreate(displayName="Persona A", tags=["t1"], organizationIds=["org1"]),
        owner_id,
    )
    assert persona.ownerId == owner_id

    # Force JSON string to test conversion
    persona.organizationIds = json.dumps(["org2"])
    persona.tags = json.dumps(["t2"])
    db_session.commit()

    personas = crud.get_user_personas(db_session, owner_id)
    assert len(personas) == 1
    assert personas[0].organizationIds == ["org2"]
    assert personas[0].tags == ["t2"]


def test_update_persona_and_delete_unlinks_scripts(db_session):
    owner_id = "owner-8"
    _create_user(db_session, owner_id)

    persona = crud.create_persona(
        db_session,
        schemas.PersonaCreate(displayName="Persona B"),
        owner_id,
    )
    updated = crud.update_persona(
        db_session,
        persona.id,
        schemas.PersonaCreate(displayName="Persona B2", tags=["x"]),
        owner_id,
    )
    assert updated.displayName == "Persona B2"
    assert updated.tags == ["x"]

    script = _create_script(db_session, owner_id, personaId=persona.id)
    ok = crud.delete_persona(db_session, persona.id)
    assert ok is True

    db_session.refresh(script)
    assert script.personaId is None
    assert db_session.query(models.Persona).filter(models.Persona.id == persona.id).first() is None


def test_transfer_script_ownership_and_engagement(db_session):
    owner_id = "owner-9"
    new_owner_id = "owner-10"
    _create_user(db_session, owner_id)
    _create_user(db_session, new_owner_id)

    script = _create_script(db_session, owner_id)

    ok = crud.transfer_script_ownership(db_session, script.id, new_owner_id, owner_id)
    assert ok is True

    db_session.refresh(script)
    assert script.ownerId == new_owner_id

    # engagement
    crud.increment_script_view(db_session, script.id)
    db_session.refresh(script)
    assert script.views == 1

    liked = crud.toggle_script_like(db_session, script.id, new_owner_id)
    assert liked is True
    db_session.refresh(script)
    assert script.likes == 1

    liked = crud.toggle_script_like(db_session, script.id, new_owner_id)
    assert liked is False
    db_session.refresh(script)
    assert script.likes == 0
