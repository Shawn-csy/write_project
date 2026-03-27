import json


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
