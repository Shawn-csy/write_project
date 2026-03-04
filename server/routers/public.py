from fastapi import APIRouter, Depends, HTTPException, Request
from typing import List, Optional
from sqlalchemy import orm
from sqlalchemy.orm import Session
import json
import os
import time
import uuid
import crud_ops as crud
import schemas
import models
from dependencies import get_db

router = APIRouter(prefix="/api", tags=["public"])


def _load_public_terms_config() -> dict:
    default_config = {
    "termsKey": "voice_script_reader_v3",
    "version": "2026-03-04",
    "title": "台本閱覽與使用授權聲明",
    "intro": "進入台本頁面前，請確認您已了解並同意以下針對「音聲創作」的授權與系統規範：",
    "sections": [
        {
            "id": "derivative_work",
            "title": "演繹性微調與改作限制",
            "body": "台本文字著作權歸原作者所有。錄音或直播演繹時，允許進行符合情境的「演繹性微調」（如：語助詞、語氣詞、第一人稱稱謂變更、配合語句流暢度之語順調整）。除作者另有標註外，嚴禁對核心劇情、角色設定進行毀滅性改寫或惡意扭曲。",
        },
        {
            "id": "commercial_usage",
            "title": "錄音商用與直播授權",
            "body": "本平台作品預設授權「個人非商用」演繹。若台本師標註「可商用」，其範圍包含：直播贊助（SC）、廣告收益、付費平台（如 DLsite）之音聲發布。但「商用授權」僅限於演繹成果，嚴禁將台本文字本身進行轉載、集結出版、轉售獲利或投入 AI 模型訓練。",
        },
        {
            "id": "audit_log",
            "title": "同意紀錄與系統稽核",
            "body": "當您點擊同意並進入頁面時，系統將記錄您的存取資訊（包含 IP 地址、時間、裝置與瀏覽器資訊）。此紀錄僅作為版權爭議、違規申報之稽核依據，平台將依法保護您的資訊安全。",
        }
    ],
    "requiredChecks": [
        {
            "id": "final_agreement", 
            "label": "我了解錄音演繹可微調語句，但嚴禁文字轉售或 AI 訓練；並同意系統保存存取紀錄以供稽核。"
        }
    ],
}

    raw = os.getenv("PUBLIC_TERMS_CONFIG_JSON", "").strip()
    if not raw:
        return default_config
    try:
        parsed = json.loads(raw)
    except Exception:
        return default_config

    if not isinstance(parsed, dict):
        return default_config

    merged = dict(default_config)
    merged.update(parsed)
    if not isinstance(merged.get("sections"), list):
        merged["sections"] = default_config["sections"]
    if not isinstance(merged.get("requiredChecks"), list):
        merged["requiredChecks"] = default_config["requiredChecks"]
    return merged


def _extract_client_ip(request: Request) -> tuple[str, str]:
    forwarded_for = request.headers.get("x-forwarded-for", "").strip()
    if forwarded_for:
        return forwarded_for.split(",")[0].strip(), forwarded_for

    real_ip = request.headers.get("x-real-ip", "").strip()
    if real_ip:
        return real_ip, ""

    request_ip = request.client.host if request.client else ""
    return (request_ip or ""), ""


def _has_public_parent_folder(db: Session, script: models.Script) -> bool:
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


# Helper to convert User to PersonaPublic
def user_to_persona_public(user: models.User, db: Session) -> schemas.PersonaPublic:
    # Get Organization if any
    orgs = []
    org_ids = crud.list_user_org_ids(db, user.id)
    if org_ids:
        fetched_orgs = db.query(models.Organization).filter(models.Organization.id.in_(org_ids)).all()
        org_map = {o.id: o for o in fetched_orgs}
        for org_id in org_ids:
            org = org_map.get(org_id)
            if not org:
                continue
            if isinstance(org.tags, str):
                try:
                    org.tags = json.loads(org.tags)
                except Exception:
                    org.tags = []
            orgs.append(org)
    
    return schemas.PersonaPublic(
        id=user.id,
        ownerId=user.id,
        displayName=user.displayName or user.handle or "Anonymous",
        bio=user.bio or "",
        avatar=user.avatar or "",
        website=user.website or "",
        organizationIds=org_ids,
        tags=[], # Users don't have tags
        createdAt=user.createdAt,
        updatedAt=user.lastLogin, # Use lastLogin as proxy for update
        organizations=orgs
    )


