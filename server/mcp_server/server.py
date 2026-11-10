"""Local stdio MCP server for external scripts and Demo management.

This process intentionally exposes no HTTP listener. The MCP host launches it as
a child process, and the server calls only the explicitly scoped admin API
routes using the local MCP key loaded by the launcher.
"""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Literal

from mcp.server import MCPServer


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("write-project-local-mcp")

mcp = MCPServer("write-project-content")


def _api_base_url() -> str:
    return (os.getenv("WRITE_PROJECT_API_BASE_URL") or "https://open-scripts.shawnup.com/api").rstrip("/")


def _mcp_key() -> str:
    key = str(os.getenv("MCP_LOCAL_API_KEY") or "").strip()
    if not key:
        raise RuntimeError("MCP_LOCAL_API_KEY is not configured")
    return key


def _request(method: str, path: str, payload: dict[str, Any] | None = None) -> dict[str, Any] | list[Any]:
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = urllib.request.Request(
        f"{_api_base_url()}{path}",
        data=body,
        method=method,
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-MCP-Key": _mcp_key(),
            "User-Agent": "write-project-local-mcp/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            raw = response.read().decode("utf-8", errors="replace")
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(detail)
            detail = str(parsed.get("detail") or detail)
        except json.JSONDecodeError:
            pass
        raise RuntimeError(f"write_project API {exc.code}: {detail}") from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"write_project API unavailable: {exc.reason}") from exc

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError("write_project API returned invalid JSON") from exc


def _compact_preview(data: dict[str, Any]) -> dict[str, Any]:
    compact = {
        "sourceUrl": data.get("sourceUrl", ""),
        "canonicalUrl": data.get("canonicalUrl", ""),
        "sourceDomain": data.get("sourceDomain", ""),
        "sourceName": data.get("sourceName", ""),
        "title": data.get("remoteTitle", ""),
        "summary": data.get("remoteSummary", ""),
        "authorName": data.get("authorName", ""),
        "authorUrl": data.get("authorUrl", ""),
        "authorAvatarUrl": data.get("authorAvatarUrl", ""),
        "organizationName": data.get("organizationName", ""),
        "organizationBio": data.get("organizationBio", ""),
        "organizationUrl": data.get("organizationUrl", ""),
        "organizationAvatarUrl": data.get("organizationAvatarUrl", ""),
        "sourceCreatedAt": data.get("sourceCreatedAt"),
        "coverAvailable": bool(data.get("coverPreviewDataUrl") or data.get("remoteCoverUrl")),
        "coverIsGeneratedFromFirstPage": bool(data.get("coverPreviewDataUrl")),
    }
    return compact


@mcp.tool()
def preview_external_public_script(source_url: str) -> dict[str, Any]:
    """Preview an external public script URL without saving it to the homepage."""

    data = _request("POST", "/admin/external-public-scripts/preview", {"sourceUrl": source_url})
    if not isinstance(data, dict):
        raise RuntimeError("Unexpected preview response")
    return _compact_preview(data)


