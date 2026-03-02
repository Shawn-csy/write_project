import json
import uuid
import crud_ops as crud
import models
import schemas
import pytest

def _create_user(db, user_id):
    user = models.User(id=user_id, displayName=user_id)
    db.add(user)
    db.commit()
    return user

def test_persona_license_fields_crud(db_session):
    owner_id = "lic-owner-1"
    _create_user(db_session, owner_id)

    # 1. Create with license fields
    persona_in = schemas.PersonaCreate(
        displayName="License Persona",
        defaultLicenseCommercial="allow",
        defaultLicenseDerivative="limited",
        defaultLicenseNotify="required",
        defaultLicenseSpecialTerms=["Attribution required", "Non-commercial"]
    )
    
    persona = crud.create_persona(db_session, persona_in, owner_id)
    
    assert persona.defaultLicenseCommercial == "allow"
    assert persona.defaultLicenseDerivative == "limited"
    assert persona.defaultLicenseNotify == "required"
    # Check if list is preserved
    assert len(persona.defaultLicenseSpecialTerms) == 2
    assert "Attribution required" in persona.defaultLicenseSpecialTerms
    
    # 2. Update license fields
    update_in = schemas.PersonaCreate(
        displayName="License Persona Updated",
        defaultLicenseCommercial="disallow",
        defaultLicenseDerivative="disallow",
        defaultLicenseNotify="not_required",
        defaultLicenseSpecialTerms=["No rights reserved"]
    )
    
    updated = crud.update_persona(db_session, persona.id, update_in, owner_id)
    
    assert updated.defaultLicenseCommercial == "disallow"
    assert updated.defaultLicenseDerivative == "disallow"
    assert updated.defaultLicenseNotify == "not_required"
    assert updated.defaultLicenseSpecialTerms == ["No rights reserved"]

def test_get_user_personas_json_parsing(db_session):
    owner_id = "lic-owner-2"
    _create_user(db_session, owner_id)
    
    # Manually insert a persona with JSON string for defaultLicenseSpecialTerms
    # mimicking what might happen in SQLite or legacy data
    p_id = str(uuid.uuid4())
    db_persona = models.Persona(
        id=p_id,
        ownerId=owner_id,
        displayName="JSON Test",
        defaultLicenseSpecialTerms=json.dumps(["Term A", "Term B"]) # Stored as string
    )
    db_session.add(db_persona)
    db_session.commit()
    
    # Verify get_user_personas parses it back to list
    personas = crud.get_user_personas(db_session, owner_id)
    assert len(personas) == 1
    p = personas[0]
    
    assert isinstance(p.defaultLicenseSpecialTerms, list)
    assert p.defaultLicenseSpecialTerms == ["Term A", "Term B"]
