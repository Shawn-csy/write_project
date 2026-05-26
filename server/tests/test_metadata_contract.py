"""
Metadata Contract Tests (E7 — backend)

Verifies the single-track metadata invariants for the API layer:
  1. Structured fields round-trip correctly through create/update/get
  2. Reserved custom keys in customMetadata do NOT corrupt structured fields
  3. Response always exposes structured fields at top-level
  4. All 7 structured content fields (E1-E6) covered

Mirrors the frontend contract suite at src/lib/metadataContract.test.ts.
"""

import json
import pytest

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

RESERVED_CUSTOM_KEYS = [
    "Synopsis", "summary", "description", "notes",
    "Outline",
    "ActivityName", "EventName",
    "ActivityBanner", "EventBanner",
    "ActivityContent", "EventContent",
    "ActivityWorkUrl", "EventWorkLink",
    "ActivityDemoLinks", "EventDemoLinks",
    "ActivityDemoUrl", "EventDemoLink",
]

STRUCTURED_FIELD_VALUES = {
    "synopsis":          "契約簡介",
    "outline":           "契約大綱",
    "activityName":      "契約活動名",
    "activityBannerUrl": "https://example.com/contract-banner.jpg",
    "activityContent":   "契約活動說明",
    "activityWorkUrl":   "https://example.com/contract-work",
    "activityDemoLinks": json.dumps([{"name": "契約示範", "url": "https://example.com/demo", "cast": "", "description": ""}]),
}

HEADERS = {"X-User-ID": "u_contract"}


def _create_script(client, **fields):
    payload = {"title": "Contract Script", **fields}
    res = client.post("/api/scripts", json=payload, headers=HEADERS)
    assert res.status_code == 200, res.text
    return res.json()["id"]


def _get_script(client, script_id):
    res = client.get(f"/api/scripts/{script_id}", headers=HEADERS)
    assert res.status_code == 200
    return res.json()


def _update_script(client, script_id, **fields):
    res = client.put(f"/api/scripts/{script_id}", json=fields, headers=HEADERS)
    assert res.status_code == 200, res.text
    return res.json()


# ---------------------------------------------------------------------------
# 1. Structured fields round-trip via create
# ---------------------------------------------------------------------------

def test_create_all_structured_fields_roundtrip(client):
    """All 7 structured content fields survive create → get."""
    script_id = _create_script(client, **STRUCTURED_FIELD_VALUES)
    data = _get_script(client, script_id)

    assert data["synopsis"] == "契約簡介"
    assert data["outline"] == "契約大綱"
    assert data["activityName"] == "契約活動名"
    assert data["activityBannerUrl"] == "https://example.com/contract-banner.jpg"
    assert data["activityContent"] == "契約活動說明"
    assert data["activityWorkUrl"] == "https://example.com/contract-work"
    assert data["activityDemoLinks"] is not None
    parsed = json.loads(data["activityDemoLinks"])
    assert parsed[0]["url"] == "https://example.com/demo"


# ---------------------------------------------------------------------------
# 2. Structured fields round-trip via update
# ---------------------------------------------------------------------------

def test_update_all_structured_fields_roundtrip(client):
    """All 7 structured content fields survive update → get."""
    script_id = _create_script(client)
    _update_script(client, script_id, **STRUCTURED_FIELD_VALUES)
    data = _get_script(client, script_id)

    assert data["synopsis"] == "契約簡介"
    assert data["outline"] == "契約大綱"
    assert data["activityName"] == "契約活動名"
    assert data["activityBannerUrl"] == "https://example.com/contract-banner.jpg"
    assert data["activityContent"] == "契約活動說明"
    assert data["activityWorkUrl"] == "https://example.com/contract-work"
    assert data["activityDemoLinks"] is not None


# ---------------------------------------------------------------------------
# 3. Reserved custom keys do NOT corrupt structured fields (create path)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("reserved_key,structured_field", [
    ("Synopsis",          "synopsis"),
    ("Outline",           "outline"),
    ("ActivityName",      "activityName"),
    ("ActivityBanner",    "activityBannerUrl"),
    ("ActivityContent",   "activityContent"),
    ("ActivityWorkUrl",   "activityWorkUrl"),
    ("ActivityDemoLinks", "activityDemoLinks"),
    ("EventName",         "activityName"),
    ("EventBanner",       "activityBannerUrl"),
    ("EventContent",      "activityContent"),
    ("EventWorkLink",     "activityWorkUrl"),
])
def test_create_reserved_custom_key_does_not_populate_structured_field(client, reserved_key, structured_field):
    """customMetadata with reserved key must NOT backfill the structured DB field."""
    script_id = _create_script(client, customMetadata=[
        {"key": reserved_key, "value": "reserved-value-should-not-win"},
    ])
    data = _get_script(client, script_id)
    field_val = data.get(structured_field)
    # Must be null/empty — reserved custom key must not have been promoted
    assert field_val in (None, ""), (
        f"Reserved key '{reserved_key}' corrupted structured field '{structured_field}': got {field_val!r}"
    )


