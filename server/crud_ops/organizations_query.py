import json
import time
import uuid

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


def get_persona_org_ids(db: Session, persona: models.Persona) -> list:
    """Return org IDs for a persona, sourced exclusively from PersonaOrganizationMembership."""
    if not persona:
        return []
    rows = db.query(models.PersonaOrganizationMembership.orgId).filter(
        models.PersonaOrganizationMembership.personaId == persona.id
    ).all()
    return [row[0] for row in rows if row and row[0]]


def get_organization_members(db: Session, org_id: str):
    membership_rows = db.query(models.OrganizationMembership).filter(models.OrganizationMembership.orgId == org_id).all()
    user_role_map = {m.userId: (m.role or "member") for m in membership_rows}
    member_user_ids = set(user_role_map.keys())

    # Legacy: users whose organizationId field points here but have no membership row yet.
    legacy_users = db.query(models.User).filter(models.User.organizationId == org_id).all()
    for u in legacy_users:
        if not u or not u.id:
            continue
        member_user_ids.add(u.id)
        user_role_map.setdefault(u.id, "member")

    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if org and org.ownerId:
        member_user_ids.add(org.ownerId)
        user_role_map[org.ownerId] = "owner"

    users = []
    if member_user_ids:
        users = db.query(models.User).filter(models.User.id.in_(list(member_user_ids))).all()
        for u in users:
            setattr(u, "organizationRole", user_role_map.get(u.id, "member"))

    # Persona membership is authoritative in PersonaOrganizationMembership table only.
    persona_membership_rows = db.query(models.PersonaOrganizationMembership).filter(
        models.PersonaOrganizationMembership.orgId == org_id
    ).all()
    persona_role_map = {m.personaId: (m.role or "member") for m in persona_membership_rows}
    personas = []
    if persona_role_map:
        linked_personas = db.query(models.Persona).filter(
            models.Persona.id.in_(list(persona_role_map.keys()))
        ).all()
        for p in linked_personas:
            p.tags = _ensure_list(p.tags)
            p.links = _ensure_list(p.links)
            p.organizationIds = get_persona_org_ids(db, p)
            p.defaultLicenseSpecialTerms = _ensure_list(p.defaultLicenseSpecialTerms)
            setattr(p, "organizationRole", persona_role_map.get(p.id, "member"))
            personas.append(p)
    return users, personas


def search_organizations(db: Session, query: str):
    search = f"%{query}%"
    return db.query(models.Organization).filter(models.Organization.name.ilike(search)).limit(20).all()


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


def is_user_org_member(db: Session, user_id: str, org_id: str) -> bool:
    if not user_id or not org_id:
        return False
    membership = db.query(models.OrganizationMembership).filter(
        models.OrganizationMembership.userId == user_id,
        models.OrganizationMembership.orgId == org_id,
    ).first()
    if membership:
        return True
    # Legacy fallback
    legacy = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.organizationId == org_id,
    ).first()
    return legacy is not None


def get_user_org_role(db: Session, user_id: str, org_id: str):
    if not user_id or not org_id:
        return None
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if org and org.ownerId == user_id:
        return "owner"
    membership = db.query(models.OrganizationMembership).filter(
        models.OrganizationMembership.userId == user_id,
        models.OrganizationMembership.orgId == org_id,
    ).first()
    if membership:
        return membership.role or "member"
    legacy = db.query(models.User).filter(
        models.User.id == user_id,
        models.User.organizationId == org_id,
    ).first()
    return "member" if legacy else None


def is_user_org_manager(db: Session, user_id: str, org_id: str) -> bool:
    role = get_user_org_role(db, user_id, org_id)
    return role in ("owner", "admin")


def ensure_user_org_membership(db: Session, user_id: str, org_id: str, role: str = "member"):
    if not user_id or not org_id:
        return None
    row = db.query(models.OrganizationMembership).filter(
        models.OrganizationMembership.userId == user_id,
        models.OrganizationMembership.orgId == org_id,
    ).first()
    now_ms = int(time.time() * 1000)
    if row:
        row.updatedAt = now_ms
        if not row.role:
            row.role = role or "member"
    else:
        row = models.OrganizationMembership(
            id=str(uuid.uuid4()),
            userId=user_id,
            orgId=org_id,
            role=role or "member",
            createdAt=now_ms,
            updatedAt=now_ms,
        )
        db.add(row)
    return row


