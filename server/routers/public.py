from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import orm
from sqlalchemy.orm import Session
import json
import os
import re
import time
import uuid
import unicodedata
import httpx
from urllib.parse import urlparse
import crud_ops as crud
import schemas
import models
from crud_ops.publish_state import is_publicly_visible as _is_publicly_visible_script, has_public_parent_folder as _has_public_parent_folder
from dependencies import get_db, get_current_user_id, get_current_user_claims, verified_email_from_claims
from rate_limit import client_ip_digest, limiter, resolve_client_ip
from crud_ops.scripts_command import AnonymousLikeLimitExceeded
from utils import normalize_homepage_banner_value, safe_json_list
from services.admin_notifications import notify_approval_request
from services.public_feedback_email import send_public_feedback_notification
from services.public_view_windows import claim_recent_view

router = APIRouter(prefix="/api", tags=["public"])
HOMEPAGE_BANNER_SETTING_KEY = "homepage_banner"
_REVALIDATE_URL = os.getenv("NEXTJS_REVALIDATE_URL", "")
_REVALIDATE_SECRET = os.getenv("REVALIDATE_SECRET", "")


def _queue_demo_revalidation(background_tasks: BackgroundTasks | None, *paths: str) -> None:
    if not background_tasks or not _REVALIDATE_URL or not _REVALIDATE_SECRET or not paths:
        return

    def revalidate() -> None:
        try:
            httpx.post(
                _REVALIDATE_URL,
                json={"secret": _REVALIDATE_SECRET, "paths": sorted(set(paths))},
                timeout=5,
            )
        except Exception:
            # Data changes have committed; cache refresh is best effort.
            pass

    background_tasks.add_task(revalidate)


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


def _public_profile_contact_value(label: str, value: object, existing_links: list) -> str:
    raw = str(value or "").strip()[:2000]
    if not raw:
        return ""
    # Existing profiles can contain contact handles rather than URLs. Keep an
    # unchanged value valid when a contributor edits other profile fields.
    if any(isinstance(item, dict) and str(item.get("label") or "").strip() == label
           and str(item.get("url") or "").strip() == raw for item in existing_links):
        return raw
    kind = label.casefold()
    if kind in {"email", "e-mail", "電子郵件"} and re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", raw):
        return raw
    if kind == "discord" and re.fullmatch(r"[A-Za-z0-9_.]{2,32}", raw):
        return raw
    return _public_profile_url(raw)

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

    ip_address, forwarded_for = resolve_client_ip(request)
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
    background_tasks: BackgroundTasks,
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
    if activity and payload.manualVoiceActors:
        # Activity submissions are published immediately, so attach newly
        # declared voice actors now instead of waiting for admin approval.
        from routers.admin import _ensure_manual_voice_actor_personas
        _ensure_manual_voice_actor_personas(db, row)
    db.commit()
    if activity:
        from routers import public_bundle
        public_bundle.invalidate_public_bundle_cache()
    else:
        background_tasks.add_task(notify_approval_request, "demo", {
            "id": row.id, "scriptTitle": row.scriptTitle, "demoName": row.demoName,
            "displayName": row.displayName, "contactEmail": row.contactEmail, "demoUrl": row.demoUrl,
        })
    return schemas.PublicDemoSubmissionResponse(submissionId=row.id, createdAt=now_ms)