# ---------------------------------------------------------------------------
# 4. Reserved custom keys do NOT corrupt structured fields (update path)
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("reserved_key,structured_field", [
    ("Synopsis",          "synopsis"),
    ("Outline",           "outline"),
    ("ActivityName",      "activityName"),
    ("ActivityContent",   "activityContent"),
    ("ActivityWorkUrl",   "activityWorkUrl"),
])
def test_update_reserved_custom_key_does_not_overwrite_structured_field(client, reserved_key, structured_field):
    """Updating customMetadata with reserved key must not overwrite an existing structured field."""
    # Create with structured value
    structured_val = STRUCTURED_FIELD_VALUES[structured_field]
    script_id = _create_script(client, **{structured_field: structured_val})

    # Update: send ONLY reserved custom key (no structured field)
    _update_script(client, script_id, customMetadata=[
        {"key": reserved_key, "value": "reserved-should-not-overwrite"},
    ])
    data = _get_script(client, script_id)
    assert data.get(structured_field) == structured_val, (
        f"Reserved key '{reserved_key}' overwrote structured field '{structured_field}'"
    )


# ---------------------------------------------------------------------------
# 5. Structured fields appear at response top-level (not only in customMetadata)
# ---------------------------------------------------------------------------

def test_structured_fields_present_at_top_level_in_response(client):
    """API response exposes structured fields as top-level keys, not buried in customMetadata."""
    script_id = _create_script(client, **STRUCTURED_FIELD_VALUES)
    data = _get_script(client, script_id)

    top_level_structured = [
        "synopsis", "outline", "activityName", "activityBannerUrl",
        "activityContent", "activityWorkUrl", "activityDemoLinks",
    ]
    for field in top_level_structured:
        assert field in data, f"Structured field '{field}' missing from response top-level"
        assert data[field] is not None, f"Structured field '{field}' is null in response"


# ---------------------------------------------------------------------------
# 6. Summary endpoint also exposes structured fields
# ---------------------------------------------------------------------------

def test_summary_endpoint_exposes_structured_fields(client):
    """GET /api/scripts (summary list) also returns structured content fields."""
    script_id = _create_script(client, synopsis="清單簡介", activityName="清單活動")
    summary_list = client.get("/api/scripts", headers=HEADERS).json()
    item = next((s for s in summary_list if s["id"] == script_id), None)
    assert item is not None
    assert item.get("synopsis") == "清單簡介"
    assert item.get("activityName") == "清單活動"


# ---------------------------------------------------------------------------
# 7. Explicit null/empty structured field via update clears the DB column
# ---------------------------------------------------------------------------

def test_update_clears_structured_field_when_null_sent(client):
    """Sending null for a structured field via update should clear the DB column."""
    script_id = _create_script(client, synopsis="有簡介")
    data_before = _get_script(client, script_id)
    assert data_before["synopsis"] == "有簡介"

    _update_script(client, script_id, synopsis=None)
    data_after = _get_script(client, script_id)
    assert data_after.get("synopsis") in (None, "")


# ---------------------------------------------------------------------------
# 8. activityDemoLinks JSON integrity
# ---------------------------------------------------------------------------

def test_activity_demo_links_json_roundtrip(client):
    """activityDemoLinks stored and returned as valid JSON string."""
    links = [
        {"name": "示範A", "url": "https://example.com/a", "cast": "聲優A", "description": ""},
        {"name": "示範B", "url": "https://example.com/b", "cast": "", "description": "說明B"},
    ]
    script_id = _create_script(client, activityDemoLinks=json.dumps(links))
    data = _get_script(client, script_id)

    raw = data.get("activityDemoLinks")
    assert raw is not None
    parsed = json.loads(raw)
    assert len(parsed) == 2
    assert parsed[0]["url"] == "https://example.com/a"
    assert parsed[1]["name"] == "示範B"