@router.get("/public-terms-config", response_model=schemas.PublicTermsConfigResponse)
def read_public_terms_config():
    config = _load_public_terms_config()
    return config


@router.post("/public-terms-acceptances", response_model=schemas.PublicTermsAcceptanceResponse)
def create_public_terms_acceptance(
    payload: schemas.PublicTermsAcceptanceCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    config = _load_public_terms_config()
    expected_version = str(config.get("version") or "").strip()
    if not expected_version:
        raise HTTPException(status_code=500, detail="Public terms version not configured")

    incoming_version = str(payload.termsVersion or "").strip()
    if incoming_version != expected_version:
        raise HTTPException(status_code=400, detail="Terms version mismatch")

    script_id = (payload.scriptId or "").strip() or None
    if script_id:
        script = db.query(models.Script).filter(models.Script.id == script_id).first()
        if not script:
            raise HTTPException(status_code=404, detail="Script not found")

    required_checks = {
        str(item.get("id")).strip()
        for item in (config.get("requiredChecks") or [])
        if isinstance(item, dict) and str(item.get("id") or "").strip()
    }
    incoming_checks = {str(x).strip() for x in (payload.acceptedChecks or []) if str(x).strip()}
    if required_checks and not required_checks.issubset(incoming_checks):
        raise HTTPException(status_code=400, detail="Required checkboxes are not all accepted")

    ip_address, forwarded_for = _extract_client_ip(request)
    now_ms = int(time.time() * 1000)
    acceptance = models.PublicTermsAcceptance(
        id=str(uuid.uuid4()),
        termsKey=str(config.get("termsKey") or "public_reader_terms"),
        termsVersion=expected_version,
        scriptId=script_id,
        userId=(request.headers.get("x-user-id") or "").strip() or None,
        visitorId=(payload.visitorId or "").strip() or None,
        acceptedAt=now_ms,
        ipAddress=ip_address,
        forwardedFor=forwarded_for,
        userAgent=(request.headers.get("user-agent") or payload.userAgent or "").strip(),
        acceptLanguage=(request.headers.get("accept-language") or "").strip(),
        referer=(request.headers.get("referer") or payload.referrer or "").strip(),
        origin=(request.headers.get("origin") or "").strip(),
        host=(request.headers.get("host") or "").strip(),
        clientMeta={
            "locale": payload.locale or "",
            "timezone": payload.timezone or "",
            "timezoneOffsetMinutes": payload.timezoneOffsetMinutes,
            "platform": payload.platform or "",
            "screen": payload.screen or {},
            "viewport": payload.viewport or {},
            "pagePath": payload.pagePath or "",
            "acceptedChecks": sorted(list(incoming_checks)),
        },
        headerSnapshot={
            "x-forwarded-for": request.headers.get("x-forwarded-for", ""),
            "x-real-ip": request.headers.get("x-real-ip", ""),
            "sec-ch-ua": request.headers.get("sec-ch-ua", ""),
            "sec-ch-ua-platform": request.headers.get("sec-ch-ua-platform", ""),
            "sec-ch-ua-mobile": request.headers.get("sec-ch-ua-mobile", ""),
            "accept": request.headers.get("accept", ""),
            "accept-encoding": request.headers.get("accept-encoding", ""),
        },
    )
    db.add(acceptance)
    db.commit()

    return schemas.PublicTermsAcceptanceResponse(
        success=True,
        acceptanceId=acceptance.id,
        acceptedAt=now_ms,
    )

@router.get("/public-scripts")
def read_public_scripts(
    ownerId: Optional[str] = None,
    folder: Optional[str] = None,
    personaId: Optional[str] = None,
    organizationId: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return crud.get_public_scripts(
        db,
        ownerId=ownerId,
        folder=folder,
        personaId=personaId,
        organizationId=organizationId
    )

@router.get("/public-scripts/{script_id}", response_model=schemas.Script)
def read_public_script(script_id: str, db: Session = Depends(get_db)):
    script = db.query(models.Script).options(
        orm.joinedload(models.Script.owner),
        orm.joinedload(models.Script.tags),
        orm.joinedload(models.Script.organization),
        orm.joinedload(models.Script.persona)
    ).filter(models.Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    # If a script is not explicitly public, it must inherit public visibility from its parent folder.
    if not script.isPublic:
        if script.folder == "/":
            raise HTTPException(status_code=404, detail="Script is private")
        if script.folder != "/" and not _has_public_parent_folder(db, script):
            raise HTTPException(status_code=404, detail="Script is private")
         

    # Normalize nested JSON fields because this route reads ORM objects directly.
    # Keep parsing inline here to avoid coupling this router to private helper functions.
    
    if script.persona:
        if isinstance(script.persona.tags, str):
            try:
                script.persona.tags = json.loads(script.persona.tags)
            except:
                script.persona.tags = []
        # Double encoded check
        if isinstance(script.persona.tags, str):
             try: script.persona.tags = json.loads(script.persona.tags)
             except: pass
             
        if isinstance(script.persona.links, str):
            try:
                script.persona.links = json.loads(script.persona.links)
            except:
                script.persona.links = []

        if isinstance(script.persona.organizationIds, str):
            try:
                script.persona.organizationIds = json.loads(script.persona.organizationIds)
            except:
                script.persona.organizationIds = []

        if isinstance(script.persona.defaultLicenseSpecialTerms, str):
             try:
                 script.persona.defaultLicenseSpecialTerms = json.loads(script.persona.defaultLicenseSpecialTerms)
             except:
                 script.persona.defaultLicenseSpecialTerms = []
             # Double check
             if isinstance(script.persona.defaultLicenseSpecialTerms, str):
                  try: script.persona.defaultLicenseSpecialTerms = json.loads(script.persona.defaultLicenseSpecialTerms)
                  except: pass
             
    if script.organization:
        if isinstance(script.organization.tags, str):
            try:
                script.organization.tags = json.loads(script.organization.tags)
            except:
                script.organization.tags = []
    
    return script

@router.get("/public-scripts/{script_id}/raw")
def read_public_script_raw(script_id: str, db: Session = Depends(get_db)):
    """
    Returns the raw markdown/fountain content of a public script.
    Designed for AI Agents and lightweight text consumption.
    """
    from fastapi.responses import Response
    script = db.query(models.Script).filter(models.Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    # Keep the same visibility rule as /public-scripts/{id}.
    if not script.isPublic:
        if script.folder == "/":
            raise HTTPException(status_code=404, detail="Script is private")
        if script.folder != "/" and not _has_public_parent_folder(db, script):
            raise HTTPException(status_code=404, detail="Script is private")

    return Response(content=script.content, media_type="text/markdown")

@router.get("/public-personas/{persona_id}", response_model=schemas.PersonaPublic)
def get_public_persona(persona_id: str, db: Session = Depends(get_db)):
    # 1. Try Persona
    persona = db.query(models.Persona).filter(models.Persona.id == persona_id).first()
    if persona:
        persona.organizationIds = crud.get_persona_org_ids(db, persona)
        persona.tags = crud._ensure_list(persona.tags)
        persona.links = crud._ensure_list(persona.links)
        persona.defaultLicenseSpecialTerms = crud._ensure_list(persona.defaultLicenseSpecialTerms)
        orgs = []
        if persona.organizationIds:
            orgs = db.query(models.Organization).filter(models.Organization.id.in_(persona.organizationIds)).all()
            for o in orgs:
                if isinstance(o.tags, str):
                    try:
                        o.tags = json.loads(o.tags)
                    except Exception:
                        o.tags = []
        result = schemas.PersonaPublic.model_validate(persona)
        result.organizations = orgs
        return result
    
    # 2. Try User
    user = db.query(models.User).filter(models.User.id == persona_id).first()
    if user:
        return user_to_persona_public(user, db)

    raise HTTPException(status_code=404, detail="Author not found")

@router.get("/public-personas", response_model=List[schemas.PersonaPublic])
def list_public_personas(db: Session = Depends(get_db)):
    # Return personas that have at least one explicitly public script
    persona_ids = [
        row[0]
        for row in db.query(models.Script.personaId)
        .filter(models.Script.isPublic == 1)
        .filter(models.Script.personaId.isnot(None))
        .distinct()
        .all()
    ]

    if not persona_ids:
        return []

    personas = db.query(models.Persona).filter(models.Persona.id.in_(persona_ids)).all()
    results = []

    all_org_ids = set()
    persona_org_map = {}
    for p in personas:
        p.organizationIds = crud.get_persona_org_ids(db, p)
        p.tags = crud._ensure_list(p.tags)
        p.links = crud._ensure_list(p.links)
        p.defaultLicenseSpecialTerms = crud._ensure_list(p.defaultLicenseSpecialTerms)
        org_ids = p.organizationIds or []
        persona_org_map[p.id] = org_ids
        all_org_ids.update(org_ids)

    org_map = {}
    if all_org_ids:
        orgs = db.query(models.Organization).filter(models.Organization.id.in_(list(all_org_ids))).all()
        for o in orgs:
            if isinstance(o.tags, str):
                try:
                    o.tags = json.loads(o.tags)
                except Exception:
                    o.tags = []
        org_map = {o.id: o for o in orgs}

    for p in personas:
        result = schemas.PersonaPublic.model_validate(p)
        result.organizations = [org_map[oid] for oid in persona_org_map.get(p.id, []) if oid in org_map]
        results.append(result)
    return results

@router.get("/public-organizations/{org_id}", response_model=schemas.OrganizationPublic)
def get_public_organization(org_id: str, db: Session = Depends(get_db)):
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    if isinstance(org.tags, str):
        try:
            org.tags = json.loads(org.tags)
        except Exception:
            org.tags = []
    all_personas = db.query(models.Persona).all()
    persona_memberships = db.query(models.PersonaOrganizationMembership).filter(
        models.PersonaOrganizationMembership.orgId == org_id
    ).all()
    persona_ids_via_membership = {row.personaId for row in persona_memberships}
    members = []
    for p in all_personas:
        org_ids = crud.get_persona_org_ids(db, p)
        if isinstance(p.tags, str):
            try:
                p.tags = json.loads(p.tags)
            except Exception:
                p.tags = []
        if isinstance(p.organizationIds, str):
            try:
                p.organizationIds = json.loads(p.organizationIds)
            except Exception:
                p.organizationIds = []
        if isinstance(p.links, str):
            try:
                p.links = json.loads(p.links)
            except Exception:
                p.links = []
        if isinstance(p.defaultLicenseSpecialTerms, str):
            try:
                p.defaultLicenseSpecialTerms = json.loads(p.defaultLicenseSpecialTerms)
            except Exception:
                p.defaultLicenseSpecialTerms = []
        if p.id in persona_ids_via_membership or (org_ids and org_id in org_ids):
            members.append(p)
    # Avoid validating org.members (User objects) against Persona schema
    try:
        org.members = []
    except Exception:
        pass
    result = schemas.OrganizationPublic.model_validate(org)
    result.members = members
    return result

@router.get("/public-organizations", response_model=List[schemas.OrganizationPublic])
def list_public_organizations(db: Session = Depends(get_db)):
    # Return all organizations (even without public scripts)
    orgs = db.query(models.Organization).all()
    results = []
    for org in orgs:
        if isinstance(org.tags, str):
            try:
                org.tags = json.loads(org.tags)
            except Exception:
                org.tags = []
        try:
            org.members = []
        except Exception:
            pass
        result = schemas.OrganizationPublic.model_validate(org)
        result.members = []
        results.append(result)
    return results

@router.get("/themes/public", response_model=List[schemas.MarkerTheme])
def read_public_themes(db: Session = Depends(get_db)):
    return crud.get_public_themes(db)