@mcp.tool()
def add_external_public_script(
    source_url: str,
    categories: list[str] | None = None,
    title_override: str = "",
    summary_override: str = "",
    author_name: str = "",
    author_url: str = "",
    author_avatar_url: str = "",
    organization_name: str = "",
    organization_bio: str = "",
    organization_url: str = "",
    organization_avatar_url: str = "",
    series_name: str = "",
    series_order: int | None = None,
    mounted_at: int | None = None,
    status: Literal["published", "draft", "hidden"] = "published",
    sort_order: float = 0,
    confirm: bool = False,
) -> dict[str, Any]:
    """Add an external public script after an explicit confirm=true call.

    Call this once with confirm=false to prepare a preview. Only call with
    confirm=true after the user has explicitly approved publishing the item.
    """

    preview = preview_external_public_script(source_url)
    if not confirm:
        return {
            "status": "confirmation_required",
            "message": "資料已讀取；請向使用者展示預覽，取得明確同意後再以 confirm=true 呼叫。",
            "preview": preview,
        }

    payload = {
        "sourceUrl": source_url,
        "authorName": author_name,
        "authorUrl": author_url,
        "authorAvatarUrl": author_avatar_url,
        "organizationName": organization_name,
        "organizationBio": organization_bio,
        "organizationUrl": organization_url,
        "organizationAvatarUrl": organization_avatar_url,
        "seriesName": series_name,
        "seriesOrder": series_order,
        "mountedAt": mounted_at,
        "titleOverride": title_override,
        "summaryOverride": summary_override,
        "categories": categories or [],
        "status": status,
        "sortOrder": sort_order,
    }
    result = _request("POST", "/admin/external-public-scripts", payload)
    if not isinstance(result, dict):
        raise RuntimeError("Unexpected add response")
    return {
        "status": "added",
        "id": result.get("id", ""),
        "title": result.get("title") or result.get("remoteTitle") or preview.get("title", ""),
        "coverUrl": result.get("coverUrl", ""),
        "mountedAt": result.get("mountedAt", 0),
        "categories": result.get("categories", []),
        "sourceUrl": result.get("sourceUrl", source_url),
    }


@mcp.tool()
def list_external_public_scripts() -> list[dict[str, Any]]:
    """List external public scripts already registered in the gallery."""

    result = _request("GET", "/admin/external-public-scripts")
    if not isinstance(result, list):
        raise RuntimeError("Unexpected list response")
    return [
        {
            "id": item.get("id", ""),
            "title": item.get("title") or item.get("remoteTitle") or "",
            "sourceUrl": item.get("sourceUrl", ""),
            "status": item.get("status", ""),
            "categories": item.get("categories", []),
            "seriesName": item.get("seriesName", ""),
            "seriesOrder": item.get("seriesOrder"),
            "coverUrl": item.get("coverUrl", ""),
            "mountedAt": item.get("mountedAt", 0),
        }
        for item in result
        if isinstance(item, dict)
    ]


def _demo_record(data: dict[str, Any]) -> dict[str, Any]:
    """Keep management results concise and omit private contact details."""
    return {key: data.get(key) for key in (
        "id", "sourceKind", "parentId", "scriptType", "scriptId", "externalScriptId",
        "scriptTitle", "scriptUrl", "demoName", "demoUrl", "coverUrl", "cast",
        "voiceTypes", "voiceActorIds", "manualVoiceActors", "description", "status",
        "createdAt", "reviewedAt",
    ) if key in data}


@mcp.tool()
def list_demo_targets() -> list[dict[str, Any]]:
    """List scripts that an administrator can attach a Demo to."""
    result = _request("GET", "/admin/mcp/demos/targets")
    if not isinstance(result, list):
        raise RuntimeError("Unexpected Demo targets response")
    return [item for item in result if isinstance(item, dict)]


@mcp.tool()
def list_demo_voice_actors(query: str = "") -> list[dict[str, str]]:
    """Find existing voice-actor identities before linking a Demo."""
    params = urllib.parse.urlencode({"q": query})
    result = _request("GET", f"/admin/mcp/demos/voice-actors?{params}")
    if not isinstance(result, list):
        raise RuntimeError("Unexpected voice-actor list response")
    return [{"id": str(item.get("id") or ""), "displayName": str(item.get("displayName") or "")}
            for item in result if isinstance(item, dict)]


