import json
import re
from datetime import datetime, date
from zoneinfo import ZoneInfo
from urllib.parse import urlsplit


def validate_banner_url(value, required=False, allow_media=False):
    value = str(value or "").strip()
    if not value and not required:
        return
    if allow_media and value.startswith("/media/") and "\\" not in value and not re.search(r"[\s\x00-\x1f]", value):
        return
    if not required and value.startswith("/") and not value.startswith("//") and "\\" not in value:
        return
    parsed = urlsplit(value)
    if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username or parsed.password or re.search(r"[\s\\]", value):
        raise ValueError("請使用有效的 HTTP(S) 網址")


def validate_banner_schedule(start, end):
    for value in (start, end):
        if value and (not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value) or date.fromisoformat(value).isoformat() != value):
            raise ValueError("日期格式須為 YYYY-MM-DD")
    if start and end and end < start:
        raise ValueError("結束日期不能早於開始日期")


def public_banner_value(value, placement, today=None):
    today = today or datetime.now(ZoneInfo("Asia/Taipei")).date().isoformat()
    items = []
    for item in value.get("items", []):
        if item.get("placement") and item["placement"] != placement:
            continue
        try:
            validate_banner_schedule(item.get("startDate"), item.get("endDate"))
        except ValueError:
            continue
        if item.get("startDate") and item["startDate"] > today:
            continue
        if item.get("endDate") and item["endDate"] < today:
            continue
        items.append(item)
    first = items[0] if items else {}
    return {**{key: first.get(key, "") for key in ("title", "content", "link", "imageUrl")}, "items": items}



def normalize_homepage_banner_value(raw_value: str) -> dict:
    try:
        parsed = json.loads(str(raw_value or ""))
    except Exception:
        parsed = {}
    if not isinstance(parsed, dict):
        parsed = {}

    raw_items = parsed.get("items")
    items = []
    if isinstance(raw_items, list):
        for idx, item in enumerate(raw_items):
            if not isinstance(item, dict):
                continue
            normalized = {
                "id": str(item.get("id") or f"slide-{idx + 1}").strip() or f"slide-{idx + 1}",
                "title": str(item.get("title") or "").strip(),
                "content": str(item.get("content") or "").strip(),
                "link": str(item.get("link") or "").strip(),
                "imageUrl": str(item.get("imageUrl") or "").strip(),
            }
            for key in ("placement", "startDate", "endDate"):
                if item.get(key):
                    normalized[key] = item[key]
            eyebrow = item.get("eyebrow")
            if isinstance(eyebrow, str) and eyebrow.strip():
                normalized["eyebrow"] = eyebrow.strip()
            # Hero placement fields — preserve as-is (None if absent).
            image_alt = item.get("imageAlt")
            if isinstance(image_alt, str) and image_alt.strip():
                normalized["imageAlt"] = image_alt.strip()
            for crop_key in ("imageCrop", "imageMobileCrop", "imageDesktopCrop", "imageUltraWideCrop"):
                crop = item.get(crop_key)
                if isinstance(crop, dict):
                    normalized[crop_key] = crop
            bg_mode = item.get("imageBackgroundMode")
            if bg_mode in ("cover", "blur-fill"):
                normalized["imageBackgroundMode"] = bg_mode
            if normalized["title"] or normalized["content"] or normalized["link"] or normalized["imageUrl"]:
                items.append(normalized)

    if not items:
        fallback = {
            "id": "slide-1",
            "title": str(parsed.get("title") or "").strip(),
            "content": str(parsed.get("content") or "").strip(),
            "link": str(parsed.get("link") or "").strip(),
            "imageUrl": str(parsed.get("imageUrl") or "").strip(),
        }
        for key in ("placement", "startDate", "endDate"):
            if parsed.get(key):
                fallback[key] = parsed[key]
        eyebrow = parsed.get("eyebrow")
        if isinstance(eyebrow, str) and eyebrow.strip():
            fallback["eyebrow"] = eyebrow.strip()
        image_alt = parsed.get("imageAlt")
        if isinstance(image_alt, str) and image_alt.strip():
            fallback["imageAlt"] = image_alt.strip()
        for crop_key in ("imageCrop", "imageMobileCrop", "imageDesktopCrop", "imageUltraWideCrop"):
            crop = parsed.get(crop_key)
            if isinstance(crop, dict):
                fallback[crop_key] = crop
        bg_mode = parsed.get("imageBackgroundMode")
        if bg_mode in ("cover", "blur-fill"):
            fallback["imageBackgroundMode"] = bg_mode
        if fallback["title"] or fallback["content"] or fallback["link"] or fallback["imageUrl"]:
            items = [fallback]

    first = items[0] if items else {"title": "", "content": "", "link": "", "imageUrl": ""}
    return {
        "title": str(first.get("title") or ""),
        "content": str(first.get("content") or ""),
        "link": str(first.get("link") or ""),
        "imageUrl": str(first.get("imageUrl") or ""),
        "items": items,
    }


def safe_json_list(value) -> list:
    """Parse a value that should be a JSON list. Returns [] on any failure, handles double-encoded strings."""
    if isinstance(value, list):
        return value
    if not isinstance(value, str):
        return []
    try:
        result = json.loads(value)
        if isinstance(result, list):
            return result
        if isinstance(result, str):
            inner = json.loads(result)
            if isinstance(inner, list):
                return inner
    except Exception:
        pass
    return []


def seconds_until_taipei_midnight():
    now = datetime.now(ZoneInfo("Asia/Taipei"))
    from datetime import timedelta
    tomorrow = datetime.combine(now.date() + timedelta(days=1), datetime.min.time(), tzinfo=now.tzinfo)
    return max(0.001, (tomorrow - now).total_seconds())
