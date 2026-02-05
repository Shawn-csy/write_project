import json
import uuid
import crud
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
        defaultLicense="CC-BY-4.0",
        defaultLicenseUrl="https://creativecommons.org/licenses/by/4.0/",
        defaultLicenseTerms=["Attribution required", "Non-commercial"]
    )
    
    persona = crud.create_persona(db_session, persona_in, owner_id)
    
    assert persona.defaultLicense == "CC-BY-4.0"
    assert persona.defaultLicenseUrl == "https://creativecommons.org/licenses/by/4.0/"
    # Check if list is preserved
    assert len(persona.defaultLicenseTerms) == 2
    assert "Attribution required" in persona.defaultLicenseTerms
    
    # 2. Update license fields
    update_in = schemas.PersonaCreate(
        displayName="License Persona Updated",
        defaultLicense="CC0",
        defaultLicenseUrl="https://creativecommons.org/publicdomain/zero/1.0/",
        defaultLicenseTerms=["No rights reserved"]
    )
    
    updated = crud.update_persona(db_session, persona.id, update_in, owner_id)
    
    assert updated.defaultLicense == "CC0"
    assert updated.defaultLicenseUrl == "https://creativecommons.org/publicdomain/zero/1.0/"
    assert updated.defaultLicenseTerms == ["No rights reserved"]

def test_get_user_personas_json_parsing(db_session):
    owner_id = "lic-owner-2"
    _create_user(db_session, owner_id)
    
    # Manually insert a persona with JSON string for defaultLicenseTerms
    # mimicking what might happen in SQLite or legacy data
    p_id = str(uuid.uuid4())
    db_persona = models.Persona(
        id=p_id,
        ownerId=owner_id,
        displayName="JSON Test",
        defaultLicenseTerms=json.dumps(["Term A", "Term B"]) # Stored as string
    )
    db_session.add(db_persona)
    db_session.commit()
    
    # Verify get_user_personas parses it back to list
    personas = crud.get_user_personas(db_session, owner_id)
    assert len(personas) == 1
    p = personas[0]
    
    assert isinstance(p.defaultLicenseTerms, list)
    assert p.defaultLicenseTerms == ["Term A", "Term B"]