@router.post("/public-audio-work-submissions", response_model=schemas.PublicAudioWorkSubmissionResponse)
@limiter.limit("5/hour")
def create_public_audio_work_submission(
    request: Request,
    payload: schemas.PublicAudioWorkSubmissionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Accept public audio work promotions; list them only after admin approval."""
    now_ms = int(time.time() * 1000)
    if payload.website:
        return schemas.PublicAudioWorkSubmissionResponse(submissionId="", createdAt=now_ms)
    if not payload.confirmPublic:
        raise HTTPException(status_code=400, detail="請確認連結可公開瀏覽，且您有權提供作品資訊")

    title = payload.title[:180].strip()
    creator_name = payload.creatorName[:120].strip()
    description = payload.description[:2000].strip()
    contact_email = payload.contactEmail[:320].strip()
    if not title:
        raise HTTPException(status_code=400, detail="請填寫作品名稱")
    if contact_email and ("@" not in contact_email or " " in contact_email):
        raise HTTPException(status_code=400, detail="Email 格式不正確")
    duplicate = db.query(models.PublicAudioWorkSubmission).filter(
        models.PublicAudioWorkSubmission.url == payload.url,
        models.PublicAudioWorkSubmission.status.in_(["pending", "approved"]),
    ).first()
    if duplicate:
        raise HTTPException(status_code=409, detail="這個作品連結已投稿或已公開")
    if payload.organizationId and not db.query(models.Organization.id).filter(models.Organization.id == payload.organizationId).first():
        raise HTTPException(status_code=400, detail="找不到所屬組織")

    row = models.PublicAudioWorkSubmission(
        id=str(uuid.uuid4()),
        title=title,
        url=payload.url,
        coverUrl=payload.coverUrl,
        description=description,
        creatorName=creator_name,
        creatorUrl=payload.creatorUrl,
        organizationId=payload.organizationId,
        accessType=payload.accessType,
        contactEmail=contact_email,
        status="pending",
        createdAt=now_ms,
    )
    db.add(row)
    db.commit()
    background_tasks.add_task(notify_approval_request, "audio_work", {
        "id": row.id, "title": row.title, "creatorName": row.creatorName,
        "url": row.url, "contactEmail": row.contactEmail,
    })
    return schemas.PublicAudioWorkSubmissionResponse(submissionId=row.id, createdAt=now_ms)


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


def _public_script_identity_ids(db: Session) -> tuple[set[str], set[str], set[str]]:
    """Resolve public scripts and their identities with one narrow query.

    This mirrors is_publicly_visible(), including immediate public-folder
    inheritance, without issuing a parent-folder query for each script.
    """
    rows = db.query(
        models.Script.id,
        models.Script.ownerId,
        models.Script.personaId,
        models.Script.organizationId,
        models.Script.title,
        models.Script.folder,
        models.Script.type,
        models.Script.isPublic,
    ).all()
    public_folders = {
        (row.ownerId, row.title, row.folder)
        for row in rows
        if row.type == "folder" and row.isPublic == 1
    }
    script_ids: set[str] = set()
    persona_ids: set[str] = set()
    org_ids: set[str] = set()
    for row in rows:
        visible = bool(row.isPublic)
        if not visible and row.folder and row.folder != "/":
            parts = row.folder.strip("/").split("/")
            parent = "/" + "/".join(parts[:-1])
            visible = (row.ownerId, parts[-1], parent) in public_folders
        if not visible:
            continue
        script_ids.add(row.id)
        if row.personaId:
            persona_ids.add(row.personaId)
        if row.organizationId:
            org_ids.add(row.organizationId)
    return script_ids, persona_ids, org_ids


_CORE_ROLES = {"scriptwriter", "voice_actor"}


def _visible_production_roles(db: Session, persona_id: str) -> set[str]:
    return {row[0] for row in db.query(models.PersonaRole.role).filter(
        models.PersonaRole.personaId == persona_id,
        models.PersonaRole.role.in_(models.PRODUCTION_ROLES),
        models.PersonaRole.isVisible.is_(True),
    ).all()}


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


def _build_public_identity_context(
    db: Session, persona_ids: list[str], visible_script_ids: set[str] | None = None,
) -> dict:
    """Load all role and source relationships for a set of identities in batches."""
    ids = [value for value in dict.fromkeys(persona_ids) if value]
    if not ids:
        return {}
    roles_by_persona: dict[str, list[models.PersonaRole]] = {value: [] for value in ids}
    for row in db.query(models.PersonaRole).filter(models.PersonaRole.personaId.in_(ids)).all():
        roles_by_persona.setdefault(row.personaId, []).append(row)

    internal_scripts_by_persona: dict[str, list[str]] = {value: [] for value in ids}
    if visible_script_ids is None:
        # A single identity page only needs its own works; keep its narrow query.
        script_rows = db.query(models.Script).filter(models.Script.personaId.in_(ids)).all()
        for row in script_rows:
            if _is_publicly_visible_script(db, row):
                internal_scripts_by_persona.setdefault(row.personaId, []).append(row.id)
    elif visible_script_ids:
        script_rows = db.query(models.Script.id, models.Script.personaId).filter(
            models.Script.personaId.in_(ids), models.Script.id.in_(visible_script_ids)
        ).all()
        for row in script_rows:
            internal_scripts_by_persona.setdefault(row.personaId, []).append(row.id)

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
    author_profiles = {row.authorKey: row for row in db.query(models.ExternalAuthorPageProfile).all()}
    external_authors = []
    for author in db.query(models.ExternalAuthor).all():
        profile = author_profiles.get(author.canonicalKey)
        linked_id = profile.linkedPersonaId if profile else author.linkedPersonaId
        if author.isHidden or (profile and profile.isHidden) or linked_id not in ids:
            continue
        external_authors_by_persona.setdefault(linked_id, []).append(author)
        external_authors.append(author)
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
        "productionCredits": _production_credits_by_persona(db, ids),
        "internalScripts": internal_scripts_by_persona,
        "demos": demos_by_persona,
        "externalAuthors": external_authors_by_persona,
        "externalScripts": external_scripts_by_author,
        "supplements": supplements_by_key,
    }


_CREDIT_SOURCE_ROLES = {"post_production": "post_production", "cover_art": "cover_art", "recording": "recording_studio"}


def _production_credits_by_persona(db: Session, persona_ids: list[str]) -> dict[str, list[dict]]:
    """Reviewed production credits plus catalog credits whose printed name maps to the identity."""
    result: dict[str, list[dict]] = {value: [] for value in persona_ids}
    if not persona_ids:
        return result
    seen: set[tuple[str, str, str]] = set()
    approved = models.PublicAudioWorkSubmission.status == "approved"

    def add(persona_id: str, item: dict) -> None:
        key = (persona_id, item["creditRole"], item.get("audioWorkId") or item["url"])
        if key in seen:
            return
        seen.add(key)
        result.setdefault(persona_id, []).append(item)

    rows = db.query(models.PersonaCredit, models.PublicAudioWorkSubmission).outerjoin(
        models.PublicAudioWorkSubmission, models.PublicAudioWorkSubmission.id == models.PersonaCredit.audioWorkId,
    ).filter(models.PersonaCredit.personaId.in_(persona_ids)).order_by(models.PersonaCredit.createdAt.desc()).all()
    for credit, work in rows:
        if credit.audioWorkId and (work is None or work.status != "approved"):
            continue
        add(credit.personaId, {
            "id": work.id if work else credit.id, "audioWorkId": credit.audioWorkId,
            "title": (work.title if work else credit.title) or "", "url": work.url if work else credit.url,
            "coverUrl": (work.coverUrl if work else credit.coverUrl) or "", "creditRole": credit.role,
            "creditedAs": credit.creditedAs or "", "workType": "audio" if work else (credit.workType or "other"),
            "publishedAt": (work.publishedAt or work.createdAt) if work else credit.createdAt,
        })

    names = db.query(models.PersonaCreditName).filter(models.PersonaCreditName.personaId.in_(persona_ids)).all()
    owner_by_name = {(row.role, row.creditedAs): row.personaId for row in names}
    if owner_by_name:
        catalog = db.query(models.AudioWorkCredit, models.PublicAudioWorkSubmission).join(
            models.PublicAudioWorkSubmission, models.PublicAudioWorkSubmission.id == models.AudioWorkCredit.audioWorkId,
        ).filter(
            models.AudioWorkCredit.role.in_(tuple(_CREDIT_SOURCE_ROLES)), approved,
            models.AudioWorkCredit.creditedAs.in_({row.creditedAs for row in names}),
        ).all()
        for credit, work in catalog:
            role = _CREDIT_SOURCE_ROLES[credit.role]
            persona_id = owner_by_name.get((role, credit.creditedAs))
            if not persona_id:
                continue
            add(persona_id, {
                "id": work.id, "audioWorkId": work.id, "title": work.title or "", "url": work.url,
                "coverUrl": work.coverUrl or "", "creditRole": role, "creditedAs": credit.creditedAs,
                "workType": "audio", "publishedAt": work.publishedAt or work.createdAt,
            })
    for items in result.values():
        items.sort(key=lambda item: item.get("publishedAt") or 0, reverse=True)
    return result


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
    # Public identity payloads must not disclose the account UID that owns a persona.
    result.ownerId = None
    result.voiceActorClaimed = bool(persona.ownerId)
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

    # Production roles never decide whether writing or acting is derived from works.
    core_records = [row for row in role_records if row.role in _CORE_ROLES]
    production_credits = context.get("productionCredits", {}).get(persona.id, [])
    roles: list[str] = []
    if "scriptwriter" in visible_role_names or (not core_records and (has_internal_scripts or external_rows)):
        roles.append("scriptwriter")
    if "voice_actor" in visible_role_names or (not core_records and not persona.voiceActorHidden and (self_declared_voice_actor or has_voice_performances)):
        roles.append("voice_actor")
    credited_roles = {item["creditRole"] for item in production_credits}
    roles.extend(role for role in models.PRODUCTION_ROLES if role in visible_role_names and role in credited_roles)
    result.roles = roles
    result.productionCredits = [item for item in production_credits if item["creditRole"] in roles]

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
    voice_actor_profile = role_profiles.get("voice_actor") or {}
    result.voiceActorCollaborationEnabled = voice_actor_profile.get("collaborationEnabled") is not False
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
    contributors = [item for item in crud._ensure_list(persona.voiceActorContributors) if isinstance(item, dict)]
    for profile in role_profiles.values():
        contributors.extend(item for item in (profile.get("contributors") or []) if isinstance(item, dict))
    unique_contributors = {(item.get("name"), item.get("contributedAt")): item for item in contributors}
    result.profileContributors = sorted(unique_contributors.values(), key=lambda item: item.get("contributedAt") or 0)
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


def _is_public_voice_actor_identity(db: Session, persona: models.Persona) -> bool:
    """Match claim eligibility to the public identity projection's role rules."""
    if persona.voiceActorHidden:
        return False
    roles = db.query(models.PersonaRole.role, models.PersonaRole.isVisible).filter(
        models.PersonaRole.personaId == persona.id, models.PersonaRole.role.in_(_CORE_ROLES)
    ).all()
    if roles:
        return any(role == "voice_actor" and is_visible for role, is_visible in roles)
    return _is_voice_actor_persona(persona) or _has_approved_demo_for_persona(db, persona.id)


def _is_public_scriptwriter_identity(db: Session, persona: models.Persona) -> bool:
    """Match scriptwriter eligibility to the public identity projection's role rules."""
    context = _build_public_identity_context(db, [persona.id])
    role_records = [row for row in context.get("roles", {}).get(persona.id, []) if row.role in _CORE_ROLES]
    if role_records:
        return any(row.role == "scriptwriter" and row.isVisible for row in role_records)
    if context.get("internalScripts", {}).get(persona.id):
        return True
    for author in context.get("externalAuthors", {}).get(persona.id, []):
        if context.get("externalScripts", {}).get(author.id):
            return True
    return False


def _has_public_script_for_organization(db: Session, org_id: str) -> bool:
    scripts = db.query(models.Script).filter(models.Script.organizationId == org_id).all()
    return any(_is_publicly_visible_script(db, script) for script in scripts)


def _has_public_audio_work_for_organization(db: Session, org_id: str) -> bool:
    return db.query(models.PublicAudioWorkSubmission.id).filter(
        models.PublicAudioWorkSubmission.organizationId == org_id,
        models.PublicAudioWorkSubmission.status == "approved",
    ).first() is not None


def _get_public_org_map(
    db: Session, org_ids: list[str], visible_org_ids: set[str] | None = None,
) -> dict[str, models.Organization]:
    if not org_ids:
        return {}
    uniq_ids = [oid for oid in dict.fromkeys(org_ids) if oid]
    if not uniq_ids:
        return {}
    orgs = db.query(models.Organization).filter(models.Organization.id.in_(uniq_ids)).all()
    out = {}
    for org in orgs:
        has_public_audio = _has_public_audio_work_for_organization(db, org.id)
        if visible_org_ids is None:
            if not _has_public_script_for_organization(db, org.id) and not has_public_audio:
                continue
        elif org.id not in visible_org_ids and not has_public_audio:
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

    def bounded_header(name: str, max_length: int) -> str:
        return (request.headers.get(name) or "").strip()[:max_length]

    ip_address, forwarded_for = resolve_client_ip(request)
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
        userAgent=bounded_header("user-agent", 512) or (payload.userAgent or "").strip(),
        acceptLanguage=bounded_header("accept-language", 256),
        referer=bounded_header("referer", 2048) or (payload.referrer or "").strip(),
        origin=bounded_header("origin", 512),
        host=bounded_header("host", 255),
        clientMeta={
            "locale": payload.locale or "",
            "timezone": payload.timezone or "",
            "timezoneOffsetMinutes": payload.timezoneOffsetMinutes,
            "platform": payload.platform or "",
            "screen": payload.screen.model_dump(exclude_none=True),
            "viewport": payload.viewport.model_dump(exclude_none=True),
            "pagePath": payload.pagePath or "",
            "acceptedChecks": sorted(list(incoming_checks)),
        },
        headerSnapshot={
            "x-forwarded-for": bounded_header("x-forwarded-for", 512),
            "x-real-ip": bounded_header("x-real-ip", 64),
            "sec-ch-ua": bounded_header("sec-ch-ua", 512),
            "sec-ch-ua-platform": bounded_header("sec-ch-ua-platform", 128),
            "sec-ch-ua-mobile": bounded_header("sec-ch-ua-mobile", 32),
            "accept": bounded_header("accept", 256),
            "accept-encoding": bounded_header("accept-encoding", 128),
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
    background_tasks: BackgroundTasks,
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
    background_tasks.add_task(notify_approval_request, "external_author_profile", {
        "id": row.id, "authorName": row.authorName, "submitterName": row.submitterName,
        "contactEmail": row.contactEmail,
    })
    return schemas.ExternalAuthorProfileSubmissionResponse(success=True, submissionId=row.id, createdAt=now_ms)


@router.post("/voice-actor-profile-submissions", response_model=schemas.VoiceActorProfileSubmissionResponse)
@limiter.limit("5/hour")
def create_voice_actor_profile_submission(
    request: Request,
    payload: schemas.VoiceActorProfileSubmissionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    now_ms = int(time.time() * 1000)
    if payload.websiteTrap:
        return schemas.VoiceActorProfileSubmissionResponse(success=True, submissionId="", createdAt=now_ms)
    persona = db.query(models.Persona).filter(models.Persona.id == payload.personaId).first()
    requested_profile_kind = payload.profileKind
    if not persona:
        raise HTTPException(status_code=404, detail="找不到公開身份")
    production_roles = _visible_production_roles(db, persona.id)
    if requested_profile_kind == "author":
        profile_kind = "author"
        if not _is_public_scriptwriter_identity(db, persona):
            raise HTTPException(status_code=404, detail="找不到公開的作者身份")
    elif requested_profile_kind == "production":
        profile_kind = "production"
        if not production_roles:
            raise HTTPException(status_code=404, detail="找不到公開的製作身份")
    else:
        profile_kind = requested_profile_kind or "voice_actor"
        if not _is_public_voice_actor_identity(db, persona):
            # Older public pages did not send a profileKind. If their actor
            # button is still open from cache but this identity is an author,
            # accept the shared profile fields as an author proposal.
            if _is_public_scriptwriter_identity(db, persona):
                profile_kind = "author"
            else:
                raise HTTPException(status_code=404, detail="找不到公開身份")
    if profile_kind == "voice_actor" and persona.ownerId:
        role = db.query(models.PersonaRole).filter_by(personaId=persona.id, role="voice_actor").first()
        role_profile = dict(role.profile) if role and isinstance(role.profile, dict) else {}
        if role_profile.get("collaborationEnabled") is False:
            raise HTTPException(status_code=403, detail="此聲演目前未開放協作者補充資料")
    pending_rows = db.query(models.VoiceActorProfileSubmission).filter(
        models.VoiceActorProfileSubmission.personaId == persona.id,
        models.VoiceActorProfileSubmission.status == "pending",
    ).all()
    if any(str((row.profile or {}).get("profileKind") or "voice_actor") == profile_kind for row in pending_rows):
        raise HTTPException(status_code=409, detail="這個身份已有一筆同類型資料補充申請正在審核")
    submitter_name = payload.submitterName.strip()[:120]
    email = payload.contactEmail.strip()[:320]
    if not submitter_name or not email or "@" not in email or " " in email:
        raise HTTPException(status_code=400, detail="請填寫姓名與有效的聯絡 Email")
    contributor_name = payload.contributorName.strip()[:120] if profile_kind != "author" else ""
    if profile_kind != "author" and not contributor_name:
        raise HTTPException(status_code=400, detail="請填寫公開顯示的資料補充者名稱")
    display_name = payload.displayName.strip()[:120]
    if not display_name:
        raise HTTPException(status_code=400, detail="請填寫公開顯示名稱")
    works = []
    for item in (payload.works[:30] if profile_kind == "production" else []):
        if not isinstance(item, dict):
            continue
        role = str(item.get("creditRole") or "").strip()
        if role not in production_roles:
            raise HTTPException(status_code=400, detail="參與作品的製作類別無效")
        url = _public_profile_url(item.get("url"))
        title = str(item.get("title") or "").strip()[:200]
        if not url or not title:
            raise HTTPException(status_code=400, detail="參與作品需提供名稱與網址")
        work_type = str(item.get("workType") or "audio").strip()
        if work_type not in {"audio", "game", "video", "other"}:
            raise HTTPException(status_code=400, detail="參與作品的類型無效")
        works.append({"title": title, "url": url, "coverUrl": _public_profile_url(item.get("coverUrl"), image=True),
                      "workType": work_type, "creditRole": role})
    for item in (payload.works[:50] if profile_kind == "voice_actor" else []):
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
    avatar_url = _public_profile_url(payload.avatar, image=True) if payload.avatar.strip() else ""
    website_url = _public_profile_url(payload.website) if payload.website.strip() else ""
    links = []
    existing_links = crud._ensure_list(persona.links)
    for item in payload.links[:30]:
        if not isinstance(item, dict):
            continue
        label = str(item.get("label") or "").strip()[:120]
        url = _public_profile_contact_value(label, item.get("url"), existing_links)
        if label or url:
            links.append({"label": label, "url": url})
    organizations = []
    for item in (payload.organizations[:20] if profile_kind == "voice_actor" else []):
        if not isinstance(item, dict):
            continue
        name = str(item.get("name") or "").strip()[:200]
        url = _public_profile_url(item.get("url")) if str(item.get("url") or "").strip() else ""
        if name or url:
            organizations.append({"name": name, "url": url})
    profile = {
        "profileKind": profile_kind,
        "displayName": display_name,
        "contributorName": contributor_name,
        "bio": payload.bio.strip()[:4000],
        "avatar": avatar_url[:2000],
        "website": website_url[:2000],
        "links": links,
        "organizations": organizations,
        "works": works,
    }
    row = models.VoiceActorProfileSubmission(
        id=str(uuid.uuid4()), personaId=persona.id, submitterName=submitter_name,
        contactEmail=email, profile=profile, status="pending", createdAt=now_ms,
    )
    db.add(row)
    db.commit()
    notification_kind = {"author": "author_profile", "production": "resource_profile"}.get(profile_kind, "voice_actor_profile")
    background_tasks.add_task(notify_approval_request, notification_kind, {
        "id": row.id, "voiceActor" if profile_kind == "voice_actor" else "author": persona.displayName,
        "name": persona.displayName, "personaId": persona.id, "submitterName": row.submitterName,
        "contactEmail": row.contactEmail,
    })
    return schemas.VoiceActorProfileSubmissionResponse(success=True, submissionId=row.id, createdAt=now_ms)


@router.post("/voice-actor-claims", response_model=schemas.VoiceActorClaimRequestRecord)
@limiter.limit("3/hour")
async def create_voice_actor_claim_request(
    request: Request,
    payload: schemas.VoiceActorClaimRequestCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    claims: dict = Depends(get_current_user_claims),
):
    user_id = str(claims.get("uid") or "")
    email = verified_email_from_claims(claims)
    if not email:
        raise HTTPException(status_code=403, detail="請使用已驗證 Email 的 Google 帳戶提出認領")
    firebase_claims = claims.get("firebase") if isinstance(claims.get("firebase"), dict) else {}
    if firebase_claims.get("sign_in_provider") != "google.com":
        raise HTTPException(status_code=403, detail="聲演認領目前需使用 Google 帳戶登入")
    persona = db.query(models.Persona).filter(models.Persona.id == payload.personaId).first()
    if not persona or not _is_public_voice_actor_identity(db, persona):
        raise HTTPException(status_code=404, detail="找不到公開的聲演身份")
    if persona.ownerId:
        raise HTTPException(status_code=409, detail="此身份已有人管理，請聯絡管理員處理移轉")
    pending = db.query(models.VoiceActorClaimRequest).filter_by(personaId=persona.id, status="pending").first()
    if pending:
        raise HTTPException(status_code=409, detail="此聲演已有認領申請正在審核")
    proof_url = _public_profile_url(payload.proofUrl) if payload.proofUrl.strip() else ""
    note = payload.note.strip()[:2000]
    if not proof_url and len(note) < 10:
        raise HTTPException(status_code=400, detail="請提供可核對的公開社群連結，或至少 10 字的身份佐證說明")
    user = db.query(models.User).filter_by(id=user_id).first()
    now_ms = int(time.time() * 1000)
    row = models.VoiceActorClaimRequest(
        id=str(uuid.uuid4()), personaId=persona.id, requesterId=user_id,
        verifiedEmail=email, proofUrl=proof_url, note=note,
        status="pending", createdAt=now_ms,
    )
    db.add(row)
    if not user:
        db.add(models.User(id=user_id, email=email, displayName=str(claims.get("name") or "")[:120], createdAt=now_ms, lastLogin=now_ms))
    else:
        user.email = email
    db.commit()
    background_tasks.add_task(notify_approval_request, "voice_actor_claim", {
        "id": row.id, "voiceActor": persona.displayName, "verifiedEmail": email,
        "contactEmail": email, "proofUrl": row.proofUrl, "note": row.note,
    })
    return schemas.VoiceActorClaimRequestRecord(
        id=row.id, personaId=persona.id, personaName=persona.displayName or "", requesterId=user_id,
        requesterName=(user.displayName if user else str(claims.get("name") or "")), verifiedEmail=email,
        proofUrl=proof_url, note=note, status="pending", reviewNote="", reviewedAt=None, createdAt=now_ms,
    )


@router.get("/voice-actor-claims/candidates")
def list_voice_actor_claim_candidates(
    q: str = "",
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    del user_id
    query = db.query(models.Persona).filter(models.Persona.ownerId.is_(None), models.Persona.voiceActorHidden.is_(False))
    if q.strip():
        query = query.filter(models.Persona.displayName.ilike(f"%{q.strip()}%"))
    approved_demos = db.query(models.PublicDemoSubmission).filter(
        models.PublicDemoSubmission.status == "approved"
    ).all()
    demo_persona_ids: set[str] = set()
    for demo in approved_demos:
        if demo.voiceActorPersonaId:
            demo_persona_ids.add(str(demo.voiceActorPersonaId))
        demo_persona_ids.update(str(value) for value in crud._ensure_list(demo.voiceActorIds) if value)
        for actor in crud._ensure_list(demo.manualVoiceActors):
            persona_id = str(actor.get("personaId") or "").strip() if isinstance(actor, dict) else ""
            if persona_id:
                demo_persona_ids.add(persona_id)
    pending_persona_ids = {
        str(row[0]) for row in db.query(models.VoiceActorClaimRequest.personaId)
        .filter(models.VoiceActorClaimRequest.status == "pending").all()
    }
    role_rows = db.query(
        models.PersonaRole.personaId,
        models.PersonaRole.role,
        models.PersonaRole.isVisible,
    ).all()
    roles_by_persona: dict[str, list[tuple[str, bool]]] = {}
    for persona_id, role, is_visible in role_rows:
        roles_by_persona.setdefault(str(persona_id), []).append((str(role), bool(is_visible)))
    result = []
    offset = 0
    while len(result) < 250:
        rows = query.order_by(models.Persona.displayName.asc()).offset(offset).limit(500).all()
        if not rows:
            break
        page_ids = [persona.id for persona in rows]
        scriptwriter_ids = {
            str(row[0]) for row in db.query(models.PersonaRole.personaId)
            .filter(models.PersonaRole.role == "scriptwriter", models.PersonaRole.personaId.in_(page_ids)).all()
        }
        for persona in rows:
            role_records = roles_by_persona.get(persona.id, [])
            if role_records:
                is_public_voice_actor = any(role == "voice_actor" and visible for role, visible in role_records)
            else:
                is_public_voice_actor = _is_voice_actor_persona(persona) or persona.id in demo_persona_ids
            if not is_public_voice_actor:
                continue
            if persona.id in pending_persona_ids:
                continue
            result.append({"id": persona.id, "displayName": persona.displayName or "", "avatar": persona.avatar or "", "hasScriptwriterRole": persona.id in scriptwriter_ids})
            if len(result) >= 250:
                break
        offset += len(rows)
        if len(rows) < 500:
            break
    return result


@router.get("/my-voice-actors")
def list_my_voice_actor_personas(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    personas = db.query(models.Persona).filter_by(ownerId=user_id).order_by(models.Persona.displayName.asc()).all()
    items = []
    for persona in personas:
        role = db.query(models.PersonaRole).filter_by(personaId=persona.id, role="voice_actor").first()
        if not role:
            continue
        role_profile = dict(role.profile) if isinstance(role.profile, dict) else {}
        pending_rows = db.query(models.VoiceActorProfileSubmission).filter_by(personaId=persona.id, status="pending").all()
        pending_count = sum(1 for row in pending_rows if str((row.profile or {}).get("profileKind") or "voice_actor") == "voice_actor")
        items.append({"id": persona.id, "displayName": persona.displayName or "", "collaborationEnabled": role_profile.get("collaborationEnabled") is not False, "pendingSubmissionCount": pending_count})
    return items


@router.get("/voice-actor-claims/mine", response_model=schemas.VoiceActorClaimRequestListResponse)
async def list_my_voice_actor_claims(
    status: str = "all",
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    query = db.query(models.VoiceActorClaimRequest).filter_by(requesterId=user_id)
    if status != "all":
        query = query.filter_by(status=status)
    rows = query.order_by(models.VoiceActorClaimRequest.createdAt.desc()).limit(100).all()
    items = [schemas.VoiceActorClaimRequestRecord(
        id=row.id, personaId=row.personaId,
        personaName=row.persona.displayName if row.persona else "（身份已刪除）",
        requesterId=row.requesterId, requesterName=row.requester.displayName if row.requester else "",
        verifiedEmail=row.verifiedEmail, proofUrl=row.proofUrl, note=row.note,
        status=row.status, reviewNote=row.reviewNote or "", reviewedAt=row.reviewedAt, createdAt=row.createdAt,
    ) for row in rows]
    return schemas.VoiceActorClaimRequestListResponse(total=len(items), items=items)


@router.get("/voice-actor-profile-submissions/mine", response_model=schemas.VoiceActorProfileSubmissionListResponse)
def list_owned_voice_actor_profile_submissions(
    status: str = "pending",
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    profile_kind = models.VoiceActorProfileSubmission.profile["profileKind"].as_string()
    query = db.query(models.VoiceActorProfileSubmission).join(models.Persona).filter(
        models.Persona.ownerId == user_id,
        profile_kind.is_(None) | (profile_kind == "voice_actor"),
    )
    if status != "all":
        query = query.filter(models.VoiceActorProfileSubmission.status == status)
    rows = query.order_by(models.VoiceActorProfileSubmission.createdAt.desc()).limit(100).all()
    records = []
    for row in rows:
        persona = row.persona
        records.append(schemas.VoiceActorProfileSubmissionRecord(
            id=row.id, personaId=row.personaId, personaName=persona.displayName or "",
            profileKind="voice_actor",
            submitterName=row.submitterName, contactEmail=row.contactEmail,
            contributorName=str((row.profile or {}).get("contributorName") or ""),
            collaborators=persona.voiceActorContributors if isinstance(persona.voiceActorContributors, list) else [],
            currentProfile={"displayName": persona.displayName or "", "bio": persona.bio or "", "avatar": persona.avatar or "", "website": persona.website or "", "links": crud._ensure_list(persona.links), "organizations": persona.voiceActorOrganizations if isinstance(persona.voiceActorOrganizations, list) else [], "works": persona.voiceActorWorks if isinstance(persona.voiceActorWorks, list) else []},
            profile=row.profile or {}, acceptedFields=row.acceptedFields if isinstance(row.acceptedFields, list) else [],
            status=row.status, reviewNote=row.reviewNote or "", reviewedAt=row.reviewedAt, createdAt=row.createdAt,
        ))
    return schemas.VoiceActorProfileSubmissionListResponse(total=len(records), items=records)


@router.put("/voice-actor-collaboration/{persona_id}")
def update_voice_actor_collaboration(
    persona_id: str,
    payload: schemas.VoiceActorCollaborationUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    persona = db.query(models.Persona).filter_by(id=persona_id).first()
    if not persona or persona.ownerId != user_id:
        raise HTTPException(status_code=404, detail="找不到你管理的聲演身份")
    role = db.query(models.PersonaRole).filter_by(personaId=persona_id, role="voice_actor").first()
    if not role:
        raise HTTPException(status_code=404, detail="找不到聲演身份資料")
    profile = dict(role.profile) if isinstance(role.profile, dict) else {}
    profile["collaborationEnabled"] = payload.enabled
    role.profile = profile
    role.updatedAt = int(time.time() * 1000)
    db.commit()
    from routers import public_bundle
    public_bundle.invalidate_public_bundle_cache()
    _queue_demo_revalidation(background_tasks, f"/author/{persona.id}")
    return {"success": True, "enabled": payload.enabled}


@router.patch("/voice-actor-profile-submissions/{submission_id}/owner-status", response_model=schemas.VoiceActorProfileSubmissionRecord)
def review_owned_voice_actor_profile_submission(
    submission_id: str,
    payload: schemas.VoiceActorProfileSubmissionStatusUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    row = db.query(models.VoiceActorProfileSubmission).filter_by(id=submission_id).first()
    if not row or not row.persona or row.persona.ownerId != user_id:
        raise HTTPException(status_code=404, detail="找不到待你審核的資料補充")
    if str((row.profile or {}).get("profileKind") or "voice_actor") != "voice_actor":
        raise HTTPException(status_code=404, detail="找不到待你審核的聲演資料補充")
    if row.status != "pending":
        raise HTTPException(status_code=409, detail="這筆申請已完成審核")
    persona = row.persona
    now_ms = int(time.time() * 1000)
    if payload.status == "approved":
        profile = row.profile if isinstance(row.profile, dict) else {}
        accepted = set(payload.acceptedFields)
        if not accepted:
            raise HTTPException(status_code=400, detail="請至少選擇一個要採用的資料欄位")
        if "displayName" in accepted: persona.displayName = str(profile.get("displayName") or persona.displayName or "").strip()[:120]
        if "bio" in accepted: persona.bio = str(profile.get("bio") or "").strip()[:4000]
        if "avatar" in accepted: persona.avatar = str(profile.get("avatar") or "").strip()[:2000]
        if "website" in accepted: persona.website = str(profile.get("website") or "").strip()[:2000]
        if "links" in accepted: persona.links = [item for item in profile.get("links", []) if isinstance(item, dict)][:30]
        if "organizations" in accepted: persona.voiceActorOrganizations = [item for item in profile.get("organizations", []) if isinstance(item, dict)][:20]
        if "works" in accepted: persona.voiceActorWorks = [item for item in profile.get("works", []) if isinstance(item, dict)][:50]
        if "contributorName" in accepted:
            name = str(profile.get("contributorName") or "").strip()[:120] or "訪客協作者"
            existing = persona.voiceActorContributors if isinstance(persona.voiceActorContributors, list) else []
            persona.voiceActorContributors = [*existing, {"name": name, "contributedAt": now_ms}][:100]
        role = db.query(models.PersonaRole).filter_by(personaId=persona.id, role="voice_actor").first()
        if role:
            role_data = dict(role.profile) if isinstance(role.profile, dict) else {}
            role_data.update({"works": persona.voiceActorWorks, "organizations": persona.voiceActorOrganizations, "contributors": persona.voiceActorContributors})
            role.profile = role_data
            role.updatedAt = now_ms
        row.acceptedFields = sorted(accepted)
    else:
        row.acceptedFields = []
    row.status = payload.status
    row.reviewNote = payload.reviewNote.strip()[:1000]
    row.reviewedAt = now_ms
    row.reviewedBy = user_id
    persona.updatedAt = now_ms
    db.commit()
    from routers import public_bundle
    public_bundle.invalidate_public_bundle_cache()
    _queue_demo_revalidation(background_tasks, f"/author/{persona.id}", "/voice-actors")
    return schemas.VoiceActorProfileSubmissionRecord(
        id=row.id, personaId=row.personaId, personaName=persona.displayName or "", submitterName=row.submitterName,
        profileKind="voice_actor",
        contactEmail=row.contactEmail, contributorName=str((row.profile or {}).get("contributorName") or ""),
        collaborators=persona.voiceActorContributors if isinstance(persona.voiceActorContributors, list) else [],
        currentProfile={"displayName": persona.displayName or "", "bio": persona.bio or "", "avatar": persona.avatar or "", "website": persona.website or "", "links": crud._ensure_list(persona.links), "organizations": persona.voiceActorOrganizations if isinstance(persona.voiceActorOrganizations, list) else [], "works": persona.voiceActorWorks if isinstance(persona.voiceActorWorks, list) else []},
        profile=row.profile or {}, acceptedFields=row.acceptedFields or [], status=row.status, reviewNote=row.reviewNote or "", reviewedAt=row.reviewedAt, createdAt=row.createdAt,
    )


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
    visible_script_ids, visible_persona_ids, visible_org_ids = _public_script_identity_ids(db)
    persona_ids = list(visible_persona_ids)

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
    persona_ids.extend(
        row[0]
        for row in db.query(models.ExternalAuthorPageProfile.linkedPersonaId).filter(
            models.ExternalAuthorPageProfile.linkedPersonaId.isnot(None),
            models.ExternalAuthorPageProfile.isHidden.is_(False),
        ).distinct().all()
        if row[0]
    )

    persona_ids = list(dict.fromkeys(persona_ids))

    if not persona_ids:
        return []

    personas = db.query(models.Persona).filter(models.Persona.id.in_(persona_ids)).all()
    results = []

    all_org_ids = set()
    persona_org_map: dict[str, list[str]] = {p.id: [] for p in personas}
    for persona_id, org_id in db.query(
        models.PersonaOrganizationMembership.personaId,
        models.PersonaOrganizationMembership.orgId,
    ).filter(models.PersonaOrganizationMembership.personaId.in_(persona_org_map)).all():
        persona_org_map[persona_id].append(org_id)
    for p in personas:
        p.organizationIds = persona_org_map[p.id]
        p.tags = _public_persona_tags(p.tags)
        p.links = crud._ensure_list(p.links)
        p.defaultLicenseSpecialTerms = crud._ensure_list(p.defaultLicenseSpecialTerms)
        all_org_ids.update(p.organizationIds)

    org_map = _get_public_org_map(db, list(all_org_ids), visible_org_ids)
    identity_context = _build_public_identity_context(db, [p.id for p in personas], visible_script_ids)

    for p in personas:
        public_org_ids = [oid for oid in persona_org_map.get(p.id, []) if oid in org_map]
        p.organizationIds = public_org_ids
        projected = _public_identity_projection(
            db,
            p,
            [org_map[oid] for oid in public_org_ids],
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
    has_audio_work = db.query(models.PublicAudioWorkSubmission.id).filter(
        models.PublicAudioWorkSubmission.organizationId == org_id,
        models.PublicAudioWorkSubmission.status == "approved",
    ).first()
    if not _has_public_script_for_organization(db, org_id) and not has_audio_work:
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

    return _public_organization_projection(org, members)


def _public_organization_projection(
    org: models.Organization, members: list[models.Persona] | None = None,
) -> schemas.OrganizationPublic:
    # Validating the ORM relationship directly issues one users query per org.
    # The public projection supplies its curated member list explicitly.
    data = schemas.Organization.model_validate(org).model_dump()
    result = schemas.OrganizationPublic.model_validate({**data, "members": []})
    result.members = members or []
    return result

@router.get("/public-organizations", response_model=List[schemas.OrganizationPublic])
def list_public_organizations(db: Session = Depends(get_db)):
    # Audio-only organizations need public pages too.
    org_ids = set(_public_script_identity_ids(db)[2])
    org_ids.update(row[0] for row in db.query(models.PublicAudioWorkSubmission.organizationId).filter(
        models.PublicAudioWorkSubmission.status == "approved",
        models.PublicAudioWorkSubmission.organizationId.isnot(None),
    ).distinct().all() if row[0])
    orgs = db.query(models.Organization).filter(models.Organization.id.in_(list(org_ids))).all()
    results = []
    for org in orgs:
        org.tags = safe_json_list(org.tags)
        results.append(_public_organization_projection(org))
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
    try:
        result = crud.toggle_script_like(
            db,
            script_id,
            visitor_id=payload.visitorId,
            client_key=client_ip_digest(resolve_client_ip(request)[0]),
        )
    except AnonymousLikeLimitExceeded:
        raise HTTPException(status_code=429, detail="Anonymous like limit reached for this source")
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
    if not claim_recent_view(db, "external_script", item_id, resolve_client_ip(request)[0]):
        return {"views": item.views}
    item.views = int(item.views or 0) + 1
    db.commit()

    # Keep the short-lived homepage bundle in sync for the next page visit.
    try:
        import routers.public_bundle as public_bundle_router

        public_bundle_router.invalidate_public_bundle_cache()
    except Exception:
        pass
    return {"views": item.views}


@router.get("/default-marker-configs", response_model=List[dict])
def read_default_marker_configs(db: Session = Depends(get_db)):
    return crud.get_system_default_configs(db)
