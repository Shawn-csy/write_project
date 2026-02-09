from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from sqlalchemy.orm import Session
import crud
import models
import schemas
from dependencies import get_db, get_current_user_id, is_admin_user_id

router = APIRouter(prefix="/api/personas", tags=["personas"])

@router.post("", response_model=schemas.Persona)
def create_persona(persona: schemas.PersonaCreate, db: Session = Depends(get_db), current_user: str = Depends(get_current_user_id)):
    return crud.create_persona(db, persona, current_user)

@router.get("", response_model=List[schemas.Persona])
def get_personas(
    current_user: str = Depends(get_current_user_id),
    ownerIdQuery: Optional[str] = None,
    db: Session = Depends(get_db)
):
    effective_owner_id = ownerIdQuery if ownerIdQuery and is_admin_user_id(current_user) else current_user
    return crud.get_user_personas(db, effective_owner_id)

@router.put("/{persona_id}", response_model=schemas.Persona)
def update_persona(persona_id: str, persona: schemas.PersonaCreate, db: Session = Depends(get_db), current_user: str = Depends(get_current_user_id)):
    updated = crud.update_persona(db, persona_id, persona, current_user)
    if not updated:
        raise HTTPException(status_code=404, detail="Persona not found")
    return updated

@router.delete("/{persona_id}")
def delete_persona(persona_id: str, db: Session = Depends(get_db), current_user: str = Depends(get_current_user_id)):
    # Verify ownership
    persona = db.query(models.Persona).filter(models.Persona.id == persona_id).first()
    if not persona:
         raise HTTPException(status_code=404, detail="Persona not found")
    if persona.ownerId != current_user:
         raise HTTPException(status_code=403, detail="Not authorized")
         
    crud.delete_persona(db, persona_id)
    return {"success": True}

@router.post("/{persona_id}/transfer")
def transfer_persona(persona_id: str, payload: schemas.ScriptTransferRequest, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    # Reusing ScriptTransferRequest because it has 'newOwnerId'. Ideally make a GenericTransferRequest.
    # schemas.ScriptTransferRequest = { newOwnerId: str }
    if is_admin_user_id(ownerId):
        success = crud.transfer_persona_ownership_admin(db, persona_id, payload.newOwnerId)
    else:
        success = crud.transfer_persona_ownership(db, persona_id, payload.newOwnerId, ownerId)
    if not success:
         raise HTTPException(status_code=400, detail="Transfer failed. Check permissions or validity.")
    return {"success": True, "id": persona_id, "newOwnerId": payload.newOwnerId}
