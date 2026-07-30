from datetime import datetime, timezone
import os
from urllib.parse import urlparse

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

import database
import migration
import models
from dependencies import get_db
from rate_limit import RATE_LIMIT_ENABLED, limiter
from routers import analysis, scripts, users, orgs, personas, tags, themes, admin, public, seo, media, series, studio, health
from routers import public_bundle, export
from services.route_contract import (
    is_legacy_public_html_path,
    is_workspace_spa_path,
    normalize_route_path,
)
from services.seo import inject_seo_for_route

try:
    from slowapi.errors import RateLimitExceeded
    from slowapi.middleware import SlowAPIMiddleware
except Exception:
    RateLimitExceeded = None
    SlowAPIMiddleware = None

def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return str(raw).strip().lower() in {"1", "true", "yes", "on"}


AUTO_CREATE_TABLES = _env_bool("DB_AUTO_CREATE_TABLES", True)
RUN_LEGACY_MIGRATIONS = _env_bool("DB_RUN_LEGACY_MIGRATIONS", True)

# Initialize Database and Run Migrations
if AUTO_CREATE_TABLES:
    models.Base.metadata.create_all(bind=database.engine)
if RUN_LEGACY_MIGRATIONS:
    migration.run_migrations()

SERVER_DIR = os.path.dirname(__file__)
DIST_CANDIDATES = [
    os.path.join(SERVER_DIR, "dist"),      # /app/dist in container
    os.path.join(SERVER_DIR, "..", "dist") # local repo root/dist
]
DIST_DIR = next((p for p in DIST_CANDIDATES if os.path.exists(p)), DIST_CANDIDATES[0])
INDEX_PATH = os.path.join(DIST_DIR, "index.html")
MEDIA_DIR = os.getenv("MEDIA_STORAGE_ROOT", "/data/media")
try:
    os.makedirs(MEDIA_DIR, exist_ok=True)
except (PermissionError, OSError):
    MEDIA_DIR = os.path.join(os.path.dirname(__file__), "data", "media")
    os.makedirs(MEDIA_DIR, exist_ok=True)


def public_base_url() -> str:
    return os.getenv("PUBLIC_BASE_URL", "https://open-scripts.shawnup.com").rstrip("/")


def _cors_allow_origins() -> list[str]:
    return [
        "http://localhost:5173",
        "http://localhost:1090",
        "http://localhost:8080",
        "https://scripts.shawnup.com",
        "https://open-scripts.shawnup.com",
        "https://scripts-api.shawnup.com",
        "https://scripts-666540946249.asia-east1.run.app",
    ]


def _connect_src_values(allow_origins: list[str]) -> str:
    origins = {"'self'"}

    for origin in allow_origins:
        parsed = urlparse(origin)
        if not parsed.scheme or not parsed.netloc:
            continue
        origins.add(f"{parsed.scheme}://{parsed.netloc}")

        # Allow local websocket endpoints used by dev servers/HMR.
        if parsed.scheme == "http" and parsed.hostname == "localhost":
            origins.add(f"ws://{parsed.netloc}")

    return " ".join(sorted(origins))


FIREBASE_CONNECT_ORIGINS = (
    "https://identitytoolkit.googleapis.com "
    "https://securetoken.googleapis.com "
    "https://www.googleapis.com "
    "https://firebasestorage.googleapis.com"
)

def _build_csp_headers(allow_origins: list[str]) -> tuple[str, str]:
    connect_src = _connect_src_values(allow_origins)
    csp_enforced = (
        "default-src 'self'; "
        "base-uri 'self'; "
        "frame-ancestors 'self'; "
        "form-action 'self'; "
        "object-src 'none'; "
        "script-src 'self' https://www.googletagmanager.com; "
        "img-src 'self' data: blob: https:; "
        f"connect-src {connect_src} {FIREBASE_CONNECT_ORIGINS}; "
        "style-src 'self' 'unsafe-inline';"
    )
    csp_report_only = (
        "default-src 'self'; "
        "base-uri 'self'; "
        "frame-ancestors 'self'; "
        "form-action 'self'; "
        "object-src 'none'; "
        "script-src 'self' https://www.googletagmanager.com; "
        "img-src 'self' data: blob: https:; "
        f"connect-src {connect_src} {FIREBASE_CONNECT_ORIGINS}; "
        "style-src 'self';"
    )
    return csp_enforced, csp_report_only


