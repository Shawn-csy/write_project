from pathlib import Path
import re

import main as main_module
from services.route_contract import (
    WORKSPACE_EXACT_PATHS,
    is_legacy_public_html_path,
    is_workspace_spa_path,
)


REPO_ROOT = Path(__file__).resolve().parents[2]


def _install_spa_template(monkeypatch, tmp_path):
    index_path = tmp_path / "index.html"
    index_path.write_text(
        '<!doctype html><html><head><title>Workspace</title></head>'
        '<body><div id="root"></div></body></html>',
        encoding="utf-8",
    )
    monkeypatch.setattr(main_module, "INDEX_PATH", str(index_path))


def test_route_classifier_accepts_only_real_workspace_routes():
    for route in ("/login", "/dashboard", "/studio", "/admin", "/edit/script-id"):
        assert is_workspace_spa_path(route)

    for route in (
        "/p3",
        "/settings",
        "/dashboard/not-a-route",
        "/edit",
        "/edit/script-id/extra",
        "/openapi.json",
    ):
        assert not is_workspace_spa_path(route)


def test_route_classifier_limits_legacy_public_html_shapes():
    for route in ("", "/about", "/read/id", "/author/id", "/org/id", "/series/name"):
        assert is_legacy_public_html_path(route)

    for route in ("/p3", "/read", "/read/id/extra", "/tag/name", "/auth.md"):
        assert not is_legacy_public_html_path(route)


def test_backend_serves_spa_only_for_workspace_allowlist(client, monkeypatch, tmp_path):
    _install_spa_template(monkeypatch, tmp_path)

    for route in ("/login", "/dashboard", "/studio", "/admin", "/edit/script-id"):
        response = client.get(route)
        assert response.status_code == 200, route
        assert '<div id="root"></div>' in response.text


def test_backend_returns_real_404_for_unknown_paths(client, monkeypatch, tmp_path):
    _install_spa_template(monkeypatch, tmp_path)

    for route in (
        "/p3",
        "/settings",
        "/dashboard/not-a-route",
        "/edit",
        "/auth.md",
    ):
        response = client.get(route)
        assert response.status_code == 404, route
        assert '<div id="root"></div>' not in response.text


def test_backend_returns_gone_for_retired_gallery(client, monkeypatch, tmp_path):
    _install_spa_template(monkeypatch, tmp_path)
    response = client.get("/gallery")
    assert response.status_code == 410


def test_nginx_and_frontend_share_the_workspace_route_contract():
    nginx = (REPO_ROOT / "nginx.conf").read_text(encoding="utf-8")
    workspace_routes = (REPO_ROOT / "src/routes/WorkspaceRoutes.tsx").read_text(encoding="utf-8")

    declared_paths = set(re.findall(r'<Route\s+path="([^"]+)"', workspace_routes))
    frontend_exact_paths = {path.lstrip("/") for path in declared_paths if path not in {"*", "/*", "edit/:id"}}

    assert frontend_exact_paths == WORKSPACE_EXACT_PATHS
    assert "edit/:id" in declared_paths
    assert re.search(r"location\s+~\s+\^/\(login\|dashboard\|studio\|admin\)/\?\$", nginx)
    assert re.search(r"location\s+~\s+\^/edit/\[\^/\]\+/\?\$", nginx)
    assert re.search(r"location\s+/\s*\{\s*return\s+404;", nginx)
    assert not re.search(r"location\s+/\s*\{[^}]*try_files[^}]*index\.html", nginx, re.DOTALL)
