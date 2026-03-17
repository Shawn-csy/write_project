import os
import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dependencies import get_current_user_id, get_db, is_admin_user

router = APIRouter(prefix="/api/media", tags=["media"])

ALLOWED_IMAGE_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

MAX_UPLOAD_BYTES = int(os.getenv("MEDIA_UPLOAD_MAX_BYTES", str(10 * 1024 * 1024)))


def _media_storage_root() -> str:
    root = os.getenv("MEDIA_STORAGE_ROOT", "/data/media")
    try:
        os.makedirs(root, exist_ok=True)
        return root
    except PermissionError:
        fallback = os.path.join(os.path.dirname(__file__), "..", "data", "media")
        fallback = os.path.abspath(fallback)
        os.makedirs(fallback, exist_ok=True)
        return fallback


def _safe_segment(value: str, fallback: str) -> str:
    text = "".join(ch for ch in str(value or "") if ch.isalnum() or ch in ("-", "_"))
    return text or fallback


def _user_media_root(owner_id: str) -> str:
    root = _media_storage_root()
    safe_owner = _safe_segment(owner_id, "anon")
    path = os.path.join(root, safe_owner)
    os.makedirs(path, exist_ok=True)
    return path


def _matches_image_signature(content_type: str, data: bytes) -> bool:
    if not data:
        return False
    if content_type in {"image/jpeg", "image/jpg"}:
        return data.startswith(b"\xFF\xD8\xFF")
    if content_type == "image/png":
        return data.startswith(b"\x89PNG\r\n\x1a\n")
    if content_type == "image/gif":
        return data.startswith(b"GIF87a") or data.startswith(b"GIF89a")
    if content_type == "image/webp":
        # RIFF....WEBP
        return len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP"
    return False


def _to_public_url(owner_id: str, full_path: str) -> str:
    owner_root = Path(_user_media_root(owner_id))
    target = Path(full_path)
    rel = target.relative_to(owner_root)
    return f"/media/{_safe_segment(owner_id, 'anon')}/{str(rel).replace(os.sep, '/')}"


def _resolve_url_to_path(owner_id: str, url: str) -> str:
    text = str(url or "").strip()
    if not text.startswith("/media/"):
        raise HTTPException(status_code=400, detail="Invalid media url")

    owner_seg = _safe_segment(owner_id, "anon")
    prefix = f"/media/{owner_seg}/"
    if not text.startswith(prefix):
        raise HTTPException(status_code=403, detail="Forbidden media url")

    rel = text[len(prefix):].strip("/")
    if not rel:
        raise HTTPException(status_code=400, detail="Invalid media url")

    owner_root = Path(_user_media_root(owner_id)).resolve()
    abs_path = (owner_root / rel).resolve()
    if owner_root not in abs_path.parents and abs_path != owner_root:
        raise HTTPException(status_code=403, detail="Forbidden media path")
    return str(abs_path)


class DeleteMediaPayload(BaseModel):
    url: str


@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    purpose: str = Form("generic"),
    owner_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_db),
):
    content_type = str(file.content_type or "").lower()
    ext = ALLOWED_IMAGE_TYPES.get(content_type)
    if not ext:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    is_admin = is_admin_user(db, owner_id)

    safe_owner = _safe_segment(owner_id, "anon")
    safe_purpose = _safe_segment(purpose, "generic")
    filename = f"{uuid.uuid4().hex}{ext}"

    root = _media_storage_root()
    folder = os.path.join(root, safe_owner, safe_purpose)
    os.makedirs(folder, exist_ok=True)
    full_path = os.path.join(folder, filename)

    total_size = 0
    validated_signature = False
    try:
        with open(full_path, "wb") as target:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                if not validated_signature:
                    if not _matches_image_signature(content_type, chunk):
                        raise HTTPException(status_code=400, detail="Uploaded file signature does not match image type")
                    validated_signature = True
                total_size += len(chunk)
                if not is_admin and total_size > MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail="Uploaded image is too large")
                target.write(chunk)
    except HTTPException:
        if os.path.exists(full_path):
            os.remove(full_path)
        raise
    except Exception:
        if os.path.exists(full_path):
            os.remove(full_path)
        raise
    finally:
        await file.close()

    if total_size == 0:
        if os.path.exists(full_path):
            os.remove(full_path)
        raise HTTPException(status_code=400, detail="Empty upload")

    public_path = f"/media/{safe_owner}/{safe_purpose}/{filename}"
    return {
        "url": public_path,
        "size": total_size,
        "contentType": content_type,
    }


@router.get("/items")
async def list_media(owner_id: str = Depends(get_current_user_id)):
    base = Path(_user_media_root(owner_id))
    if not base.exists():
        return {"items": []}

    items = []
    for path in base.rglob("*"):
        if not path.is_file():
            continue
        stat = path.stat()
        items.append({
            "id": _to_public_url(owner_id, str(path)),
            "url": _to_public_url(owner_id, str(path)),
            "name": path.name,
            "sizeBytes": int(stat.st_size),
            "createdAt": int(stat.st_mtime * 1000),
            "source": "upload",
        })

    items.sort(key=lambda item: item.get("createdAt", 0), reverse=True)
    return {"items": items}


@router.delete("/items")
async def delete_media(
    payload: DeleteMediaPayload,
    owner_id: str = Depends(get_current_user_id),
):
    target = _resolve_url_to_path(owner_id, payload.url)
    if not os.path.exists(target):
        return {"success": True}
    os.remove(target)
    return {"success": True}
