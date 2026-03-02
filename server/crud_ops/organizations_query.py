import json

from sqlalchemy.orm import Session

import models
from .common import _ensure_list


def get_user_organizations(db: Session, ownerId: str):
    orgs = db.query(models.Organization).filter(models.Organization.ownerId == ownerId).all()
    for o in orgs:
        if isinstance(o.tags, str):
            try:
                o.tags = json.loads(o.tags)
            except Exception:
                o.tags = []
    return orgs


def get_organization_members(db: Session, org_id: str):
    users = db.query(models.User).filter(models.User.organizationId == org_id).all()
    personas = []
    all_personas = db.query(models.Persona).all()
    for p in all_personas:
        org_ids = _ensure_list(p.organizationIds)
        if org_id in org_ids:
            p.tags = _ensure_list(p.tags)
            p.organizationIds = org_ids
            p.defaultLicenseSpecialTerms = _ensure_list(p.defaultLicenseSpecialTerms)
            personas.append(p)
    return users, personas


def search_organizations(db: Session, query: str):
    search = f"%{query}%"
    return db.query(models.Organization).filter(models.Organization.name.like(search)).limit(20).all()


def list_org_invites(db: Session, org_id: str):
    return db.query(models.OrganizationInvite).filter(
        models.OrganizationInvite.orgId == org_id,
        models.OrganizationInvite.status == "pending",
    ).order_by(models.OrganizationInvite.createdAt.desc()).all()


def list_org_requests(db: Session, org_id: str):
    return db.query(models.OrganizationRequest).filter(
        models.OrganizationRequest.orgId == org_id,
        models.OrganizationRequest.status == "pending",
    ).order_by(models.OrganizationRequest.createdAt.desc()).all()


def list_my_invites(db: Session, user_id: str):
    return db.query(models.OrganizationInvite).filter(
        models.OrganizationInvite.invitedUserId == user_id,
        models.OrganizationInvite.status == "pending",
    ).order_by(models.OrganizationInvite.createdAt.desc()).all()


def list_my_requests(db: Session, user_id: str):
    return db.query(models.OrganizationRequest).filter(
        models.OrganizationRequest.requesterUserId == user_id,
        models.OrganizationRequest.status == "pending",
    ).order_by(models.OrganizationRequest.createdAt.desc()).all()


__all__ = [
    "get_user_organizations",
    "get_organization_members",
    "search_organizations",
    "list_org_invites",
    "list_org_requests",
    "list_my_invites",
    "list_my_requests",
]