def remove_user_org_membership(db: Session, user_id: str, org_id: str) -> bool:
    row = db.query(models.OrganizationMembership).filter(
        models.OrganizationMembership.userId == user_id,
        models.OrganizationMembership.orgId == org_id,
    ).first()
    if not row:
        return False
    db.delete(row)
    return True


def update_user_org_membership_role(db: Session, user_id: str, org_id: str, role: str):
    row = db.query(models.OrganizationMembership).filter(
        models.OrganizationMembership.userId == user_id,
        models.OrganizationMembership.orgId == org_id,
    ).first()
    if not row:
        return None
    row.role = role
    row.updatedAt = int(time.time() * 1000)
    return row


def remove_persona_org_membership(db: Session, persona_id: str, org_id: str) -> bool:
    row = db.query(models.PersonaOrganizationMembership).filter(
        models.PersonaOrganizationMembership.personaId == persona_id,
        models.PersonaOrganizationMembership.orgId == org_id,
    ).first()
    if not row:
        return False
    db.delete(row)
    # Keep the denormalized field consistent.
    persona = db.query(models.Persona).filter(models.Persona.id == persona_id).first()
    if persona:
        persona.organizationIds = [oid for oid in _ensure_list(persona.organizationIds) if oid != org_id]
    return True


def list_user_org_ids(db: Session, user_id: str, include_legacy: bool = True):
    rows = db.query(models.OrganizationMembership.orgId).filter(
        models.OrganizationMembership.userId == user_id
    ).all()
    org_ids = [row[0] for row in rows if row and row[0]]
    # Backward compatibility with legacy users.organizationId
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if include_legacy and user and user.organizationId and user.organizationId not in org_ids:
        org_ids.append(user.organizationId)
    return org_ids


def get_primary_user_org_id(db: Session, user_id: str, include_legacy: bool = True):
    org_ids = list_user_org_ids(db, user_id, include_legacy=include_legacy)
    return org_ids[0] if org_ids else None


def ensure_persona_org_memberships(db: Session, persona: models.Persona, desired_org_ids: list):
    """Sync PersonaOrganizationMembership rows to match desired_org_ids.
    This is the single write path for persona-org membership.
    Also updates persona.organizationIds to keep it consistent for reads.
    """
    desired = set(oid for oid in desired_org_ids if oid)
    existing_rows = db.query(models.PersonaOrganizationMembership).filter(
        models.PersonaOrganizationMembership.personaId == persona.id
    ).all()
    existing_map = {r.orgId: r for r in existing_rows}
    now_ms = int(time.time() * 1000)

    for org_id, row in existing_map.items():
        if org_id not in desired:
            db.delete(row)
        else:
            row.updatedAt = now_ms
    for org_id in desired:
        if org_id not in existing_map:
            db.add(models.PersonaOrganizationMembership(
                id=str(uuid.uuid4()),
                personaId=persona.id,
                orgId=org_id,
                role="member",
                createdAt=now_ms,
                updatedAt=now_ms,
            ))
    # Keep the denormalized field consistent so existing reads/serialisation still work.
    persona.organizationIds = sorted(desired)


__all__ = [
    "get_user_organizations",
    "get_persona_org_ids",
    "get_organization_members",
    "search_organizations",
    "list_org_invites",
    "list_org_requests",
    "list_my_invites",
    "list_my_requests",
    "is_user_org_member",
    "get_user_org_role",
    "is_user_org_manager",
    "ensure_user_org_membership",
    "remove_user_org_membership",
    "update_user_org_membership_role",
    "remove_persona_org_membership",
    "ensure_persona_org_memberships",
    "list_user_org_ids",
    "get_primary_user_org_id",
]
