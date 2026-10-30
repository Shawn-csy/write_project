from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import orm
from sqlalchemy.orm import Session
import json
import os
import time
import uuid
import unicodedata
from urllib.parse import urlparse
import crud_ops as crud
import schemas
import models
from crud_ops.publish_state import is_publicly_visible as _is_publicly_visible_script, has_public_parent_folder as _has_public_parent_folder
from dependencies import get_db, get_current_user_id
from rate_limit import limiter
from utils import normalize_homepage_banner_value, safe_json_list
from services.public_feedback_email import send_public_feedback_notification

router = APIRouter(prefix="/api", tags=["public"])
HOMEPAGE_BANNER_SETTING_KEY = "homepage_banner"


def _normalize_external_author_key(value: str) -> str:
    return unicodedata.normalize("NFKC", str(value or "").strip()).lower()


def _public_profile_url(value: object, *, image: bool = False) -> str:
    raw = str(value or "").strip()[:2000]
    if not raw:
        return ""
    if image and raw.startswith("/media/"):
        return raw
    parsed = urlparse(raw)
    if parsed.scheme in {"http", "https"} and parsed.hostname:
        return raw
    raise HTTPException(status_code=400, detail="請使用有效的公開 http(s) 網址")

_banner_cache: tuple[dict, float] | None = None
_BANNER_TTL = 120  # seconds


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


