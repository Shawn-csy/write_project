"""HTTP route ownership contract for the legacy workspace and backend fallback."""

from __future__ import annotations

import re


# These routes are rendered by the authenticated Vite workspace.
WORKSPACE_EXACT_PATHS = frozenset({"login", "dashboard", "studio", "admin"})
_WORKSPACE_EDIT_PATH = re.compile(r"^edit/[^/]+$")

# These public HTML routes are retained only for direct backend compatibility.
# Production browser traffic is owned by the Next.js public app at nginx.
LEGACY_PUBLIC_EXACT_PATHS = frozenset({"", "about"})
_LEGACY_PUBLIC_ENTITY_PATH = re.compile(r"^(read|author|org|series)/[^/]+$")


def normalize_route_path(full_path: str) -> str:
    """Normalize a FastAPI catch-all path without changing its URL semantics."""
    return str(full_path or "").strip("/")


def is_workspace_spa_path(full_path: str) -> bool:
    """Return whether a path is a real client-side workspace route."""
    normalized = normalize_route_path(full_path)
    return normalized in WORKSPACE_EXACT_PATHS or _WORKSPACE_EDIT_PATH.fullmatch(normalized) is not None


def is_legacy_public_html_path(full_path: str) -> bool:
    """Return whether the backend may render legacy public HTML for this path."""
    normalized = normalize_route_path(full_path)
    return (
        normalized in LEGACY_PUBLIC_EXACT_PATHS
        or _LEGACY_PUBLIC_ENTITY_PATH.fullmatch(normalized) is not None
    )
