"""
Public API canonical metadata field tests.

After removing _normalize_public_script_canonical_fields (Phase 4),
customMetadata no longer fills canonical fields at runtime.
Only DB columns populate the public response.
"""

import json
import pytest

HEADERS = {"X-User-ID": "u_canonical_meta"}


def _make_public_script(client, extra=None):
    payload = {"title": "Canonical Test Script", "isPublic": 1}
    if extra:
        payload.update(extra)
    res = client.post("/api/scripts", json=payload, headers=HEADERS)
    assert res.status_code == 200, res.text
    return res.json()["id"]


def _get_public(client, script_id):
    res = client.get(f"/api/public-scripts/{script_id}")
    assert res.status_code == 200, res.text
    return res.json()


# ── 1. Canonical fields present at top-level ─────────────────────────────────

def test_canonical_fields_present_in_response(client):
    script_id = _make_public_script(client, {
        "targetAudience": "成人",
        "contentRating": "限制級",
        "license": "CC BY-NC 4.0",
        "licenseSpecialTerms": json.dumps(["不得商用"]),
        "authorDisplayMode": "persona",
    })
    data = _get_public(client, script_id)
    assert data["targetAudience"] == "成人"
    assert data["contentRating"] == "限制級"
    assert data["license"] == "CC BY-NC 4.0"
    assert data["licenseSpecialTerms"] == json.dumps(["不得商用"])
    assert data["authorDisplayMode"] == "persona"


# ── 2. Top-level DB value wins over customMetadata ───────────────────────────

def test_top_level_wins_over_custom_metadata(client):
    """When DB column and customMetadata both have a value, DB column wins."""
    script_id = _make_public_script(client, {
        "targetAudience": "全年齡",
        "customMetadata": [{"key": "TargetAudience", "value": "成人"}],
    })
    data = _get_public(client, script_id)
    assert data["targetAudience"] == "全年齡", (
        "DB column should win over customMetadata value"
    )


def test_license_top_level_wins_over_custom_metadata(client):
    script_id = _make_public_script(client, {
        "license": "CC BY 4.0",
        "customMetadata": [{"key": "License", "value": "All Rights Reserved"}],
    })
    data = _get_public(client, script_id)
    assert data["license"] == "CC BY 4.0"


# ── 3. customMetadata no longer fills canonical fields (normalization removed) ─

def test_target_audience_not_filled_from_custom_metadata(client):
    script_id = _make_public_script(client, {
        "customMetadata": [{"key": "TargetAudience", "value": "青少年"}],
    })
    data = _get_public(client, script_id)
    assert data.get("targetAudience") is None


def test_target_audience_not_filled_from_chinese_key(client):
    script_id = _make_public_script(client, {
        "customMetadata": [{"key": "觀眾取向", "value": "親子"}],
    })
    data = _get_public(client, script_id)
    assert data.get("targetAudience") is None


def test_content_rating_not_filled_from_custom_metadata(client):
    script_id = _make_public_script(client, {
        "customMetadata": [{"key": "ContentRating", "value": "普遍級"}],
    })
    data = _get_public(client, script_id)
    assert data.get("contentRating") is None


def test_content_rating_not_filled_from_chinese_key(client):
    script_id = _make_public_script(client, {
        "customMetadata": [{"key": "內容分級", "value": "輔導級"}],
    })
    data = _get_public(client, script_id)
    assert data.get("contentRating") is None


def test_license_not_filled_from_custom_metadata(client):
    script_id = _make_public_script(client, {
        "customMetadata": [{"key": "License", "value": "CC BY-NC-ND 4.0"}],
    })
    data = _get_public(client, script_id)
    assert data.get("license") is None


def test_license_not_filled_from_chinese_key(client):
    script_id = _make_public_script(client, {
        "customMetadata": [{"key": "授權", "value": "MIT"}],
    })
    data = _get_public(client, script_id)
    assert data.get("license") is None


def test_license_special_terms_not_filled_from_custom_metadata(client):
    terms = ["禁止商用", "禁止AI訓練"]
    script_id = _make_public_script(client, {
        "customMetadata": [{"key": "LicenseSpecialTerms", "value": json.dumps(terms)}],
    })
    data = _get_public(client, script_id)
    assert data.get("licenseSpecialTerms") is None


def test_author_display_mode_not_filled_from_custom_metadata(client):
    script_id = _make_public_script(client, {
        "customMetadata": [{"key": "AuthorDisplayMode", "value": "override"}],
    })
    data = _get_public(client, script_id)
    assert data.get("authorDisplayMode") is None


def test_author_override_name_not_filled_from_custom_metadata(client):
    script_id = _make_public_script(client, {
        "customMetadata": [
            {"key": "AuthorDisplayMode", "value": "override"},
            {"key": "Author", "value": "匿名作者"},
        ],
    })
    data = _get_public(client, script_id)
    assert data.get("authorDisplayMode") is None
    assert data.get("authorOverrideName") is None


# ── 4. Canonical fields null when no data ────────────────────────────────────

def test_canonical_fields_null_when_absent(client):
    script_id = _make_public_script(client)
    data = _get_public(client, script_id)
    assert data.get("targetAudience") is None
    assert data.get("contentRating") is None
    assert data.get("license") is None
    assert data.get("licenseSpecialTerms") is None
    assert data.get("authorDisplayMode") is None
    assert data.get("authorOverrideName") is None


# ── 5. Fields present in /api/public-bundle ───────────────────────────────────

def test_bundle_includes_canonical_fields(client):
    import routers.public_bundle as pb
    pb._bundle_cache = None
    script_id = _make_public_script(client, {
        "targetAudience": "一般向",
        "contentRating": "G",
        "license": "CC0",
    })
    pb._bundle_cache = None
    res = client.get("/api/public-bundle")
    assert res.status_code == 200
    scripts = res.json()["scripts"]
    match = next((s for s in scripts if s["id"] == script_id), None)
    assert match is not None, "Script not found in bundle"
    assert match["targetAudience"] == "一般向"
    assert match["contentRating"] == "G"
    assert match["license"] == "CC0"


def test_bundle_does_not_fill_canonical_fields_from_custom_metadata(client):
    import routers.public_bundle as pb
    pb._bundle_cache = None
    script_id = _make_public_script(client, {
        "customMetadata": [
            {"key": "ContentRating", "value": "PG-13"},
            {"key": "License", "value": "CC BY 4.0"},
        ],
    })
    pb._bundle_cache = None
    res = client.get("/api/public-bundle")
    assert res.status_code == 200
    scripts = res.json()["scripts"]
    match = next((s for s in scripts if s["id"] == script_id), None)
    assert match is not None, "Script not found in bundle"
    assert match.get("contentRating") is None
    assert match.get("license") is None
