from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
import crud
import schemas
from dependencies import get_db, get_current_user_id

router = APIRouter(prefix="/api/organizations", tags=["organizations"])

@router.post("", response_model=schemas.Organization)
def create_organization(org: schemas.OrganizationCreate, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    return crud.create_organization(db, org, ownerId)

@router.get("", response_model=List[schemas.Organization])
def read_organizations(db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    return crud.get_user_organizations(db, ownerId)

@router.put("/{org_id}", response_model=schemas.Organization)
def update_organization(org_id: str, org: schemas.OrganizationUpdate, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    updated = crud.update_organization(db, org_id, org, ownerId)
    if not updated:
         raise HTTPException(status_code=404, detail="Organization not found")
    return updated

@router.delete("/{org_id}")
def delete_organization(org_id: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    success = crud.delete_organization(db, org_id, ownerId)
    if not success:
         raise HTTPException(status_code=404, detail="Organization not found or permission denied")
    return {"success": True}

@router.post("/{org_id}/transfer")
def transfer_organization(org_id: str, payload: schemas.OrganizationTransferRequest, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    success = crud.transfer_organization(db, org_id, payload.newOwnerId, ownerId, payload.transferScripts)
    if not success:
         raise HTTPException(status_code=400, detail="Transfer failed. Check permissions or validity.")
    return {"success": True}

@router.post("/{org_id}/members")
def add_member(org_id: str, payload: schemas.OrganizationMemberRequest, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    success = crud.add_organization_member(db, org_id, payload.userId, ownerId)
    if not success:
         raise HTTPException(status_code=400, detail="Failed to add member")
    return {"success": True}

@router.delete("/{org_id}/members/{user_id}")
def remove_member(org_id: str, user_id: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    success = crud.remove_organization_member(db, org_id, user_id, ownerId)
    if not success:
         raise HTTPException(status_code=400, detail="Failed to remove member")
    return {"success": True}