@mcp.tool()
def ensure_demo_voice_actor(display_name: str, confirm: bool = False) -> dict[str, Any]:
    """Reuse or create an unclaimed public voice-actor page; confirm=true is required."""
    name = display_name.strip()
    if not name:
        raise ValueError("Voice-actor name is required")
    matches = [item for item in list_demo_voice_actors(name) if item["displayName"].casefold() == name.casefold()]
    if len(matches) > 1:
        raise ValueError("Multiple voice-actor pages have this name; resolve them in Studio")
    if matches:
        return {"status": "existing", "voiceActor": matches[0]}
    if not confirm:
        return {"status": "confirmation_required", "displayName": name}
    result = _request("POST", "/admin/mcp/demos/voice-actors", {"displayName": name})
    if not isinstance(result, dict):
        raise RuntimeError("Unexpected voice-actor creation response")
    return {"status": "created", "voiceActor": {"id": str(result.get("id") or ""), "displayName": str(result.get("displayName") or "")}}


@mcp.tool()
def list_demos(status: Literal["all", "pending", "approved", "rejected"] = "all", query: str = "", limit: int = 100) -> dict[str, Any]:
    """List managed Demo records, including linked Demos and submissions."""
    params = urllib.parse.urlencode({"status": status, "q": query, "limit": max(1, min(limit, 200))})
    result = _request("GET", f"/admin/mcp/demos?{params}")
    if not isinstance(result, dict):
        raise RuntimeError("Unexpected Demo list response")
    return {"total": result.get("total", 0), "items": [_demo_record(item) for item in result.get("items", []) if isinstance(item, dict)]}


@mcp.tool()
def list_demo_submissions(status: Literal["all", "pending", "approved", "rejected"] = "pending", limit: int = 100) -> dict[str, Any]:
    """List Demo submissions waiting for review or already reviewed."""
    params = urllib.parse.urlencode({"status": status, "limit": max(1, min(limit, 200))})
    result = _request("GET", f"/admin/mcp/demos/submissions?{params}")
    if not isinstance(result, dict):
        raise RuntimeError("Unexpected Demo submissions response")
    return {"total": result.get("total", 0), "items": [_demo_record(item) for item in result.get("items", []) if isinstance(item, dict)]}


@mcp.tool()
def add_demo(
    source_kind: Literal["internal", "external"],
    parent_id: str,
    demo_url: str,
    demo_name: str = "",
    cover_url: str = "",
    cast: str = "",
    voice_types: list[Literal["male", "female"]] | None = None,
    voice_actor_ids: list[str] | None = None,
    description: str = "",
    confirm: bool = False,
) -> dict[str, Any]:
    """Attach and publish a Demo to an existing script; confirm=true is required."""
    targets = list_demo_targets()
    target = next((item for item in targets if item.get("sourceKind") == source_kind and item.get("id") == parent_id), None)
    if not target:
        raise ValueError("Demo target was not found; call list_demo_targets first")
    payload = {
        "sourceKind": source_kind, "parentId": parent_id, "demoName": demo_name,
        "demoUrl": demo_url, "coverUrl": cover_url, "cast": cast,
        "voiceTypes": voice_types or [], "voiceActorIds": voice_actor_ids or [],
        "description": description,
    }
    if not confirm:
        return {"status": "confirmation_required", "target": target, "demo": payload}
    result = _request("POST", "/admin/mcp/demos", payload)
    if not isinstance(result, dict):
        raise RuntimeError("Unexpected Demo creation response")
    return {"status": "added", "demo": _demo_record(result)}


@mcp.tool()
def review_demo_submission(
    submission_id: str,
    decision: Literal["approved", "rejected", "pending"],
    confirm: bool = False,
) -> dict[str, Any]:
    """Approve, reject, or reopen a Demo submission after showing its details."""
    submissions = list_demo_submissions(status="all", limit=200)
    item = next((row for row in submissions["items"] if row.get("id") == submission_id), None)
    if not item:
        raise ValueError("Submission was not found in the first 200 records")
    if not confirm:
        return {"status": "confirmation_required", "decision": decision, "submission": item}
    result = _request("PATCH", f"/admin/mcp/demos/submissions/{urllib.parse.quote(submission_id, safe='')}/status", {"status": decision})
    if not isinstance(result, dict):
        raise RuntimeError("Unexpected Demo review response")
    return {"status": "reviewed", "submission": _demo_record(result)}


