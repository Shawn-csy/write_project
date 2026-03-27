import time
import uuid

from sqlalchemy.orm import Session

import models
import schemas
from .organizations_query import (
    ensure_user_org_membership,
    get_primary_user_org_id,
    is_user_org_manager,
    is_user_org_member,
    remove_persona_org_membership,
    remove_user_org_membership,
    update_user_org_membership_role,
)


def create_organization(db: Session, org: schemas.OrganizationCreate, ownerId: str):
    db_org = models.Organization(
        id=str(uuid.uuid4()),
        name=org.name,
        description=org.description,
        website=org.website or "",
        logoUrl=org.logoUrl or "",
        bannerUrl=org.bannerUrl or "",
        tags=org.tags or [],
        ownerId=ownerId,
        createdAt=int(time.time() * 1000),
        updatedAt=int(time.time() * 1000),
    )
    db.add(db_org)
    ensure_user_org_membership(db, ownerId, db_org.id, role="owner")
    owner_user = db.query(models.User).filter(models.User.id == ownerId).first()
    if owner_user and not owner_user.organizationId:
        owner_user.organizationId = db_org.id
    db.commit()
    db.refresh(db_org)
    return db_org


def update_organization(db: Session, org_id: str, org_update: schemas.OrganizationUpdate, ownerId: str):
    db_org = db.query(models.Organization).filter(models.Organization.id == org_id, models.Organization.ownerId == ownerId).first()
    if not db_org:
        return None

    update_data = org_update.model_dump(exclude_unset=True)
    if "tags" in update_data and update_data["tags"] is None:
        update_data["tags"] = []
    for key, value in update_data.items():
        setattr(db_org, key, value)

    db_org.updatedAt = int(time.time() * 1000)
    db.commit()
    db.refresh(db_org)
    return db_org


def add_organization_member(db: Session, org_id: str, user_id: str, ownerId: str):
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        return False
    if not is_user_org_manager(db, ownerId, org_id):
        return False

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return False

    ensure_user_org_membership(db, user_id, org_id, role="member")
    # Keep legacy field for compatibility with existing frontend/UI assumptions.
    if not user.organizationId:
        user.organizationId = org_id
    db.commit()
    return True


def remove_organization_member(db: Session, org_id: str, user_id: str, ownerId: str):
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        return False
    if not is_user_org_manager(db, ownerId, org_id):
        return False
    if org.ownerId == user_id:
        return False

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return False

    removed = remove_user_org_membership(db, user_id, org_id)
    if not removed and user.organizationId != org_id:
        return False
    if removed:
        db.flush()
    if user.organizationId == org_id:
        user.organizationId = get_primary_user_org_id(db, user_id, include_legacy=False)
    db.commit()
    return True


