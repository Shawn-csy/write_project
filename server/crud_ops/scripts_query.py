from typing import Optional

from sqlalchemy import func, or_, orm
from sqlalchemy.orm import Session

import models
from .common import _ensure_list


def _prepare_public_scripts(db: Session, scripts: list[models.Script]) -> list[models.Script]:
    """Normalize gallery rows with one membership query for the whole result set."""
    persona_ids = {script.persona.id for script in scripts if script.persona}
    org_ids_by_persona = {persona_id: [] for persona_id in persona_ids}
    if persona_ids:
        memberships = db.query(
            models.PersonaOrganizationMembership.personaId,
            models.PersonaOrganizationMembership.orgId,
        ).filter(models.PersonaOrganizationMembership.personaId.in_(persona_ids)).all()
        for persona_id, org_id in memberships:
            if org_id:
                org_ids_by_persona[persona_id].append(org_id)

    for script in scripts:
        script.contentLength = len(script.content or "")
        if script.persona:
            script.persona.tags = _ensure_list(script.persona.tags)
            script.persona.organizationIds = org_ids_by_persona[script.persona.id]
            script.persona.defaultLicenseSpecialTerms = _ensure_list(script.persona.defaultLicenseSpecialTerms)
        if script.organization:
            script.organization.tags = _ensure_list(script.organization.tags)
    return scripts


def get_scripts(db: Session, ownerId: str):
    results = (
        db.query(models.Script, func.length(models.Script.content).label("contentLength"))
        .options(
            orm.defer(models.Script.content),
            orm.selectinload(models.Script.tags),
        )
        .filter(models.Script.ownerId == ownerId)
        .order_by(models.Script.sortOrder.asc(), models.Script.lastModified.desc())
        .all()
    )

    out = []
    for script, length in results:
        script.contentLength = length or 0
        out.append(script)
    return out


def get_studio_script_summaries(db: Session, ownerId: str, limit: Optional[int] = None, offset: int = 0):
    from .studio import list_studio_scripts

    if limit is None:
        items = []
        next_offset: Optional[int] = max(0, offset)
        while next_offset is not None:
            page = list_studio_scripts(
                db,
                ownerId,
                limit=100,
                offset=next_offset,
                sort="updated_desc",
            )
            items.extend(page["items"])
            next_offset = page.get("nextOffset")
        return items

    result = list_studio_scripts(
        db,
        ownerId,
        limit=limit,
        offset=offset,
        sort="updated_desc",
    )
    return result["items"]


def get_script(db: Session, script_id: str, ownerId: str):
    return (
        db.query(models.Script)
        .filter(models.Script.id == script_id, models.Script.ownerId == ownerId)
        .first()
    )


def get_public_scripts(
    db: Session,
    ownerId: Optional[str] = None,
    folder: Optional[str] = None,
    personaId: Optional[str] = None,
    organizationId: Optional[str] = None,
):
    base_q = db.query(models.Script).options(
        orm.joinedload(models.Script.owner),
        orm.joinedload(models.Script.tags),
        orm.joinedload(models.Script.organization),
        orm.joinedload(models.Script.persona),
        orm.joinedload(models.Script.series),
    ).filter(models.Script.isPublic == 1)

    if personaId:
        base_q = base_q.filter(
            or_(
                models.Script.personaId == personaId,
                (models.Script.ownerId == personaId) & (models.Script.personaId.is_(None)),
            )
        )
    if organizationId:
        base_q = base_q.filter(models.Script.organizationId == organizationId)

    if ownerId and folder is not None:
        is_inherited_public = False
        if folder != "/":
            parts = folder.strip("/").split("/")
            folder_title = parts[-1]
            folder_parent = "/" + "/".join(parts[:-1])
            if folder_parent != "/" and not folder_parent.startswith("/"):
                folder_parent = "/" + folder_parent

            folder_script = db.query(models.Script).filter(
                models.Script.ownerId == ownerId,
                models.Script.title == folder_title,
                models.Script.folder == folder_parent,
                models.Script.type == "folder",
                models.Script.isPublic == 1,
            ).first()

            if folder_script:
                is_inherited_public = True

        if is_inherited_public:
            inherited_q = db.query(models.Script).options(
                orm.joinedload(models.Script.owner),
                orm.joinedload(models.Script.tags),
                orm.joinedload(models.Script.organization),
                orm.joinedload(models.Script.persona),
                orm.joinedload(models.Script.series),
            ).filter(models.Script.ownerId == ownerId, models.Script.folder == folder)
            if personaId:
                inherited_q = inherited_q.filter(models.Script.personaId == personaId)
            if organizationId:
                inherited_q = inherited_q.filter(models.Script.organizationId == organizationId)
            results = inherited_q.order_by(models.Script.sortOrder.asc(), models.Script.title.asc()).all()
        else:
            results = base_q.filter(
                models.Script.ownerId == ownerId,
                models.Script.folder == folder,
            ).order_by(models.Script.sortOrder.asc(), models.Script.title.asc()).all()

        return _prepare_public_scripts(db, results)

    if ownerId and folder is None:
        results = base_q.filter(models.Script.ownerId == ownerId).order_by(models.Script.lastModified.desc()).all()
        return _prepare_public_scripts(db, results)

    pub_folders = db.query(models.Script).filter(models.Script.isPublic == 1, models.Script.type == "folder").all()
    public_paths = set()
    for f in pub_folders:
        path = (f.folder if f.folder != "/" else "") + "/" + f.title
        public_paths.add((f.ownerId, path))

    candidates = base_q.order_by(models.Script.lastModified.desc()).limit(200).all()

    results = []
    for s in candidates:
        if (s.ownerId, s.folder) in public_paths:
            continue

        results.append(s)
        if len(results) >= 50:
            break

    return _prepare_public_scripts(db, results)


def search_scripts(db: Session, query: str, ownerId: str):
    search = f"%{query}%"
    return (
        db.query(models.Script)
        .options(orm.defer(models.Script.content))
        .filter(
            models.Script.ownerId == ownerId,
            or_(
                models.Script.title.ilike(search),
                models.Script.content.ilike(search),
            ),
        )
        .limit(20)
        .all()
    )


__all__ = [
    "get_scripts",
    "get_studio_script_summaries",
    "get_script",
    "get_public_scripts",
    "search_scripts",
]
