from typing import Any, Dict, List, Tuple

from sqlalchemy.orm import Session

import models


# ---------------------------------------------------------------------------
# Public visibility predicate — single source of truth for whether a script
# is publicly accessible. Used by view, like, like-status, stats, read, raw,
# and terms-acceptance endpoints so all routes enforce identical visibility rules.
# ---------------------------------------------------------------------------

def has_public_parent_folder(db: Session, script: models.Script) -> bool:
    """Return True if the script's immediate parent folder is marked isPublic."""
    if script.folder == "/":
        return True
    parts = script.folder.strip("/").split("/")
    folder_title = parts[-1]
    folder_parent = "/" + "/".join(parts[:-1])
    if folder_parent != "/" and not folder_parent.startswith("/"):
        folder_parent = "/" + folder_parent
    folder_script = db.query(models.Script).filter(
        models.Script.ownerId == script.ownerId,
        models.Script.title == folder_title,
        models.Script.folder == folder_parent,
        models.Script.type == "folder",
        models.Script.isPublic == 1,
    ).first()
    return folder_script is not None


def is_publicly_visible(db: Session, script: models.Script) -> bool:
    """Return True if a script is publicly accessible (explicitly public or in a public folder)."""
    if not script:
        return False
    if bool(getattr(script, "isPublic", 0)):
        return True
    if str(getattr(script, "folder", "/") or "/") == "/":
        return False
    return has_public_parent_folder(db, script)


AUDIENCE_TAG_GROUP = {"全年齡", "青少年", "成人", "親子", "一般向", "男性向", "女性向", "兒童"}
RATING_TAG_GROUP = {"普遍級", "保護級", "輔導級", "限制級", "G", "PG", "PG-13", "R", "NC-17"}
PUBLISH_READINESS_VALUES = {"needs_work", "ready", "published"}


def metadata_entries_to_map(entries: Any) -> Dict[str, str]:
    if not isinstance(entries, list):
        return {}
    out: Dict[str, str] = {}
    for entry in entries:
        if not isinstance(entry, dict):
            continue
        key = str(entry.get("key") or "").strip()
        if not key:
            continue
        out["".join(key.lower().split())] = str(entry.get("value") or "")
    return out


def metadata_series_name(entries: Any) -> str:
    meta = metadata_entries_to_map(entries)
    return meta.get("series") or meta.get("seriesname") or ""


def has_publish_identity(script: models.Script) -> bool:
    meta = metadata_entries_to_map(script.customMetadata)
    return bool(script.personaId or str(meta.get("publishas") or "").startswith("persona:"))


def has_complete_license(script: models.Script, persona_license_by_id: Dict[str, Tuple[str, str, str]]) -> bool:
    if script.licenseCommercial and script.licenseDerivative and script.licenseNotify:
        return True
    if script.personaId and script.personaId in persona_license_by_id:
        commercial, derivative, notify = persona_license_by_id[script.personaId]
        return bool(commercial and derivative and notify)
    return False


def compute_publish_readiness(
    script: models.Script,
    tag_names: List[str],
    persona_license_by_id: Dict[str, Tuple[str, str, str]],
) -> str:
    if script.status == "Public" or bool(script.isPublic):
        return "published"
    tag_name_set = {str(name or "") for name in tag_names}
    missing_required = [
        not str(script.title or "").strip(),
        not has_publish_identity(script),
        not bool(tag_name_set.intersection(AUDIENCE_TAG_GROUP)),
        not bool(tag_name_set.intersection(RATING_TAG_GROUP)),
        not has_complete_license(script, persona_license_by_id),
    ]
    return "needs_work" if any(missing_required) else "ready"


def load_persona_license_by_id(db: Session, owner_id: str) -> Dict[str, Tuple[str, str, str]]:
    rows = (
        db.query(
            models.Persona.id,
            models.Persona.defaultLicenseCommercial,
            models.Persona.defaultLicenseDerivative,
            models.Persona.defaultLicenseNotify,
        )
        .filter(models.Persona.ownerId == owner_id)
        .all()
    )
    return {row.id: (row.defaultLicenseCommercial or "", row.defaultLicenseDerivative or "", row.defaultLicenseNotify or "") for row in rows}


def refresh_script_publish_state(db: Session, script: models.Script) -> None:
    if not script or script.type == "folder":
        return
    rows = (
        db.query(models.Tag.name)
        .join(models.ScriptTag, models.ScriptTag.tagId == models.Tag.id)
        .filter(models.ScriptTag.scriptId == script.id)
        .all()
    )
    tag_names = [row.name for row in rows]
    persona_license_by_id = load_persona_license_by_id(db, script.ownerId)
    script.hasPublishIdentity = has_publish_identity(script)
    script.metadataSeriesName = metadata_series_name(script.customMetadata)
    script.publishReadiness = compute_publish_readiness(script, tag_names, persona_license_by_id)


def refresh_persona_scripts_publish_state(db: Session, persona_id: str, owner_id: str) -> None:
    scripts = (
        db.query(models.Script)
        .filter(
            models.Script.ownerId == owner_id,
            models.Script.personaId == persona_id,
            models.Script.type != "folder",
        )
        .all()
    )
    for script in scripts:
        refresh_script_publish_state(db, script)
