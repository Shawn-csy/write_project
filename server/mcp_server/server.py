"""Local stdio MCP server for importing external public scripts.

This process intentionally exposes no HTTP listener. The MCP host launches it as
a child process, and the server calls only the narrowly scoped external-script
admin API using the local MCP key loaded by the launcher.
"""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Literal

from mcp.server import MCPServer


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("write-project-local-mcp")

mcp = MCPServer("write-project-external-script-import")


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
        "organizationUrl": data.get("organizationUrl", ""),
        "organizationAvatarUrl": data.get("organizationAvatarUrl", ""),
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
    organization_url: str = "",
    organization_avatar_url: str = "",
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
        "organizationUrl": organization_url,
        "organizationAvatarUrl": organization_avatar_url,
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
            "coverUrl": item.get("coverUrl", ""),
            "mountedAt": item.get("mountedAt", 0),
        }
        for item in result
        if isinstance(item, dict)
    ]


if __name__ == "__main__":
    logger.info("starting local write_project MCP server over stdio")
    mcp.run()
