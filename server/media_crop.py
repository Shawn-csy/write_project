import json
from typing import Any, Dict, Optional, Tuple
from urllib.parse import unquote


def _clamp(value: float, min_value: float, max_value: float) -> float:
    return min(max_value, max(min_value, value))


def normalize_crop_payload(payload: Any) -> Optional[Dict[str, float]]:
    if not isinstance(payload, dict):
        return None
    try:
        cx = _clamp(float(payload.get("cx", 0.0)), -1.0, 1.0)
        cy = _clamp(float(payload.get("cy", 0.0)), -1.0, 1.0)
        zoom = _clamp(float(payload.get("zoom", 1.0)), 0.35, 3.0)
    except Exception:
        return None
    return {"cx": cx, "cy": cy, "zoom": zoom}


def parse_crop_from_url(url: Any) -> Tuple[str, Optional[Dict[str, float]]]:
    text = str(url or "").strip()
    if not text:
        return "", None
    src, sep, hash_part = text.partition("#")
    if not sep or not hash_part:
        return text, None
    for part in hash_part.split("&"):
        if not part.startswith("srCrop="):
            continue
        encoded = part.split("=", 1)[1]
        if not encoded:
            break
        try:
            parsed = json.loads(unquote(encoded))
        except Exception:
            break
        normalized = normalize_crop_payload(parsed)
        return src, normalized
    return src, None


def normalize_media_with_crop(url: Any, crop: Any = None) -> Tuple[str, Optional[Dict[str, float]]]:
    cleaned_src, parsed_crop = parse_crop_from_url(url)
    normalized_crop = normalize_crop_payload(crop)
    return cleaned_src, normalized_crop or parsed_crop
