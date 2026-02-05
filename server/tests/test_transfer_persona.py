import pytest
import uuid
import crud
import models
import schemas

def _create_user(db, user_id):
    user = models.User(id=user_id, displayName=user_id)
    db.add(user)
    db.commit()
    return user

def _create_script(db, owner_id, persona_id=None, title="Test Script"):
    script = models.Script(
        id=str(uuid.uuid4()),
        ownerId=owner_id,
        title=title,
        content="Content",
        type="script",
        folder="/",
        isPublic=0,
        personaId=persona_id,
    )
    db.add(script)
    db.commit()
    db.refresh(script)
    return script

def test_transfer_persona_ownership_success(db_session):
    # Setup
    owner_id = "owner-A"
    target_id = "owner-B"
    _create_user(db_session, owner_id)
    _create_user(db_session, target_id)

    # Create Persona for Owner A
    persona = crud.create_persona(
        db_session,
        schemas.PersonaCreate(displayName="Author P"),
        owner_id
    )
    
    # Create Scripts linked to this Persona
    # Note: Scripts also store ownerId directly.
    s1 = _create_script(db_session, owner_id, persona_id=persona.id, title="Script 1")
    s2 = _create_script(db_session, owner_id, persona_id=persona.id, title="Script 2")
    
    # Create a control script (same owner, different persona/no persona) - SHOULD NOT MOVE?
    # Wait, the logic I wrote was: db.query(models.Script).filter(models.Script.personaId == persona_id).update({models.Script.ownerId: new_owner_id})
    # So it only moves scripts LINKED to this persona.
    s3_control = _create_script(db_session, owner_id, persona_id=None, title="Control Script")

    # Execute Transfer
    success = crud.transfer_persona_ownership(db_session, persona.id, target_id, owner_id)
    assert success is True

    # Verify Persona Ownership
    db_session.refresh(persona)
    assert persona.ownerId == target_id
    # Verify timestamp updated? (Optional)

    # Verify Script Ownership Cascaded
    db_session.refresh(s1)
    db_session.refresh(s2)
    db_session.refresh(s3_control)

    assert s1.ownerId == target_id
    assert s2.ownerId == target_id
    assert s3_control.ownerId == owner_id # Should not change

def test_transfer_persona_not_found_or_wrong_owner(db_session):
    owner_id = "owner-A"
    target_id = "owner-B"
    _create_user(db_session, owner_id)
    _create_user(db_session, target_id)
    
    # Non-existent persona
    success = crud.transfer_persona_ownership(db_session, "fake-id", target_id, owner_id)
    assert success is False

    # Wrong owner
    persona = crud.create_persona(
        db_session,
        schemas.PersonaCreate(displayName="Author P"),
        owner_id
    )
    success = crud.transfer_persona_ownership(db_session, persona.id, target_id, "wrong-owner")
    assert success is False

def test_transfer_persona_target_does_not_exist(db_session):
    owner_id = "owner-A"
    _create_user(db_session, owner_id)
    
    persona = crud.create_persona(
        db_session,
        schemas.PersonaCreate(displayName="Author P"),
        owner_id
    )
    
    success = crud.transfer_persona_ownership(db_session, persona.id, "non-existent-user", owner_id)
    assert success is False