@router.post("/public-feedback", response_model=schemas.PublicFeedbackResponse)
@limiter.limit("5/minute")
def create_public_feedback(
    request: Request,
    payload: schemas.PublicFeedbackCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Receive a short bug report or public-listing request from visitors."""
    if payload.website:
        # Silently accept the honeypot so simple bots do not learn the field is
        # being used. No message is stored or exposed.
        now_ms = int(time.time() * 1000)
        return schemas.PublicFeedbackResponse(success=True, feedbackId="", createdAt=now_ms)

    contact_name = (payload.contactName or "").strip()
    contact_email = (payload.contactEmail or "").strip()
    script_title = (payload.scriptTitle or "").strip()
    script_summary = (payload.scriptSummary or "").strip()
    author_name = (payload.authorName or "").strip()
    author_bio = (payload.authorBio or "").strip()
    author_social_url = (payload.authorSocialUrl or "").strip()
    document_url = (payload.documentUrl or "").strip()
    cover_url = (payload.coverUrl or "").strip()
    categories = payload.categories or []
    series_name = (payload.seriesName or "").strip()
    notes = (payload.notes or "").strip()
    content = (payload.content or "").strip()
    if not contact_name and not contact_email:
        raise HTTPException(status_code=400, detail="請至少填寫聯絡名稱或 Email")
    if contact_email and (len(contact_email) > 320 or "@" not in contact_email or " " in contact_email):
        raise HTTPException(status_code=400, detail="Email 格式不正確")
    if len(contact_name) > 120:
        raise HTTPException(status_code=400, detail="聯絡名稱過長")
    if payload.kind == "listing":
        activity = None
        if payload.activityPageId:
            activity = db.query(models.ActivityPage).filter(
                models.ActivityPage.id == payload.activityPageId,
                models.ActivityPage.status == "published",
                models.ActivityPage.acceptingSubmissions.is_(True),
            ).first()
            if not activity:
                raise HTTPException(status_code=404, detail="此活動目前未開放台本徵件")
            if not payload.confirmPublicListing:
                raise HTTPException(status_code=400, detail="請確認台本連結可公開瀏覽，且您有權提交此作品")
        import re
        if not script_title:
            raise HTTPException(status_code=400, detail="請填寫台本名稱")
        if len(script_title) > 300:
            raise HTTPException(status_code=400, detail="台本名稱過長")
        if len(script_summary) > 4000:
            raise HTTPException(status_code=400, detail="台本介紹過長")
        if not author_name:
            raise HTTPException(status_code=400, detail="請填寫台本作者名稱")
        if len(author_name) > 120:
            raise HTTPException(status_code=400, detail="作者名稱過長")
        if len(author_bio) > 4000:
            raise HTTPException(status_code=400, detail="作者介紹過長")
        if not re.fullmatch(r"https://[^\s]+", document_url, flags=re.IGNORECASE):
            raise HTTPException(status_code=400, detail="請提供有效的 HTTPS 台本文件連結")
        if len(document_url) > 2000:
            raise HTTPException(status_code=400, detail="台本文件連結過長")
        if author_social_url and not re.fullmatch(r"https://[^\s]+", author_social_url, flags=re.IGNORECASE):
            raise HTTPException(status_code=400, detail="作者社群連結需使用 HTTPS")
        if len(author_social_url) > 2000:
            raise HTTPException(status_code=400, detail="作者社群連結過長")
        if cover_url and not re.fullmatch(r"https://[^\s]+", cover_url, flags=re.IGNORECASE):
            raise HTTPException(status_code=400, detail="封面連結需使用 HTTPS")
        if len(cover_url) > 2000:
            raise HTTPException(status_code=400, detail="封面連結過長")
        if len(series_name) > 120:
            raise HTTPException(status_code=400, detail="系列名稱過長")
        if len(notes) > 10000:
            raise HTTPException(status_code=400, detail="備註過長")
        content = notes
    elif len(content) < 5:
        raise HTTPException(status_code=400, detail="內容至少需要 5 個字")
    if len(content) > 10000:
        raise HTTPException(status_code=400, detail="內容過長")

    ip_address, forwarded_for = _extract_client_ip(request)
    now_ms = int(time.time() * 1000)
    activity_submission_script_id = None
    if payload.kind == "listing" and payload.activityPageId:
        from urllib.parse import urlparse
        activity = db.query(models.ActivityPage).filter(models.ActivityPage.id == payload.activityPageId).first()
        parsed_source = urlparse(document_url)
        source_domain = (parsed_source.hostname or "").lower()[:255]
        external_script = db.query(models.ExternalPublicScript).filter(models.ExternalPublicScript.sourceUrl == document_url).first()
        if not external_script:
            external_script = models.ExternalPublicScript(
                id=str(uuid.uuid4()), ownerId=None, sourceUrl=document_url, canonicalUrl=document_url,
                sourceDomain=source_domain, sourceName=source_domain, authorName=author_name,
                authorBio=author_bio, authorUrl=author_social_url, remoteTitle=script_title,
                remoteSummary=script_summary, remoteCoverUrl=cover_url, titleOverride=script_title,
                summaryOverride=script_summary, coverUrlOverride=cover_url, seriesName=series_name,
                categories=categories, status="published", createdAt=now_ms, updatedAt=now_ms, mountedAt=now_ms,
            )
            db.add(external_script)
        else:
            external_script.authorName = author_name
            external_script.authorBio = author_bio
            external_script.authorUrl = author_social_url
            external_script.titleOverride = script_title
            external_script.summaryOverride = script_summary
            external_script.coverUrlOverride = cover_url
            external_script.seriesName = series_name
            external_script.categories = categories
            external_script.status = "published"
            external_script.updatedAt = now_ms
            external_script.mountedAt = external_script.mountedAt or now_ms
        if external_script.id not in (activity.externalScriptIds if isinstance(activity.externalScriptIds, list) else []):
            activity.externalScriptIds = [*(activity.externalScriptIds if isinstance(activity.externalScriptIds, list) else []), external_script.id][:100]
        activity.updatedAt = now_ms
        activity_submission_script_id = external_script.id
    row = models.PublicFeedback(
        id=str(uuid.uuid4()),
        kind=payload.kind,
        contactName=contact_name[:120],
        contactEmail=contact_email[:320],
        scriptTitle=script_title[:300],
        scriptSummary=script_summary[:4000],
        authorName=author_name[:120],
        authorBio=author_bio[:4000],
        authorSocialUrl=author_social_url[:2000],
        documentUrl=document_url[:2000],
        coverUrl=cover_url[:2000],
        categories=categories,
        seriesName=series_name[:120],
        notes=notes[:10000],
        content=content,
        pageUrl=(payload.pageUrl or "").strip()[:2000],
        activityPageId=payload.activityPageId if payload.kind == "listing" else None,
        activityScriptId=activity_submission_script_id,
        status="closed" if activity_submission_script_id else "new",
        ipAddress=ip_address[:200],
        forwardedFor=forwarded_for[:1000],
        userAgent=(request.headers.get("user-agent") or "")[:2000],
        referer=(request.headers.get("referer") or "")[:2000],
        createdAt=now_ms,
        updatedAt=now_ms,
    )
    db.add(row)
    db.commit()
    if activity_submission_script_id:
        from routers import public_bundle
        public_bundle.invalidate_public_bundle_cache()
    background_tasks.add_task(
        send_public_feedback_notification,
        {
            "id": row.id,
            "kind": row.kind,
            "contactName": row.contactName,
            "contactEmail": row.contactEmail,
            "scriptTitle": row.scriptTitle,
            "scriptSummary": row.scriptSummary,
            "authorName": row.authorName,
            "authorBio": row.authorBio,
            "authorSocialUrl": row.authorSocialUrl,
            "documentUrl": row.documentUrl,
            "coverUrl": row.coverUrl,
            "categories": row.categories or [],
            "seriesName": row.seriesName,
            "notes": row.notes,
            "content": row.content,
            "pageUrl": row.pageUrl,
            "createdAt": str(row.createdAt),
        },
    )
    return schemas.PublicFeedbackResponse(success=True, feedbackId=row.id, createdAt=now_ms)


@router.post("/public-demo-submissions", response_model=schemas.PublicDemoSubmissionResponse)
@limiter.limit("5/hour")
def create_public_demo_submission(
    request: Request,
    payload: schemas.PublicDemoSubmissionCreate,
    db: Session = Depends(get_db),
):
    """Accept public demo suggestions; submissions stay private until approved."""
    now_ms = int(time.time() * 1000)
    if payload.website:
        return schemas.PublicDemoSubmissionResponse(success=True, submissionId="", createdAt=now_ms)
    activity = None
    if payload.activityPageId:
        activity = db.query(models.ActivityPage).filter(
            models.ActivityPage.id == payload.activityPageId,
            models.ActivityPage.status == "published",
            models.ActivityPage.acceptingSubmissions.is_(True),
        ).first()
        if not activity:
            raise HTTPException(status_code=404, detail="此活動目前未開放 Demo 徵件")
    if not payload.voiceActorIds and not any(actor.name.strip() for actor in payload.manualVoiceActors):
        raise HTTPException(status_code=400, detail="請至少加入一位聲演，才能送出 Demo")
    if not payload.confirmPublic:
        raise HTTPException(status_code=400, detail="請確認連結可公開瀏覽且您有權提供此連結")
    if payload.manualVoiceActors and not payload.confirmVoiceActorProfiles:
        raise HTTPException(status_code=400, detail="請確認已取得名單外聲演公開姓名與社群連結的同意")

    display_name = payload.displayName[:120]
    contact_email = payload.contactEmail[:320]
    if contact_email and ("@" not in contact_email or " " in contact_email):
        raise HTTPException(status_code=400, detail="Email 格式不正確")
    demo_name = payload.demoName[:160]
    cast = payload.cast[:500]
    description = payload.description[:2000]
    voice_actor_ids = payload.voiceActorIds
    if voice_actor_ids:
        personas = db.query(models.Persona).filter(models.Persona.id.in_(voice_actor_ids)).all()
        valid_personas = {
            persona.id: persona
            for persona in personas
            if not persona.voiceActorHidden and any(
                marker in str(tag).casefold()
                for tag in crud._ensure_list(persona.tags)
                for marker in ("聲演", "配音", "voice actor", "voice-actor", "voiceactor")
            )
        }
        if len(valid_personas) != len(voice_actor_ids):
            raise HTTPException(status_code=400, detail="聲演名單已更新，請重新選擇名單中的公開聲演身份")
        voice_actor_ids = [persona_id for persona_id in voice_actor_ids if persona_id in valid_personas]

    script_id = None
    external_script_id = None
    if payload.scriptType == "internal":
        if not payload.scriptId or payload.externalScriptId:
            raise HTTPException(status_code=400, detail="請選擇本站公開台本")
        script = db.query(models.Script).filter(models.Script.id == payload.scriptId).first()
        if not script or not _is_publicly_visible_script(db, script):
            raise HTTPException(status_code=404, detail="找不到可投稿的公開台本")
        script_id = script.id
        script_title = script.title or "未命名台本"
        public_base = os.getenv("PUBLIC_BASE_URL", "https://open-scripts.shawnup.com").rstrip("/")
        script_url = f"{public_base}/read/{script.id}"
        if activity and script.id not in (activity.scriptIds if isinstance(activity.scriptIds, list) else []):
            raise HTTPException(status_code=400, detail="請選擇此活動內的台本")
    else:
        if not payload.externalScriptId or payload.scriptId:
            raise HTTPException(status_code=400, detail="請選擇已收錄的外部台本")
        external_script = db.query(models.ExternalPublicScript).filter(
            models.ExternalPublicScript.id == payload.externalScriptId,
            models.ExternalPublicScript.status == "published",
        ).first()
        if not external_script:
            raise HTTPException(status_code=404, detail="找不到可投稿的外部台本")
        external_script_id = external_script.id
        script_title = external_script.titleOverride or external_script.remoteTitle or "外部台本"
        script_url = external_script.sourceUrl
        if activity and external_script.id not in (activity.externalScriptIds if isinstance(activity.externalScriptIds, list) else []):
            raise HTTPException(status_code=400, detail="請選擇此活動內的台本")

    row = models.PublicDemoSubmission(
        id=str(uuid.uuid4()),
        scriptType=payload.scriptType,
        scriptId=script_id,
        externalScriptId=external_script_id,
        activityPageId=activity.id if activity else None,
        scriptTitle=script_title[:500],
        scriptUrl=script_url[:2000],
        demoName=demo_name,
        demoUrl=payload.demoUrl,
        coverUrl=payload.coverUrl,
        cast=cast,
        voiceTypes=payload.voiceTypes,
        voiceActorIds=voice_actor_ids,
        # Profile IDs are assigned by the moderator on approval; never trust one from a public submitter.
        manualVoiceActors=[{"name": actor.name, "socialUrl": actor.socialUrl} for actor in payload.manualVoiceActors],
        description=description,
        displayName=display_name,
        contactEmail=contact_email,
        status="approved" if activity else "pending",
        reviewedAt=now_ms if activity else None,
        reviewedBy="activity-submission" if activity else None,
        createdAt=now_ms,
    )
    db.add(row)
    db.commit()
    if activity:
        from routers import public_bundle
        public_bundle.invalidate_public_bundle_cache()
    return schemas.PublicDemoSubmissionResponse(submissionId=row.id, createdAt=now_ms)


def _serialize_owned_demo(row: models.PublicDemoSubmission) -> dict:
    return {
        "id": row.id,
        "ownerId": row.ownerId,
        "voiceActorPersonaId": row.voiceActorPersonaId,
        "scriptType": row.scriptType,
        "scriptId": row.scriptId,
        "externalScriptId": row.externalScriptId,
        "scriptTitle": row.scriptTitle,
        "scriptUrl": row.scriptUrl,
        "demoName": row.demoName,
        "demoUrl": row.demoUrl,
        "coverUrl": row.coverUrl or "",
        "cast": row.cast,
        "voiceTypes": row.voiceTypes or [],
        "voiceActorIds": row.voiceActorIds or [],
        "manualVoiceActors": row.manualVoiceActors or [],
        "voiceActorNames": [],
        "description": row.description,
        "displayName": row.displayName,
        "contactEmail": row.contactEmail,
        "status": row.status,
        "reviewedAt": row.reviewedAt,
        "createdAt": row.createdAt,
    }


def _owned_voice_actor(db: Session, persona_id: str, owner_id: str) -> models.Persona:
    persona = db.query(models.Persona).filter(
        models.Persona.id == persona_id,
        models.Persona.ownerId == owner_id,
    ).first()
    if not persona:
        raise HTTPException(status_code=404, detail="找不到此帳戶管理的公開身份")
    if persona.voiceActorHidden:
        raise HTTPException(status_code=400, detail="此聲演身份目前未公開")
    tags = [str(tag).strip().casefold() for tag in crud._ensure_list(persona.tags)]
    if not any(tag in {"聲演", "配音", "voice actor", "voice-actor", "voiceactor"} for tag in tags):
        raise HTTPException(status_code=400, detail="請先在公開身份中啟用「聲演」角色")
    return persona


@router.get("/my-demo-submissions", response_model=schemas.PublicDemoSubmissionListResponse)
def list_my_demo_submissions(
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    rows = db.query(models.PublicDemoSubmission).filter(
        models.PublicDemoSubmission.ownerId == owner_id,
    ).order_by(models.PublicDemoSubmission.createdAt.desc()).limit(200).all()
    return schemas.PublicDemoSubmissionListResponse(total=len(rows), items=[_serialize_owned_demo(row) for row in rows])


@router.post("/my-demo-submissions", response_model=schemas.PublicDemoSubmissionRecord)
@limiter.limit("20/hour")
def create_my_demo_submission(
    request: Request,
    payload: schemas.StudioDemoSubmissionCreate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    now_ms = int(time.time() * 1000)
    persona = _owned_voice_actor(db, payload.voiceActorPersonaId, owner_id)

    if payload.scriptType == "internal":
        if not payload.scriptId or payload.externalScriptId:
            raise HTTPException(status_code=400, detail="請選擇本站公開台本")
        script = db.query(models.Script).filter(models.Script.id == payload.scriptId).first()
        if not script or not _is_publicly_visible_script(db, script):
            raise HTTPException(status_code=404, detail="找不到可投稿的公開台本")
        script_id, external_script_id = script.id, None
        script_title = script.title or "未命名台本"
        script_url = f"{os.getenv('PUBLIC_BASE_URL', 'https://open-scripts.shawnup.com').rstrip('/')}/read/{script.id}"
    else:
        if not payload.externalScriptId or payload.scriptId:
            raise HTTPException(status_code=400, detail="請選擇已收錄的外部台本")
        external_script = db.query(models.ExternalPublicScript).filter(
            models.ExternalPublicScript.id == payload.externalScriptId,
            models.ExternalPublicScript.status == "published",
        ).first()
        if not external_script:
            raise HTTPException(status_code=404, detail="找不到已公開的外部台本")
        script_id, external_script_id = None, external_script.id
        script_title = external_script.titleOverride or external_script.remoteTitle or "外部台本"
        script_url = external_script.sourceUrl

    row = models.PublicDemoSubmission(
        id=str(uuid.uuid4()),
        ownerId=owner_id,
        voiceActorPersonaId=persona.id,
        scriptType=payload.scriptType,
        scriptId=script_id,
        externalScriptId=external_script_id,
        scriptTitle=script_title[:500],
        scriptUrl=script_url[:2000],
        demoName=payload.demoName[:160],
        demoUrl=payload.demoUrl,
        coverUrl=payload.coverUrl,
        cast=payload.cast[:500],
        voiceTypes=payload.voiceTypes,
        voiceActorIds=[persona.id],
        manualVoiceActors=[],
        description=payload.description[:2000],
        displayName=persona.displayName or "",
        contactEmail="",
        status="approved",
        reviewedAt=now_ms,
        reviewedBy=owner_id,
        createdAt=now_ms,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    from routers import public_bundle
    public_bundle.invalidate_public_bundle_cache()
    return _serialize_owned_demo(row)


@router.put("/my-demo-submissions/{submission_id}", response_model=schemas.PublicDemoSubmissionRecord)
def update_my_demo_submission(
    submission_id: str,
    payload: schemas.StudioDemoSubmissionUpdate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    row = db.query(models.PublicDemoSubmission).filter(
        models.PublicDemoSubmission.id == submission_id,
        models.PublicDemoSubmission.ownerId == owner_id,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="找不到這筆 Demo")
    row.demoName = payload.demoName[:160]
    row.demoUrl = payload.demoUrl
    row.coverUrl = payload.coverUrl
    row.cast = payload.cast[:500]
    row.voiceTypes = payload.voiceTypes
    row.description = payload.description[:2000]
    row.status = "approved"
    row.reviewedAt = int(time.time() * 1000)
    row.reviewedBy = owner_id
    db.commit()
    db.refresh(row)
    from routers import public_bundle
    public_bundle.invalidate_public_bundle_cache()
    return _serialize_owned_demo(row)


@router.delete("/my-demo-submissions/{submission_id}")
def delete_my_demo_submission(
    submission_id: str,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    row = db.query(models.PublicDemoSubmission).filter(
        models.PublicDemoSubmission.id == submission_id,
        models.PublicDemoSubmission.ownerId == owner_id,
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="找不到這筆 Demo")
    db.delete(row)
    db.commit()
    from routers import public_bundle
    public_bundle.invalidate_public_bundle_cache()
    return {"success": True, "id": submission_id}


def _has_public_script_for_persona(db: Session, persona_id: str) -> bool:
    scripts = db.query(models.Script).filter(models.Script.personaId == persona_id).all()
    return any(_is_publicly_visible_script(db, script) for script in scripts)


def _is_voice_actor_persona(persona: models.Persona) -> bool:
    return any(
        str(tag).strip().casefold() in {"聲演", "配音", "voice actor", "voice-actor", "voiceactor"}
        for tag in crud._ensure_list(persona.tags)
    )


def _public_persona_tags(tags: object) -> list[str]:
    return [str(tag) for tag in crud._ensure_list(tags) if str(tag).strip() != "待認領"]


def _external_link_label(url: str) -> str:
    value = str(url or "").lower()
    if "x.com/" in value or "twitter.com/" in value:
        return "X / Twitter"
    if "youtube.com/" in value or "youtu.be/" in value:
        return "YouTube"
    return "外部作者頁"


def _build_public_identity_context(db: Session, persona_ids: list[str]) -> dict:
    """Load all role and source relationships for a set of identities in batches."""
    ids = [value for value in dict.fromkeys(persona_ids) if value]
    if not ids:
        return {}
    roles_by_persona: dict[str, list[models.PersonaRole]] = {value: [] for value in ids}
    for row in db.query(models.PersonaRole).filter(models.PersonaRole.personaId.in_(ids)).all():
        roles_by_persona.setdefault(row.personaId, []).append(row)

    internal_scripts_by_persona: dict[str, list[models.Script]] = {value: [] for value in ids}
    script_rows = db.query(models.Script).filter(models.Script.personaId.in_(ids)).all()
    for row in script_rows:
        if _is_publicly_visible_script(db, row):
            internal_scripts_by_persona.setdefault(row.personaId, []).append(row)

    demos_by_persona: dict[str, list[models.PublicDemoSubmission]] = {value: [] for value in ids}
    approved_demos = db.query(models.PublicDemoSubmission).filter(models.PublicDemoSubmission.status == "approved").all()
    for demo in approved_demos:
        actor_ids = []
        if demo.voiceActorPersonaId:
            actor_ids.append(str(demo.voiceActorPersonaId))
        actor_ids.extend(str(value) for value in crud._ensure_list(demo.voiceActorIds) if value)
        actor_ids.extend(
            str(actor.get("personaId") or "")
            for actor in crud._ensure_list(demo.manualVoiceActors)
            if isinstance(actor, dict) and actor.get("personaId")
        )
        for persona_id in set(actor_ids):
            if persona_id in demos_by_persona:
                demos_by_persona[persona_id].append(demo)

    external_authors_by_persona: dict[str, list[models.ExternalAuthor]] = {value: [] for value in ids}
    external_authors = db.query(models.ExternalAuthor).filter(
        models.ExternalAuthor.linkedPersonaId.in_(ids),
        models.ExternalAuthor.isHidden.is_(False),
    ).all()
    for author in external_authors:
        external_authors_by_persona.setdefault(author.linkedPersonaId, []).append(author)
    author_ids = [author.id for author in external_authors]
    external_scripts_by_author: dict[str, list[models.ExternalPublicScript]] = {}
    if author_ids:
        for row in db.query(models.ExternalPublicScript).filter(
            models.ExternalPublicScript.externalAuthorId.in_(author_ids),
            models.ExternalPublicScript.status == "published",
        ).all():
            external_scripts_by_author.setdefault(row.externalAuthorId, []).append(row)
    author_keys = [author.canonicalKey for author in external_authors if author.canonicalKey]
    supplements_by_key = {}
    if author_keys:
        supplements_by_key = {
            row.authorKey: row
            for row in db.query(models.ExternalAuthorPageSupplement).filter(
                models.ExternalAuthorPageSupplement.authorKey.in_(author_keys)
            ).all()
        }
    return {
        "roles": roles_by_persona,
        "internalScripts": internal_scripts_by_persona,
        "demos": demos_by_persona,
        "externalAuthors": external_authors_by_persona,
        "externalScripts": external_scripts_by_author,
        "supplements": supplements_by_key,
    }


def _public_identity_projection(
    db: Session,
    persona: models.Persona,
    organizations: list[models.Organization] | None = None,
    context: dict | None = None,
) -> schemas.PersonaPublic:
    """Build the one public identity projection used by every public page.

    Persona is the identity root. Author and voice-actor are roles derived from
    explicit work/demo relationships. External author metadata may enrich the
    root only through ExternalAuthorPageProfile.linkedPersonaId; display-name
    matching is intentionally not part of this projection.
    """
    result = schemas.PersonaPublic.model_validate(persona)
    result.organizations = organizations or []

    context = context or _build_public_identity_context(db, [persona.id])
    has_internal_scripts = bool(context.get("internalScripts", {}).get(persona.id))
    has_voice_performances = bool(context.get("demos", {}).get(persona.id))
    self_declared_voice_actor = _is_voice_actor_persona(persona)
    role_records = context.get("roles", {}).get(persona.id, [])
    visible_role_names = {row.role for row in role_records if row.isVisible}
    linked_authors = context.get("externalAuthors", {}).get(persona.id, [])
    author_keys = [author.canonicalKey for author in linked_authors if author.canonicalKey]
    external_rows = [
        row
        for author in linked_authors
        for row in context.get("externalScripts", {}).get(author.id, [])
    ]

    roles: list[str] = []
    if "scriptwriter" in visible_role_names or (not role_records and (has_internal_scripts or external_rows)):
        roles.append("scriptwriter")
    if "voice_actor" in visible_role_names or (not role_records and not persona.voiceActorHidden and (self_declared_voice_actor or has_voice_performances)):
        roles.append("voice_actor")
    result.roles = roles

    sources = ["persona"]
    if "scriptwriter" in roles and has_internal_scripts:
        sources.append("internal_script")
    if "scriptwriter" in roles and external_rows:
        sources.append("external_script")
    if "voice_actor" in roles and self_declared_voice_actor:
        sources.append("self_declared_voice_actor")
    if "voice_actor" in roles and has_voice_performances:
        sources.append("demo")
    result.profileSources = sources
    role_profiles: dict[str, Any] = {
        row.role: dict(row.profile or {})
        for row in role_records
        if row.isVisible and isinstance(row.profile, dict)
    }
    profile_urls = [str(author.profileUrl or "").strip() for author in linked_authors if str(author.profileUrl or "").strip()]
    scriptwriter_profile = dict(role_profiles.get("scriptwriter") or {})
    if linked_authors:
        scriptwriter_profile.update({
            "externalAuthors": [
                {
                    "id": author.id,
                    "displayName": author.displayName or "",
                    "bio": author.bio or "",
                    "avatar": author.avatarUrl or "",
                    "website": author.profileUrl or "",
                }
                for author in linked_authors
            ],
            "website": scriptwriter_profile.get("website") or (profile_urls[0] if profile_urls else ""),
        })
    if author_keys:
        supplements = [context.get("supplements", {}).get(key) for key in author_keys]
        for supplement in supplements:
            if not supplement:
                continue
            profile = supplement.profile if isinstance(supplement.profile, dict) else {}
            website = str(profile.get("website") or "").strip()
            if website and not scriptwriter_profile.get("website"):
                scriptwriter_profile["website"] = website
            writer_links = [item for item in scriptwriter_profile.get("links") or [] if isinstance(item, dict)]
            seen_urls = {str(item.get("url") or "").strip() for item in writer_links}
            for item in profile.get("links") or []:
                if not isinstance(item, dict):
                    continue
                url = str(item.get("url") or "").strip()
                if not url or url in seen_urls:
                    continue
                writer_links.append({"label": str(item.get("label") or _external_link_label(url)), "url": url})
                seen_urls.add(url)
            scriptwriter_profile["links"] = writer_links
    if scriptwriter_profile and "scriptwriter" in roles:
        role_profiles["scriptwriter"] = scriptwriter_profile
    voice_profile = role_profiles.get("voice_actor") or {}
    if "voice_actor" in roles:
        result.voiceActorWorks = [item for item in voice_profile.get("works") or result.voiceActorWorks if isinstance(item, dict)]
        result.voiceActorOrganizations = [item for item in voice_profile.get("organizations") or result.voiceActorOrganizations if isinstance(item, dict)]
        result.voiceActorContributors = [item for item in voice_profile.get("contributors") or result.voiceActorContributors if isinstance(item, dict)]
    result.roleProfiles = role_profiles
    return result


def _has_approved_demo_for_persona(db: Session, persona_id: str) -> bool:
    rows = db.query(models.PublicDemoSubmission).filter(models.PublicDemoSubmission.status == "approved").all()
    for row in rows:
        if row.voiceActorPersonaId == persona_id or persona_id in crud._ensure_list(row.voiceActorIds):
            return True
        actors = crud._ensure_list(row.manualVoiceActors)
        if any(isinstance(actor, dict) and str(actor.get("personaId") or "") == persona_id for actor in actors):
            return True
    return False


def _has_public_script_for_organization(db: Session, org_id: str) -> bool:
    scripts = db.query(models.Script).filter(models.Script.organizationId == org_id).all()
    return any(_is_publicly_visible_script(db, script) for script in scripts)


def _get_public_org_map(db: Session, org_ids: list[str]) -> dict[str, models.Organization]:
    if not org_ids:
        return {}
    uniq_ids = [oid for oid in dict.fromkeys(org_ids) if oid]
    if not uniq_ids:
        return {}
    orgs = db.query(models.Organization).filter(models.Organization.id.in_(uniq_ids)).all()
    out = {}
    for org in orgs:
        if not _has_public_script_for_organization(db, org.id):
            continue
        if isinstance(org.tags, str):
            try:
                org.tags = json.loads(org.tags)
            except Exception:
                org.tags = []
        out[org.id] = org
    return out


def sanitize_public_script(script: models.Script):
    owner = getattr(script, "owner", None)
    if owner:
        # Public script payload should not expose account email.
        try:
            owner.email = None
        except Exception:
            pass
    persona = getattr(script, "persona", None)
    if persona:
        persona.tags = _public_persona_tags(persona.tags)
    return script



@router.get("/public-terms-config")
def read_public_terms_config():
    from fastapi.responses import JSONResponse
    config = _load_public_terms_config()
    return JSONResponse(content=config, headers={"Cache-Control": "public, max-age=300, stale-while-revalidate=600"})


@router.get("/public-homepage-banner", response_model=schemas.HomepageBannerSetting)
def read_public_homepage_banner(db: Session = Depends(get_db)):
    global _banner_cache
    now = time.monotonic()
    if _banner_cache is not None and now < _banner_cache[1]:
        return schemas.HomepageBannerSetting(**_banner_cache[0])
    row = db.query(models.SiteSetting).filter(models.SiteSetting.key == HOMEPAGE_BANNER_SETTING_KEY).first()
    if not row or not str(getattr(row, "value", "") or "").strip():
        result = schemas.HomepageBannerSetting(items=[])
    else:
        result = schemas.HomepageBannerSetting(**normalize_homepage_banner_value(row.value))
    _banner_cache = (result.model_dump(), now + _BANNER_TTL)
    return result


@router.post("/public-terms-acceptances", response_model=schemas.PublicTermsAcceptanceResponse)
@limiter.limit("5/minute")
def create_public_terms_acceptance(
    request: Request,
    payload: schemas.PublicTermsAcceptanceCreate,
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
        if not _is_publicly_visible_script(db, script):
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
        # Public endpoint is intentionally unauthenticated; never trust caller-provided user id headers.
        userId=None,
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

@router.get("/public-scripts", response_model=List[schemas.Script])
def read_public_scripts(
    ownerId: Optional[str] = None,
    folder: Optional[str] = None,
    personaId: Optional[str] = None,
    organizationId: Optional[str] = None,
    db: Session = Depends(get_db)
):
    scripts = crud.get_public_scripts(
        db,
        ownerId=ownerId,
        folder=folder,
        personaId=personaId,
        organizationId=organizationId
    )
    return [sanitize_public_script(s) for s in scripts]

@router.get("/public-scripts/{script_id}", response_model=schemas.Script)
def read_public_script(script_id: str, db: Session = Depends(get_db)):
    script = db.query(models.Script).options(
        orm.joinedload(models.Script.owner),
        orm.joinedload(models.Script.tags),
        orm.joinedload(models.Script.organization),
        orm.joinedload(models.Script.persona),
        orm.joinedload(models.Script.series),
    ).filter(models.Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    # If a script is not explicitly public, it must inherit public visibility from its parent folder.
    if not script.isPublic:
        if script.folder == "/":
            raise HTTPException(status_code=404, detail="Script is private")
        if script.folder != "/" and not _has_public_parent_folder(db, script):
            raise HTTPException(status_code=404, detail="Script is private")
         

    # Normalize nested JSON fields that may be stored as strings in the DB.
    if script.persona:
        script.persona.tags = safe_json_list(script.persona.tags)
        script.persona.tags = _public_persona_tags(script.persona.tags)
        script.persona.links = safe_json_list(script.persona.links)
        script.persona.organizationIds = crud.get_persona_org_ids(db, script.persona)
        script.persona.defaultLicenseSpecialTerms = safe_json_list(script.persona.defaultLicenseSpecialTerms)

    if script.organization:
        script.organization.tags = safe_json_list(script.organization.tags)
    
    return sanitize_public_script(script)

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

@router.post("/external-author-profile-submissions", response_model=schemas.ExternalAuthorProfileSubmissionResponse)
@limiter.limit("3/hour")
def create_external_author_profile_submission(
    request: Request,
    payload: schemas.ExternalAuthorProfileSubmissionCreate,
    db: Session = Depends(get_db),
):
    now_ms = int(time.time() * 1000)
    if payload.websiteTrap:
        return schemas.ExternalAuthorProfileSubmissionResponse(success=True, submissionId="", createdAt=now_ms)
    author_key = _normalize_external_author_key(payload.authorKey)
    external_author = None
    if payload.externalAuthorId:
        external_author = db.query(models.ExternalAuthor).filter(
            models.ExternalAuthor.id == payload.externalAuthorId,
            models.ExternalAuthor.isHidden.is_(False),
        ).first()
    elif author_key:
        candidates = db.query(models.ExternalAuthor).filter(
            models.ExternalAuthor.canonicalKey == author_key,
            models.ExternalAuthor.isHidden.is_(False),
        ).all()
        if len(candidates) == 1:
            external_author = candidates[0]
    if not external_author:
        raise HTTPException(status_code=404, detail="找不到外部作者頁")
    author_key = external_author.canonicalKey
    matching_rows = db.query(models.ExternalPublicScript).filter(
        models.ExternalPublicScript.status == "published",
        models.ExternalPublicScript.externalAuthorId == external_author.id,
    ).all()
    if not matching_rows:
        raise HTTPException(status_code=404, detail="找不到已公開的外部作者作品")
    page_profile = db.query(models.ExternalAuthorPageProfile).filter_by(authorKey=author_key).first()
    if page_profile and page_profile.isHidden:
        raise HTTPException(status_code=404, detail="找不到已公開的外部作者頁")
    pending = db.query(models.ExternalAuthorProfileSubmission).filter(
        models.ExternalAuthorProfileSubmission.authorKey == author_key,
        models.ExternalAuthorProfileSubmission.status == "pending",
    ).first()
    if pending:
        raise HTTPException(status_code=409, detail="這位作者已有一筆資料補充申請正在審核")
    submitter_name = payload.submitterName.strip()[:120]
    email = payload.contactEmail.strip()[:320]
    contributor_name = payload.contributorName.strip()[:120]
    display_name = payload.displayName.strip()[:200]
    if not submitter_name or not email or "@" not in email or " " in email:
        raise HTTPException(status_code=400, detail="請填寫姓名與有效的聯絡 Email")
    if not contributor_name:
        raise HTTPException(status_code=400, detail="請填寫公開顯示的資料補充者名稱")
    if not display_name:
        raise HTTPException(status_code=400, detail="請填寫公開顯示名稱")
    avatar = _public_profile_url(payload.avatar, image=True)
    works = []
    for item in payload.works[:50]:
        if not isinstance(item, dict):
            continue
        cover_url = _public_profile_url(item.get("coverUrl"), image=True)
        works.append({
            "title": str(item.get("title") or "").strip()[:200],
            "role": str(item.get("role") or "").strip()[:200],
            "url": _public_profile_url(item.get("url")),
            "coverUrl": cover_url,
            "description": str(item.get("description") or "").strip()[:1000],
        })
    profile = {
        "displayName": display_name,
        "contributorName": contributor_name,
        "bio": payload.bio.strip()[:4000],
        "avatar": avatar,
        "profileUrl": _public_profile_url(payload.profileUrl),
        "website": _public_profile_url(payload.website),
        "links": [{"label": str(item.get("label") or "").strip()[:120], "url": _public_profile_url(item.get("url"))} for item in payload.links if isinstance(item, dict) and str(item.get("url") or "").strip()][:30],
        "organizations": [{"name": str(item.get("name") or "").strip()[:200], "url": _public_profile_url(item.get("url")), "description": str(item.get("description") or "").strip()[:1000]} for item in payload.organizations if isinstance(item, dict) and str(item.get("name") or "").strip()][:20],
        "works": works,
    }
    row = models.ExternalAuthorProfileSubmission(
        id=str(uuid.uuid4()), authorKey=author_key, authorName=matching_rows[0].authorName or display_name,
        submitterName=submitter_name, contactEmail=email, profile=profile, status="pending", createdAt=now_ms,
    )
    db.add(row)
    db.commit()
    return schemas.ExternalAuthorProfileSubmissionResponse(success=True, submissionId=row.id, createdAt=now_ms)


@router.post("/voice-actor-profile-submissions", response_model=schemas.VoiceActorProfileSubmissionResponse)
@limiter.limit("5/hour")
def create_voice_actor_profile_submission(
    request: Request,
    payload: schemas.VoiceActorProfileSubmissionCreate,
    db: Session = Depends(get_db),
):
    now_ms = int(time.time() * 1000)
    if payload.websiteTrap:
        return schemas.VoiceActorProfileSubmissionResponse(success=True, submissionId="", createdAt=now_ms)
    persona = db.query(models.Persona).filter(models.Persona.id == payload.personaId).first()
    if not persona or persona.voiceActorHidden or not (_is_voice_actor_persona(persona) or _has_approved_demo_for_persona(db, persona.id)):
        raise HTTPException(status_code=404, detail="找不到公開的聲演身份")
    if persona.ownerId:
        raise HTTPException(status_code=409, detail="此身份已由本人管理，請聯絡聲演本人更新資料")
    pending = db.query(models.VoiceActorProfileSubmission).filter(
        models.VoiceActorProfileSubmission.personaId == persona.id,
        models.VoiceActorProfileSubmission.status == "pending",
    ).first()
    if pending:
        raise HTTPException(status_code=409, detail="這個聲演身份已有一筆資料補充申請正在審核")
    submitter_name = payload.submitterName.strip()[:120]
    email = payload.contactEmail.strip()[:320]
    if not submitter_name or not email or "@" not in email or " " in email:
        raise HTTPException(status_code=400, detail="請填寫姓名與有效的聯絡 Email")
    contributor_name = payload.contributorName.strip()[:120]
    if not contributor_name:
        raise HTTPException(status_code=400, detail="請填寫公開顯示的資料補充者名稱")
    display_name = payload.displayName.strip()[:120]
    if not display_name:
        raise HTTPException(status_code=400, detail="請填寫公開顯示名稱")
    works = []
    for item in payload.works[:50]:
        if not isinstance(item, dict):
            continue
        cover_url = str(item.get("coverUrl") or "").strip()[:2000]
        if cover_url and not (cover_url.startswith("https://") or cover_url.startswith("http://") or cover_url.startswith("/media/")):
            raise HTTPException(status_code=400, detail="作品封面請使用公開圖片網址或媒體庫路徑")
        works.append({
            "title": str(item.get("title") or "").strip()[:200],
            "role": str(item.get("role") or "").strip()[:200],
            "url": str(item.get("url") or "").strip()[:2000],
            "coverUrl": cover_url,
            "description": str(item.get("description") or "").strip()[:1000],
        })
    profile = {
        "displayName": display_name,
        "contributorName": contributor_name,
        "bio": payload.bio.strip()[:4000],
        "avatar": payload.avatar.strip()[:2000],
        "website": payload.website.strip()[:2000],
        "links": [item for item in payload.links if isinstance(item, dict)][:30],
        "organizations": [item for item in payload.organizations if isinstance(item, dict)][:20],
        "works": works,
    }
    row = models.VoiceActorProfileSubmission(
        id=str(uuid.uuid4()), personaId=persona.id, submitterName=submitter_name,
        contactEmail=email, profile=profile, status="pending", createdAt=now_ms,
    )
    db.add(row)
    db.commit()
    return schemas.VoiceActorProfileSubmissionResponse(success=True, submissionId=row.id, createdAt=now_ms)


@router.get("/public-personas/{persona_id}", response_model=schemas.PersonaPublic)
def get_public_persona(persona_id: str, db: Session = Depends(get_db)):
    # 1. Try Persona
    persona = db.query(models.Persona).filter(models.Persona.id == persona_id).first()
    if persona:
        persona.organizationIds = crud.get_persona_org_ids(db, persona)
        persona.tags = _public_persona_tags(persona.tags)
        persona.links = crud._ensure_list(persona.links)
        persona.defaultLicenseSpecialTerms = crud._ensure_list(persona.defaultLicenseSpecialTerms)
        orgs = []
        if persona.organizationIds:
            org_map = _get_public_org_map(db, persona.organizationIds)
            orgs = [org_map[oid] for oid in persona.organizationIds if oid in org_map]
            persona.organizationIds = [oid for oid in persona.organizationIds if oid in org_map]
        projected = _public_identity_projection(
            db,
            persona,
            orgs,
            _build_public_identity_context(db, [persona.id]),
        )
        if not projected.roles:
            raise HTTPException(status_code=404, detail="Author not found")
        return projected
    
    raise HTTPException(status_code=404, detail="Author not found")

@router.get("/public-personas", response_model=List[schemas.PersonaPublic])
def list_public_personas(db: Session = Depends(get_db)):
    # Return author personas with public works and self-declared / demo-linked voice actors.
    persona_ids = []
    for row in db.query(models.Script.personaId).filter(models.Script.personaId.isnot(None)).distinct().all():
        persona_id = row[0]
        if persona_id and _has_public_script_for_persona(db, persona_id):
            persona_ids.append(persona_id)

    approved_demos = db.query(models.PublicDemoSubmission).filter(models.PublicDemoSubmission.status == "approved").all()
    for demo in approved_demos:
        if demo.voiceActorPersonaId:
            persona_ids.append(demo.voiceActorPersonaId)
        persona_ids.extend(str(persona_id) for persona_id in crud._ensure_list(demo.voiceActorIds) if persona_id)
        for actor in crud._ensure_list(demo.manualVoiceActors):
            persona_id = str(actor.get("personaId") or "").strip() if isinstance(actor, dict) else ""
            if persona_id:
                persona_ids.append(persona_id)

    for persona in db.query(models.Persona).all():
        if _is_voice_actor_persona(persona):
            persona_ids.append(persona.id)
    persona_ids.extend(
        row[0]
        for row in db.query(models.PersonaRole.personaId).filter(models.PersonaRole.isVisible.is_(True)).distinct().all()
        if row[0]
    )
    persona_ids.extend(
        row[0]
        for row in db.query(models.ExternalAuthor.linkedPersonaId).filter(
            models.ExternalAuthor.linkedPersonaId.isnot(None),
            models.ExternalAuthor.isHidden.is_(False),
        ).distinct().all()
        if row[0]
    )

    persona_ids = list(dict.fromkeys(persona_ids))

    if not persona_ids:
        return []

    personas = db.query(models.Persona).filter(models.Persona.id.in_(persona_ids)).all()
    results = []

    all_org_ids = set()
    persona_org_map = {}
    for p in personas:
        p.organizationIds = crud.get_persona_org_ids(db, p)
        p.tags = _public_persona_tags(p.tags)
        p.links = crud._ensure_list(p.links)
        p.defaultLicenseSpecialTerms = crud._ensure_list(p.defaultLicenseSpecialTerms)
        org_ids = p.organizationIds or []
        persona_org_map[p.id] = org_ids
        all_org_ids.update(org_ids)

    org_map = _get_public_org_map(db, list(all_org_ids))
    identity_context = _build_public_identity_context(db, [p.id for p in personas])

    for p in personas:
        visible_org_ids = [oid for oid in persona_org_map.get(p.id, []) if oid in org_map]
        p.organizationIds = visible_org_ids
        projected = _public_identity_projection(
            db,
            p,
            [org_map[oid] for oid in visible_org_ids],
            identity_context,
        )
        if projected.roles:
            results.append(projected)
    return results

@router.get("/public-organizations/{org_id}", response_model=schemas.OrganizationPublic)
def get_public_organization(org_id: str, db: Session = Depends(get_db)):
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    if not _has_public_script_for_organization(db, org_id):
        raise HTTPException(status_code=404, detail="Organization not found")
    org.tags = safe_json_list(org.tags)

    # Load only personas that are members via PersonaOrganizationMembership (single source of truth).
    member_persona_ids = [
        row[0]
        for row in db.query(models.PersonaOrganizationMembership.personaId).filter(
            models.PersonaOrganizationMembership.orgId == org_id
        ).all()
        if row and row[0]
    ]
    members = []
    if member_persona_ids:
        for p in db.query(models.Persona).filter(models.Persona.id.in_(member_persona_ids)).all():
            p.tags = _public_persona_tags(p.tags)
            p.links = safe_json_list(p.links)
            p.organizationIds = crud.get_persona_org_ids(db, p)
            p.defaultLicenseSpecialTerms = safe_json_list(p.defaultLicenseSpecialTerms)
            if _has_public_script_for_persona(db, p.id):
                members.append(p)

    try:
        org.members = []
    except Exception:
        pass
    result = schemas.OrganizationPublic.model_validate(org)
    result.members = members
    return result

@router.get("/public-organizations", response_model=List[schemas.OrganizationPublic])
def list_public_organizations(db: Session = Depends(get_db)):
    # Return organizations that have at least one publicly visible script.
    org_ids = {
        row[0]
        for row in db.query(models.Script.organizationId)
        .filter(models.Script.organizationId.isnot(None))
        .all()
        if row and row[0]
    }
    orgs = [
        org
        for org in db.query(models.Organization).filter(models.Organization.id.in_(list(org_ids))).all()
        if _has_public_script_for_organization(db, org.id)
    ]
    results = []
    for org in orgs:
        org.tags = safe_json_list(org.tags)
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


class PublicLikePayload(BaseModel):
    visitorId: str


@router.post("/public-scripts/{script_id}/like")
@limiter.limit("30/minute")
def public_toggle_like(request: Request, script_id: str, payload: PublicLikePayload, db: Session = Depends(get_db)):
    if not payload.visitorId or len(payload.visitorId) > 128:
        raise HTTPException(status_code=400, detail="Invalid visitorId")
    script = db.query(models.Script).filter(models.Script.id == script_id).first()
    if not _is_publicly_visible_script(db, script):
        raise HTTPException(status_code=404, detail="Script not found")
    result = crud.toggle_script_like(db, script_id, visitor_id=payload.visitorId)
    if result is None:
        raise HTTPException(status_code=404, detail="Script not found")
    liked, likes = result
    return {"liked": liked, "likes": likes}


@router.get("/public-scripts/{script_id}/like-status")
def public_like_status(script_id: str, visitorId: str, db: Session = Depends(get_db)):
    script = db.query(models.Script).filter(models.Script.id == script_id).first()
    if not _is_publicly_visible_script(db, script):
        raise HTTPException(status_code=404, detail="Script not found")
    liked = crud.get_script_like_status(db, script_id, visitor_id=visitorId)
    return {"liked": liked, "likes": script.likes or 0}


@router.get("/public-scripts/{script_id}/stats")
def public_script_stats(script_id: str, db: Session = Depends(get_db)):
    script = db.query(models.Script).filter(models.Script.id == script_id).first()
    if not _is_publicly_visible_script(db, script):
        raise HTTPException(status_code=404, detail="Script not found")
    content = script.content or ""
    content_length = len(content)
    # Estimate: CJK scripts are ~half dialogue, at 200 chars/min
    estimated_minutes = round(content_length / 2 / 200, 1) if content_length > 0 else 0
    return {
        "contentLength": content_length,
        "estimatedMinutes": estimated_minutes,
        "views": script.views or 0,
        "likes": script.likes or 0,
    }


@router.post("/public-external-scripts/{item_id}/view")
@limiter.limit("60/minute")
def public_external_script_view(request: Request, item_id: str, db: Session = Depends(get_db)):
    """Count a click on an external source link, once the link is activated."""
    item = (
        db.query(models.ExternalPublicScript)
        .filter(
            models.ExternalPublicScript.id == item_id,
            models.ExternalPublicScript.status == "published",
        )
        .with_for_update()
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="External public script not found")
    item.views = int(item.views or 0) + 1
    db.commit()

    # Keep the short-lived homepage bundle in sync for the next page visit.
    try:
        import routers.public_bundle as public_bundle_router

        public_bundle_router._bundle_cache = None
    except Exception:
        pass
    return {"views": item.views}


@router.get("/default-marker-configs", response_model=List[dict])
def read_default_marker_configs(db: Session = Depends(get_db)):
    return crud.get_system_default_configs(db)