def create_app() -> FastAPI:
    app = FastAPI()
    app.state.limiter = limiter
    allow_origins = _cors_allow_origins()
    csp_enforced, csp_report_only = _build_csp_headers(allow_origins)

    if RATE_LIMIT_ENABLED and SlowAPIMiddleware and RateLimitExceeded:
        app.add_middleware(SlowAPIMiddleware)

        @app.exception_handler(RateLimitExceeded)
        async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
            return Response("Rate limit exceeded", status_code=429)

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("Content-Security-Policy", csp_enforced)
        response.headers.setdefault("Content-Security-Policy-Report-Only", csp_report_only)
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin-allow-popups")
        response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        return response

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(analysis.router)
    app.include_router(scripts.router)
    app.include_router(scripts.export_router)
    app.include_router(scripts.search_router)
    app.include_router(users.router)
    app.include_router(orgs.router)
    app.include_router(personas.router)
    app.include_router(tags.router)
    app.include_router(themes.router)
    app.include_router(admin.router)
    app.include_router(public.router)
    app.include_router(public_bundle.router)
    app.include_router(seo.router)
    app.include_router(media.router)
    app.include_router(series.router)
    app.include_router(studio.router)
    app.include_router(export.router)
    app.include_router(health.router)

    @app.get("/llms.txt", response_class=Response)
    @app.get("/.well-known/llms.txt", response_class=Response)
    async def get_llms_txt():
        base = public_base_url()
        content = f"""# 公開台本｜Screenplay Reader - AI Agent Guide

公開台本｜Screenplay Reader ({base}) is a platform for writers to publish and share screenplays.
AI-friendly endpoints are provided so you can read scripts without parsing React HTML or executing JavaScript.

## Preferred endpoint for raw content

GET /api/public-scripts/{{script_id}}/raw

- Returns text/markdown
- {{script_id}} is the unique identifier found in the public URL: {base}/read/{{script_id}}
- Private or missing scripts return 404

## Preferred endpoint for structured metadata

GET /api/public-scripts/{{script_id}}

- Returns application/json

## Content negotiation (backend direct only)

When hitting this backend directly, GET /read/{{script_id}} with Accept: text/markdown
or a recognized AI bot User-Agent (GPTBot, ClaudeBot, Google-Extended, Anthropic, PerplexityBot) returns raw markdown.
The public site URL ({base}/read/{{script_id}}) routes through the Next.js frontend and returns HTML.
Prefer /api/public-scripts/{{script_id}}/raw for reliable raw content access.

## Discovery

- Sitemap: {base}/sitemap.xml
- Script page: {base}/read/{{script_id}}
- Author page: {base}/author/{{author_id}}
- Organization page: {base}/org/{{org_id}}
- Series page: {base}/series/{{series_name}}
- Tag page: {base}/tag/{{tag_name}}

## Notes

- Use /api/public-scripts/{{script_id}}/raw first; do not rely on parsing rendered HTML.
- Public scripts return 200. Private or missing scripts return 404.
- Unauthorized AI model training on licensed content is not permitted where content terms restrict it.
"""
        return Response(content=content, media_type="text/markdown")

    @app.get("/sitemap.xml", response_class=Response)
    async def get_sitemap_xml(db: database.SessionLocal = Depends(get_db)):
        def ms_to_w3c(ms):
            try:
                return datetime.fromtimestamp(ms / 1000.0, tz=timezone.utc).strftime("%Y-%m-%d")
            except Exception:
                return datetime.now(timezone.utc).strftime("%Y-%m-%d")

        def url_entry(loc, lastmod=None, changefreq=None, priority=None):
            parts = [f"  <url>", f"    <loc>{loc}</loc>"]
            if lastmod:
                parts.append(f"    <lastmod>{lastmod}</lastmod>")
            if changefreq:
                parts.append(f"    <changefreq>{changefreq}</changefreq>")
            if priority:
                parts.append(f"    <priority>{priority}</priority>")
            parts.append("  </url>")
            return "\n".join(parts)

        base_url = public_base_url()
        urls = []

        # Static pages
        urls.append(url_entry(f"{base_url}/", changefreq="weekly", priority="0.8"))
        urls.append(url_entry(f"{base_url}/about", changefreq="monthly", priority="0.5"))

        # Public scripts
        scripts_rows = db.query(
            models.Script.id,
            models.Script.lastModified,
            models.Script.personaId,
            models.Script.ownerId,
            models.Script.organizationId,
        ).filter(
            models.Script.isPublic == 1,
            models.Script.type == "script",
        ).all()

        author_ids: dict[str, int | None] = {}  # id -> updatedAt ms
        org_ids: dict[str, int | None] = {}

        for script_id, last_mod, persona_id, owner_id, organization_id in scripts_rows:
            import html as _html
            loc = _html.escape(f"{base_url}/read/{script_id}")
            urls.append(url_entry(loc, lastmod=ms_to_w3c(last_mod), changefreq="weekly", priority="0.9"))

            if persona_id:
                author_ids.setdefault(persona_id, None)
            elif owner_id:
                author_ids.setdefault(owner_id, None)
            if organization_id:
                org_ids.setdefault(organization_id, None)

        # Fetch lastmod for author pages
        for aid in list(author_ids):
            persona = db.query(models.Persona.updatedAt).filter(models.Persona.id == aid).first()
            if persona:
                author_ids[aid] = persona.updatedAt
            else:
                user = db.query(models.User.lastLogin).filter(models.User.id == aid).first()
                if user:
                    author_ids[aid] = user.lastLogin

        for aid, ts in sorted(author_ids.items()):
            loc = _html.escape(f"{base_url}/author/{aid}")
            urls.append(url_entry(loc, lastmod=ms_to_w3c(ts) if ts else None, changefreq="monthly", priority="0.7"))

        # Fetch lastmod for org pages
        for oid in list(org_ids):
            org = db.query(models.Organization.updatedAt).filter(models.Organization.id == oid).first()
            if org:
                org_ids[oid] = org.updatedAt

        for oid, ts in sorted(org_ids.items()):
            loc = _html.escape(f"{base_url}/org/{oid}")
            urls.append(url_entry(loc, lastmod=ms_to_w3c(ts) if ts else None, changefreq="monthly", priority="0.6"))

        xml = (
            '<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
            '        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n'
            '        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9\n'
            '          http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">\n'
            + "\n".join(urls) + "\n"
            "</urlset>"
        )
        return Response(content=xml, media_type="application/xml")

    if os.path.exists(DIST_DIR):
        app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")
    app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str, request: Request, db: database.SessionLocal = Depends(get_db)):
        normalized_path = normalize_route_path(full_path)

        if normalized_path == "gallery":
            return Response(status_code=410)

        if normalized_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")

        is_workspace_path = is_workspace_spa_path(normalized_path)
        is_public_html_path = is_legacy_public_html_path(normalized_path)
        if not is_workspace_path and not is_public_html_path:
            raise HTTPException(status_code=404, detail="Page not found")

        if normalized_path.startswith("read/"):
            script_id = normalized_path.split("/", 1)[1]
            accept_header = request.headers.get("accept", "")
            user_agent = request.headers.get("user-agent", "").lower()
            is_ai_bot = any(bot in user_agent for bot in ["gptbot", "claudebot", "google-extended", "anthropic", "perplexitybot"])
            # Keep markdown negotiation explicit to avoid browsers/webviews that
            # include text/plain from accidentally receiving raw script text.
            wants_markdown = "text/markdown" in accept_header

            if is_ai_bot or wants_markdown:
                try:
                    script = db.query(models.Script).filter(models.Script.id == script_id).first()
                    if script and script.isPublic == 1:
                        return Response(content=script.content, media_type="text/markdown")
                    return Response(content="Script not found or is private.", status_code=404, media_type="text/markdown")
                except Exception:
                    return Response(content="Internal Server Error", status_code=500, media_type="text/markdown")

        try:
            index_exists = os.path.exists(INDEX_PATH)
        except Exception:
            return Response(content="Internal Server Error", status_code=500)

        if index_exists:
            try:
                with open(INDEX_PATH, "r", encoding="utf-8") as f:
                    html_template = f.read()
            except Exception:
                return Response(content="Internal Server Error", status_code=500)

            user_agent = request.headers.get("user-agent", "").lower()
            seo_html = inject_seo_for_route(normalized_path, db, html_template, public_base_url(), user_agent=user_agent)
            if seo_html is not None:
                return HTMLResponse(content=seo_html)

            if is_workspace_path:
                return HTMLResponse(content=html_template)

            raise HTTPException(status_code=404, detail="Page not found")

        return {"error": "Frontend not built"}

    return app


app = create_app()
