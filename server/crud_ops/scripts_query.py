from typing import Optional

from sqlalchemy import func, or_, orm
from sqlalchemy.orm import Session

import models
from .common import _ensure_list


def get_scripts(db: Session, ownerId: str):
    results = (
        db.query(models.Script, func.length(models.Script.content).label("contentLength"))
        .options(orm.defer(models.Script.content))
        .filter(models.Script.ownerId == ownerId)
        .order_by(models.Script.sortOrder.asc(), models.Script.lastModified.desc())
        .all()
    )

    out = []
    for script, length in results:
        script.contentLength = length or 0
        out.append(script)
    return out


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

        for s in results:
            if s.persona:
                s.persona.tags = _ensure_list(s.persona.tags)
                s.persona.organizationIds = _ensure_list(s.persona.organizationIds)
                s.persona.defaultLicenseTerms = _ensure_list(s.persona.defaultLicenseTerms)
            if s.organization:
                s.organization.tags = _ensure_list(s.organization.tags)
        return results

    if ownerId and folder is None:
        results = base_q.filter(models.Script.ownerId == ownerId).order_by(models.Script.lastModified.desc()).all()
        for s in results:
            if s.persona:
                s.persona.tags = _ensure_list(s.persona.tags)
                s.persona.organizationIds = _ensure_list(s.persona.organizationIds)
                s.persona.defaultLicenseTerms = _ensure_list(s.persona.defaultLicenseTerms)
            if s.organization:
                s.organization.tags = _ensure_list(s.organization.tags)
        return results

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

        if s.persona:
            s.persona.tags = _ensure_list(s.persona.tags)
            s.persona.organizationIds = _ensure_list(s.persona.organizationIds)
            s.persona.defaultLicenseTerms = _ensure_list(s.persona.defaultLicenseTerms)
        if s.organization:
            s.organization.tags = _ensure_list(s.organization.tags)

        results.append(s)
        if len(results) >= 50:
            break

    return results


def search_scripts(db: Session, query: str, ownerId: str):
    search = f"%{query}%"
    return (
        db.query(models.Script)
        .filter(
            models.Script.ownerId == ownerId,
            or_(models.Script.title.like(search), models.Script.content.like(search)),
        )
        .limit(20)
        .all()
    )


__all__ = [
    "get_scripts",
    "get_script",
    "get_public_scripts",
    "search_scripts",
]

