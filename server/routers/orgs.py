from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from sqlalchemy.orm import Session
import crud
import schemas
import models
import json
from dependencies import get_db, get_current_user_id, is_admin_user_id

router = APIRouter(prefix="/api/organizations", tags=["organizations"])

@router.post("", response_model=schemas.Organization)
def create_organization(org: schemas.OrganizationCreate, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    return crud.create_organization(db, org, ownerId)

@router.get("/search", response_model=List[schemas.Organization])
def search_organizations(q: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    return crud.search_organizations(db, q)

@router.get("", response_model=List[schemas.Organization])
def read_organizations(
    ownerId: str = Depends(get_current_user_id),
    ownerIdQuery: Optional[str] = None,
    db: Session = Depends(get_db)
):
    effective_owner_id = ownerIdQuery if ownerIdQuery and is_admin_user_id(ownerId) else ownerId
    return crud.get_user_organizations(db, effective_owner_id)

@router.get("/{org_id}", response_model=schemas.Organization)
def read_organization(org_id: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    if not (org.ownerId == ownerId or is_admin_user_id(ownerId)):
        user = db.query(models.User).filter(models.User.id == ownerId).first()
        if not user or user.organizationId != org_id:
            # Also allow if any persona owned by this user belongs to the org
            personas = db.query(models.Persona).filter(models.Persona.ownerId == ownerId).all()
            allowed = False
            for p in personas:
                org_ids = p.organizationIds
                if isinstance(org_ids, str):
                    try:
                        org_ids = json.loads(org_ids)
                    except Exception:
                        org_ids = []
                if org_ids and org_id in org_ids:
                    allowed = True
                    break
            if not allowed:
                raise HTTPException(status_code=403, detail="Not authorized")
    if isinstance(org.tags, str):
        try:
            org.tags = json.loads(org.tags)
        except Exception:
            org.tags = []
    return org

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

@router.get("/{org_id}/members", response_model=schemas.OrganizationMembersResponse)
def get_organization_members(org_id: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    if not (org.ownerId == ownerId or is_admin_user_id(ownerId)):
        # Allow if current user is a member (user org) or has a persona in this org
        user = db.query(models.User).filter(models.User.id == ownerId).first()
        if not user or user.organizationId != org_id:
            personas = db.query(models.Persona).filter(models.Persona.ownerId == ownerId).all()
            allowed = False
            for p in personas:
                org_ids = p.organizationIds
                if isinstance(org_ids, str):
                    try:
                        org_ids = json.loads(org_ids)
                    except Exception:
                        org_ids = []
                if org_ids and org_id in org_ids:
                    allowed = True
                    break
            if not allowed:
                raise HTTPException(status_code=403, detail="Not authorized")
    users, personas = crud.get_organization_members(db, org_id)
    return {"users": users, "personas": personas}

@router.post("/{org_id}/transfer")
def transfer_organization(org_id: str, payload: schemas.OrganizationTransferRequest, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    if is_admin_user_id(ownerId):
        success = crud.transfer_organization_admin(db, org_id, payload.newOwnerId, False)
    else:
        success = crud.transfer_organization(db, org_id, payload.newOwnerId, ownerId, False)
    if not success:
         raise HTTPException(status_code=400, detail="Transfer failed. Check permissions or validity.")
    return {"success": True, "id": org_id, "newOwnerId": payload.newOwnerId}

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

@router.post("/{org_id}/invite", response_model=schemas.OrganizationInvite)
def invite_member(org_id: str, payload: schemas.OrganizationInviteRequest, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    target_user_id = payload.userId
    if not target_user_id and payload.email:
        user = db.query(models.User).filter(models.User.email == payload.email).first()
        if not user:
            raise HTTPException(status_code=400, detail="User not found by email")
        target_user_id = user.id
    if not target_user_id:
        raise HTTPException(status_code=400, detail="Missing userId or email")

    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    if org.ownerId != ownerId and not is_admin_user_id(ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    if target_user_id == ownerId:
        raise HTTPException(status_code=400, detail="Cannot invite yourself")
    existing_member = db.query(models.User).filter(models.User.id == target_user_id, models.User.organizationId == org_id).first()
    if existing_member:
        raise HTTPException(status_code=400, detail="User already a member")

    invite = crud.create_organization_invite(db, org_id, ownerId, target_user_id)
    if not invite:
        raise HTTPException(status_code=400, detail="Invite failed")
    return invite

@router.post("/{org_id}/request", response_model=schemas.OrganizationRequest)
def request_to_join(org_id: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    req = crud.create_organization_request(db, org_id, ownerId)
    if not req:
        raise HTTPException(status_code=400, detail="Request failed")
    return req

@router.get("/me/invites", response_model=schemas.OrganizationInvitesResponse)
def my_invites(db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    invites = crud.list_my_invites(db, ownerId)
    return {"invites": invites}

@router.get("/me/requests", response_model=schemas.OrganizationRequestsResponse)
def my_requests(db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    reqs = crud.list_my_requests(db, ownerId)
    return {"requests": reqs}

@router.get("/{org_id}/invites", response_model=schemas.OrganizationInvitesResponse)
def list_org_invites(org_id: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    org = db.query(models.Organization).filter(models.Organization.id == org_id, models.Organization.ownerId == ownerId).first()
    if not org and not is_admin_user_id(ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    invites = crud.list_org_invites(db, org_id)
    enriched = []
    for inv in invites:
        invited = db.query(models.User).filter(models.User.id == inv.invitedUserId).first()
        inviter = db.query(models.User).filter(models.User.id == inv.inviterUserId).first()
        inv.invitedUser = invited
        inv.inviterUser = inviter
        enriched.append(inv)
    return {"invites": enriched}

@router.get("/{org_id}/requests", response_model=schemas.OrganizationRequestsResponse)
def list_org_requests(org_id: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    org = db.query(models.Organization).filter(models.Organization.id == org_id, models.Organization.ownerId == ownerId).first()
    if not org and not is_admin_user_id(ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    reqs = crud.list_org_requests(db, org_id)
    enriched = []
    for req in reqs:
        requester = db.query(models.User).filter(models.User.id == req.requesterUserId).first()
        req.requester = requester
        enriched.append(req)
    return {"requests": enriched}

@router.post("/invites/{invite_id}/accept")
def accept_invite(invite_id: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    ok = crud.accept_invite(db, invite_id, ownerId)
    if not ok:
        raise HTTPException(status_code=400, detail="Accept failed")
    return {"success": True}

@router.post("/invites/{invite_id}/decline")
def decline_invite(invite_id: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    ok = crud.decline_invite(db, invite_id, ownerId)
    if not ok:
        raise HTTPException(status_code=400, detail="Decline failed")
    return {"success": True}

@router.post("/requests/{request_id}/accept")
def accept_request(request_id: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    ok = crud.accept_request(db, request_id, ownerId)
    if not ok:
        raise HTTPException(status_code=400, detail="Accept failed")
    return {"success": True}

@router.post("/requests/{request_id}/decline")
def decline_request(request_id: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    ok = crud.decline_request(db, request_id, ownerId)
    if not ok:
        raise HTTPException(status_code=400, detail="Decline failed")
    return {"success": True}
