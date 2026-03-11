from datetime import datetime, timezone
import os

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles

import database
import migration
import models
from dependencies import get_current_user_id, get_db
from rate_limit import RATE_LIMIT_ENABLED, limiter
from routers import analysis, scripts, users, orgs, personas, tags, themes, admin, public, seo, media, series
from routers import public_bundle
from services.seo import inject_seo_for_route

try:
    from slowapi.errors import RateLimitExceeded
    from slowapi.middleware import SlowAPIMiddleware
except Exception:
    RateLimitExceeded = None
    SlowAPIMiddleware = None

# Initialize Database and Run Migrations
models.Base.metadata.create_all(bind=database.engine)
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


def create_app() -> FastAPI:
    app = FastAPI()
    app.state.limiter = limiter

    if RATE_LIMIT_ENABLED and SlowAPIMiddleware and RateLimitExceeded:
        app.add_middleware(SlowAPIMiddleware)

        @app.exception_handler(RateLimitExceeded)
        async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
            return Response("Rate limit exceeded", status_code=429)

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'self'; "
            "base-uri 'self'; "
            "frame-ancestors 'self'; "
            "object-src 'none'; "
            "script-src 'self' 'unsafe-inline'; "
            "img-src 'self' data: blob: https:; "
            "connect-src 'self' https: http://localhost:5173 http://localhost:1090 ws://localhost:5173 ws://localhost:1090; "
            "style-src 'self' 'unsafe-inline';",
        )
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin-allow-popups")
        response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "no-referrer-when-downgrade")
        return response

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://localhost:1090",
            "http://localhost:8080",
            "https://scripts.shawnup.com",
            "https://open-scripts.shawnup.com",
            "https://scripts-api.shawnup.com",
            "https://scripts-666540946249.asia-east1.run.app",
        ],
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

    @app.get("/api/health/auth")
    async def auth_health_check(user_id: str = Depends(get_current_user_id)):
        return {"ok": True, "uid": user_id}

    @app.get("/llms.txt", response_class=Response)
    @app.get("/.well-known/llms.txt", response_class=Response)
    async def get_llms_txt():
        content = """# Screenplay Reader - AI Agent Documentation

Welcome, AI Agent! This is the documentation for Screenplay Reader, a platform for writers to publish and share screenplays.
We provide dedicated, AI-friendly endpoints so you can read scripts without parsing complex React HTML or executing JavaScript.

## Reading Public Scripts

To retrieve the raw text (Fountain/Markdown format) of any publicly available script, you can use the following API endpoint:

**Endpoint:** `GET /api/public-scripts/{script_id}/raw`

- `{script_id}` is the unique identifier of the script, usually found in the URL like `https://scripts.shawnup.com/read/{script_id}`.
- This endpoint returns `text/markdown`.
- If a script is private, it will return a 404 error.

## Public Discovery Routes

- Script page: `/read/{script_id}`
- Author page: `/author/{author_id}`
- Organization page: `/org/{org_id}`
- Sitemap: `/sitemap.xml`

## Content Negotiation on Web Routes

Alternatively, if you are browsing the standard web URL `https://scripts.shawnup.com/read/{script_id}`, we support content negotiation.
If you send the `Accept: text/markdown` header, or if you identify as an AI bot in your `User-Agent` (e.g., `GPTBot`, `ClaudeBot`), we will automatically bypass the SPA HTML and serve you the raw markdown content directly.
"""
        return Response(content=content, media_type="text/markdown")

    @app.get("/sitemap.xml", response_class=Response)
    async def get_sitemap_xml(db: database.SessionLocal = Depends(get_db)):
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

        base_url = public_base_url()
        xml_content = ['<?xml version="1.0" encoding="UTF-8"?>']
        xml_content.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')

        xml_content.append("  <url>")
        xml_content.append(f"    <loc>{base_url}/</loc>")
        xml_content.append("    <changefreq>daily</changefreq>")
        xml_content.append("  </url>")

        xml_content.append("  <url>")
        xml_content.append(f"    <loc>{base_url}/about</loc>")
        xml_content.append("    <changefreq>monthly</changefreq>")
        xml_content.append("  </url>")

        author_ids = set()
        org_ids = set()
        for script_id, last_mod, persona_id, owner_id, organization_id in scripts_rows:
            try:
                dt = datetime.fromtimestamp(last_mod / 1000.0, tz=timezone.utc)
                lastmod_str = dt.strftime("%Y-%m-%dT%H:%M:%SZ")
            except Exception:
                lastmod_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

            xml_content.append("  <url>")
            xml_content.append(f"    <loc>{base_url}/read/{script_id}</loc>")
            xml_content.append(f"    <lastmod>{lastmod_str}</lastmod>")
            xml_content.append("  </url>")

            if persona_id:
                author_ids.add(persona_id)
            elif owner_id:
                author_ids.add(owner_id)
            if organization_id:
                org_ids.add(organization_id)

        for author_id in sorted(author_ids):
            xml_content.append("  <url>")
            xml_content.append(f"    <loc>{base_url}/author/{author_id}</loc>")
            xml_content.append("    <changefreq>weekly</changefreq>")
            xml_content.append("  </url>")

        for org_id in sorted(org_ids):
            xml_content.append("  <url>")
            xml_content.append(f"    <loc>{base_url}/org/{org_id}</loc>")
            xml_content.append("    <changefreq>weekly</changefreq>")
            xml_content.append("  </url>")

        xml_content.append("</urlset>")
        return Response(content="\n".join(xml_content), media_type="application/xml")

    if os.path.exists(DIST_DIR):
        app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")
    app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str, request: Request, db: database.SessionLocal = Depends(get_db)):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")

        if full_path.startswith("read/"):
            script_id = full_path.strip("/").split("/")[-1]
            accept_header = request.headers.get("accept", "")
            user_agent = request.headers.get("user-agent", "").lower()
            is_ai_bot = any(bot in user_agent for bot in ["gptbot", "claudebot", "google-extended", "anthropic", "perplexitybot"])
            wants_markdown = "text/markdown" in accept_header or "text/plain" in accept_header

            if is_ai_bot or wants_markdown:
                try:
                    script = db.query(models.Script).filter(models.Script.id == script_id).first()
                    if script and script.isPublic == 1:
                        return Response(content=script.content, media_type="text/markdown")
                    return Response(content="Script not found or is private.", status_code=404, media_type="text/markdown")
                except Exception:
                    return Response(content="Internal Server Error", status_code=500, media_type="text/markdown")

        if os.path.exists(INDEX_PATH):
            with open(INDEX_PATH, "r", encoding="utf-8") as f:
                html_template = f.read()

            seo_html = inject_seo_for_route(full_path, db, html_template, public_base_url())
            if seo_html is not None:
                return HTMLResponse(content=seo_html)

            return HTMLResponse(content=html_template)

        return {"error": "Frontend not built"}

    return app


app = create_app()