@mcp.tool()
def update_demo(
    source_kind: Literal["internal", "external"],
    parent_id: str,
    demo_id: str,
    demo_name: str,
    demo_url: str,
    cover_url: str = "",
    cast: str = "",
    voice_types: list[Literal["male", "female"]] | None = None,
    voice_actor_ids: list[str] | None = None,
    description: str = "",
    confirm: bool = False,
) -> dict[str, Any]:
    """Edit an existing Demo without changing its source or review status."""
    records = list_demos(limit=200)
    current = next((row for row in records["items"] if row.get("id") == demo_id and row.get("sourceKind") == source_kind and row.get("parentId") == parent_id), None)
    if not current:
        raise ValueError("Demo was not found in the first 200 records")
    payload = {
        "sourceKind": source_kind, "parentId": parent_id,
        "scriptTitle": current.get("scriptTitle", ""), "scriptUrl": current.get("scriptUrl", ""),
        "demoName": demo_name, "demoUrl": demo_url, "coverUrl": cover_url,
        "cast": cast, "voiceTypes": voice_types or [],
        "voiceActorIds": voice_actor_ids if voice_actor_ids is not None else current.get("voiceActorIds", []),
        "description": description, "status": current.get("status", "approved"),
    }
    if not confirm:
        return {"status": "confirmation_required", "current": current, "updated": payload}
    path = "/admin/mcp/demos/" + "/".join(urllib.parse.quote(value, safe="") for value in (source_kind, parent_id, demo_id))
    result = _request("PUT", path, payload)
    if not isinstance(result, dict):
        raise RuntimeError("Unexpected Demo update response")
    return {"status": "updated", "demo": _demo_record(result)}


@mcp.tool()
def submit_demo_for_review(
    source_kind: Literal["internal", "external"],
    parent_id: str,
    demo_url: str,
    demo_name: str = "",
    cover_url: str = "",
    cast: str = "",
    voice_types: list[Literal["male", "female"]] | None = None,
    voice_actor_ids: list[str] | None = None,
    manual_voice_actors: list[dict[str, str]] | None = None,
    description: str = "",
    display_name: str = "",
    confirm_public_rights: bool = False,
    confirm_voice_actor_profiles: bool = False,
    confirm: bool = False,
) -> dict[str, Any]:
    """Submit a Demo to the existing review queue, with explicit rights confirmation."""
    if not voice_actor_ids and not manual_voice_actors:
        raise ValueError("At least one voice actor is required")
    target = next((item for item in list_demo_targets() if item.get("sourceKind") == source_kind and item.get("id") == parent_id), None)
    if not target:
        raise ValueError("Demo target was not found")
    payload = {
        "scriptType": source_kind,
        "scriptId": parent_id if source_kind == "internal" else None,
        "externalScriptId": parent_id if source_kind == "external" else None,
        "demoName": demo_name, "demoUrl": demo_url, "coverUrl": cover_url,
        "cast": cast, "voiceTypes": voice_types or [], "voiceActorIds": voice_actor_ids or [],
        "manualVoiceActors": manual_voice_actors or [], "description": description,
        "displayName": display_name, "confirmPublic": confirm_public_rights,
        "confirmVoiceActorProfiles": confirm_voice_actor_profiles,
    }
    if not confirm:
        return {"status": "confirmation_required", "target": target, "submission": payload}
    if not confirm_public_rights or (manual_voice_actors and not confirm_voice_actor_profiles):
        raise ValueError("Publishing rights and voice actor profile consent must be confirmed")
    result = _request("POST", "/public-demo-submissions", payload)
    if not isinstance(result, dict):
        raise RuntimeError("Unexpected Demo submission response")
    return {"status": "submitted_for_review", "submissionId": result.get("submissionId", "")}


if __name__ == "__main__":
    logger.info("starting local write_project MCP server over stdio")
    mcp.run()