def create_organization_invite(db: Session, org_id: str, inviter_id: str, invited_user_id: str):
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        return None
    if not is_user_org_manager(db, inviter_id, org_id):
        return None
    if invited_user_id == inviter_id:
        return None
    if is_user_org_member(db, invited_user_id, org_id):
        return None
    existing = db.query(models.OrganizationInvite).filter(
        models.OrganizationInvite.orgId == org_id,
        models.OrganizationInvite.invitedUserId == invited_user_id,
        models.OrganizationInvite.status == "pending",
    ).first()
    if existing:
        return existing
    invite = models.OrganizationInvite(
        id=str(uuid.uuid4()),
        orgId=org_id,
        invitedUserId=invited_user_id,
        inviterUserId=inviter_id,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return invite


def create_organization_request(db: Session, org_id: str, requester_id: str):
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        return None
    if org.ownerId == requester_id:
        return None
    if is_user_org_member(db, requester_id, org_id):
        return None
    existing = db.query(models.OrganizationRequest).filter(
        models.OrganizationRequest.orgId == org_id,
        models.OrganizationRequest.requesterUserId == requester_id,
        models.OrganizationRequest.status == "pending",
    ).first()
    if existing:
        return existing
    req = models.OrganizationRequest(
        id=str(uuid.uuid4()),
        orgId=org_id,
        requesterUserId=requester_id,
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


def accept_invite(db: Session, invite_id: str, user_id: str):
    invite = db.query(models.OrganizationInvite).filter(
        models.OrganizationInvite.id == invite_id,
        models.OrganizationInvite.invitedUserId == user_id,
        models.OrganizationInvite.status == "pending",
    ).first()
    if not invite:
        return False
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return False
    ensure_user_org_membership(db, user_id, invite.orgId, role="member")
    if not user.organizationId:
        user.organizationId = invite.orgId
    invite.status = "accepted"
    db.commit()
    return True


def decline_invite(db: Session, invite_id: str, user_id: str):
    invite = db.query(models.OrganizationInvite).filter(
        models.OrganizationInvite.id == invite_id,
        models.OrganizationInvite.invitedUserId == user_id,
        models.OrganizationInvite.status == "pending",
    ).first()
    if not invite:
        return False
    invite.status = "declined"
    db.commit()
    return True


def accept_request(db: Session, request_id: str, owner_id: str):
    req = db.query(models.OrganizationRequest).filter(
        models.OrganizationRequest.id == request_id,
        models.OrganizationRequest.status == "pending",
    ).first()
    if not req:
        return False
    org = db.query(models.Organization).filter(models.Organization.id == req.orgId).first()
    if not org or not is_user_org_manager(db, owner_id, req.orgId):
        return False
    user = db.query(models.User).filter(models.User.id == req.requesterUserId).first()
    if not user:
        return False
    ensure_user_org_membership(db, req.requesterUserId, req.orgId, role="member")
    if not user.organizationId:
        user.organizationId = req.orgId
    req.status = "accepted"
    db.commit()
    return True


def decline_request(db: Session, request_id: str, owner_id: str):
    req = db.query(models.OrganizationRequest).filter(
        models.OrganizationRequest.id == request_id,
        models.OrganizationRequest.status == "pending",
    ).first()
    if not req:
        return False
    org = db.query(models.Organization).filter(models.Organization.id == req.orgId).first()
    if not org or not is_user_org_manager(db, owner_id, req.orgId):
        return False
    req.status = "declined"
    db.commit()
    return True


def delete_organization(db: Session, org_id: str, ownerId: str):
    org = db.query(models.Organization).filter(models.Organization.id == org_id, models.Organization.ownerId == ownerId).first()
    if not org:
        return False

    db.query(models.OrganizationMembership).filter(models.OrganizationMembership.orgId == org_id).delete()
    users = db.query(models.User).filter(models.User.organizationId == org_id).all()
    for u in users:
        u.organizationId = get_primary_user_org_id(db, u.id, include_legacy=False)
    db.query(models.Script).filter(models.Script.organizationId == org_id).update({models.Script.organizationId: None})
    # PersonaOrganizationMembership is the source of truth; a single delete is enough.
    db.query(models.PersonaOrganizationMembership).filter(
        models.PersonaOrganizationMembership.orgId == org_id
    ).delete()

    db.delete(org)
    db.commit()
    return True


def update_organization_member_role(db: Session, org_id: str, target_user_id: str, role: str, actor_id: str):
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        return False
    if not is_user_org_manager(db, actor_id, org_id):
        return False
    if org.ownerId == target_user_id:
        return False
    if actor_id == target_user_id:
        return False
    row = update_user_org_membership_role(db, target_user_id, org_id, role)
    if not row:
        return False
    db.commit()
    return True


def remove_organization_persona(db: Session, org_id: str, persona_id: str, actor_id: str):
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        return False
    if not is_user_org_manager(db, actor_id, org_id):
        return False
    changed = remove_persona_org_membership(db, persona_id, org_id)
    if not changed:
        return False
    db.commit()
    return True


__all__ = [
    "create_organization",
    "update_organization",
    "add_organization_member",
    "remove_organization_member",
    "create_organization_invite",
    "create_organization_request",
    "accept_invite",
    "decline_invite",
    "accept_request",
    "decline_request",
    "delete_organization",
    "update_organization_member_role",
    "remove_organization_persona",
]
