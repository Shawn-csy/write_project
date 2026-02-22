from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import os
import re
import json
import html
import database
import models
import migration
from routers import analysis, scripts, users, orgs, personas, tags, themes, admin, public, seo
from routers import public_bundle
from dependencies import get_current_user_id, get_db
from rate_limit import limiter, RATE_LIMIT_ENABLED
try:
    from slowapi.errors import RateLimitExceeded
    from slowapi.middleware import SlowAPIMiddleware
except Exception:
    RateLimitExceeded = None
    SlowAPIMiddleware = None

# Initialize Database and Run Migrations
models.Base.metadata.create_all(bind=database.engine)
migration.run_migrations()

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
    # Loose CSP to avoid blocking current frontend behavior
    response.headers.setdefault(
        "Content-Security-Policy",
        "default-src * 'self' data: blob: 'unsafe-inline' 'unsafe-eval'; "
        "img-src * data: blob:; "
        "connect-src *; "
        "style-src * 'unsafe-inline'; "
        "frame-ancestors 'self';",
    )
    # Allow auth popup to close itself (Firebase)
    response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin-allow-popups")
    response.headers.setdefault("X-Frame-Options", "SAMEORIGIN")
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Referrer-Policy", "no-referrer-when-downgrade")
    return response

# Middleware
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["*"], # Wildcard '*' is invalid with allow_credentials=True
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:1090",
        "http://localhost:8080",
        "https://scripts.shawnup.com",
        "https://open-scripts.shawnup.com",
        "https://scripts-api.shawnup.com",
        "https://scripts-666540946249.asia-east1.run.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
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

# Simple auth check endpoint for debugging
@app.get("/api/health/auth")
async def auth_health_check(user_id: str = Depends(get_current_user_id)):
    return {"ok": True, "uid": user_id}

# Special AI Endpoint: llms.txt
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

# SEO Endpoint: Sitemap
@app.get("/sitemap.xml", response_class=Response)
async def get_sitemap_xml(db: database.SessionLocal = Depends(get_db)):
    import models
    from datetime import datetime, timezone
    
    # Get all public scripts
    # Simplified query: assuming script.isPublic == 1 means it's accessible.
    # We could do the complex folder check here too if needed, but for sitemap, 
    # usually explicit public is enough to list.
    scripts = db.query(
        models.Script.id,
        models.Script.lastModified,
        models.Script.personaId,
        models.Script.ownerId,
        models.Script.organizationId,
    ).filter(
        models.Script.isPublic == 1,
        models.Script.type == 'script'
    ).all()
    
    # Keep sitemap host configurable for deployment domains.
    BASE_URL = os.getenv("PUBLIC_BASE_URL", "https://open-scripts.shawnup.com").rstrip("/")
    
    xml_content = ['<?xml version="1.0" encoding="UTF-8"?>']
    xml_content.append('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
    
    # Add gallery (root)
    xml_content.append('  <url>')
    xml_content.append(f'    <loc>{BASE_URL}/</loc>')
    xml_content.append('    <changefreq>daily</changefreq>')
    xml_content.append('  </url>')
    
    author_ids = set()
    org_ids = set()

    for script_id, last_mod, persona_id, owner_id, organization_id in scripts:
        # Convert ms timestamp to ISO 8601 string
        try:
            dt = datetime.fromtimestamp(last_mod / 1000.0, tz=timezone.utc)
            lastmod_str = dt.strftime('%Y-%m-%dT%H:%M:%SZ')
        except:
             lastmod_str = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
             
        xml_content.append('  <url>')
        xml_content.append(f'    <loc>{BASE_URL}/read/{script_id}</loc>')
        xml_content.append(f'    <lastmod>{lastmod_str}</lastmod>')
        xml_content.append('  </url>')

        if persona_id:
            author_ids.add(persona_id)
        elif owner_id:
            author_ids.add(owner_id)
        if organization_id:
            org_ids.add(organization_id)

    for author_id in sorted(author_ids):
        xml_content.append('  <url>')
        xml_content.append(f'    <loc>{BASE_URL}/author/{author_id}</loc>')
        xml_content.append('    <changefreq>weekly</changefreq>')
        xml_content.append('  </url>')

    for org_id in sorted(org_ids):
        xml_content.append('  <url>')
        xml_content.append(f'    <loc>{BASE_URL}/org/{org_id}</loc>')
        xml_content.append('    <changefreq>weekly</changefreq>')
        xml_content.append('  </url>')
        
    xml_content.append('</urlset>')
    
    return Response(content="\n".join(xml_content), media_type="application/xml")

# Static File Serving (SPA Fallback)
DIST_DIR = os.path.join(os.path.dirname(__file__), "..", "dist")
INDEX_PATH = os.path.join(DIST_DIR, "index.html")

def _public_base_url() -> str:
    return os.getenv("PUBLIC_BASE_URL", "https://open-scripts.shawnup.com").rstrip("/")

def _meta_escape(text) -> str:
    return html.escape(str(text or ""), quote=True)

def _upsert_meta(html_text: str, *, name: str = None, prop: str = None, content: str = "") -> str:
    if not name and not prop:
        return html_text
    attr = "name" if name else "property"
    value = name if name else prop
    escaped_content = _meta_escape(content)
    new_tag = f'<meta {attr}="{value}" content="{escaped_content}" />'
    pattern = rf'<meta\s+{attr}="{re.escape(value)}"\s+content="[^"]*"\s*/?>'
    if re.search(pattern, html_text, flags=re.IGNORECASE):
        return re.sub(pattern, new_tag, html_text, count=1, flags=re.IGNORECASE)
    return html_text.replace("</head>", f"  {new_tag}\n</head>")

def _upsert_canonical(html_text: str, canonical_url: str) -> str:
    escaped_url = _meta_escape(canonical_url)
    new_tag = f'<link rel="canonical" href="{escaped_url}" />'
    pattern = r'<link\s+rel="canonical"\s+href="[^"]*"\s*/?>'
    if re.search(pattern, html_text, flags=re.IGNORECASE):
        return re.sub(pattern, new_tag, html_text, count=1, flags=re.IGNORECASE)
    return html_text.replace("</head>", f"  {new_tag}\n</head>")

def _inject_structured_data(html_text: str, payload: dict) -> str:
    if not payload:
        return html_text
    script_tag = f'<script type="application/ld+json">{json.dumps(payload, ensure_ascii=False)}</script>'
    return html_text.replace("</head>", f"  {script_tag}\n</head>")

def _inject_seo_html(
    html_text: str,
    *,
    title: str,
    description: str,
    canonical_url: str,
    og_type: str = "website",
    image_url: str = "",
    structured_data: dict = None,
) -> str:
    safe_title = _meta_escape(title)
    safe_desc = _meta_escape(description)

    if re.search(r"<title>.*?</title>", html_text, flags=re.IGNORECASE | re.DOTALL):
        html_text = re.sub(
            r"<title>.*?</title>",
            f"<title>{safe_title}</title>",
            html_text,
            count=1,
            flags=re.IGNORECASE | re.DOTALL,
        )
    else:
        html_text = html_text.replace("</head>", f"<title>{safe_title}</title>\n</head>")

    html_text = _upsert_meta(html_text, name="description", content=description)
    html_text = _upsert_meta(
        html_text,
        name="robots",
        content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1",
    )
    html_text = _upsert_meta(html_text, prop="og:title", content=title)
    html_text = _upsert_meta(html_text, prop="og:description", content=description)
    html_text = _upsert_meta(html_text, prop="og:type", content=og_type)
    html_text = _upsert_meta(html_text, prop="og:url", content=canonical_url)
    html_text = _upsert_meta(html_text, prop="og:site_name", content="Screenplay Reader")
    html_text = _upsert_meta(html_text, prop="og:locale", content="zh_TW")
    html_text = _upsert_meta(
        html_text,
        name="twitter:card",
        content="summary_large_image" if image_url else "summary",
    )
    html_text = _upsert_meta(html_text, name="twitter:title", content=title)
    html_text = _upsert_meta(html_text, name="twitter:description", content=description)
    if image_url:
        html_text = _upsert_meta(html_text, prop="og:image", content=image_url)
        html_text = _upsert_meta(html_text, name="twitter:image", content=image_url)

    html_text = _upsert_canonical(html_text, canonical_url)
    html_text = _inject_structured_data(html_text, structured_data or {})
    return html_text

def _ensure_list(value):
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return parsed
        except Exception:
            return [value]
    return []

if os.path.exists(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")
    
    # Catch-all for React Router (Must be last)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str, request: Request, db: database.SessionLocal = Depends(get_db)):
        # Check if path starts with /api/ to avoid serving HTML for missing API routes
        # This helps debugging 404s
        if full_path.startswith("api/"):
            return {"error": "API endpoint not found (404)"}
            
        # AI Content Negotiation for /read/{id}
        if full_path.startswith("read/"):
            script_id = full_path.strip("/").split("/")[-1]
            accept_header = request.headers.get("accept", "")
            user_agent = request.headers.get("user-agent", "").lower()
            
            is_ai_bot = any(bot in user_agent for bot in ["gptbot", "claudebot", "google-extended", "anthropic", "perplexitybot"])
            wants_markdown = "text/markdown" in accept_header or "text/plain" in accept_header
            
            if is_ai_bot or wants_markdown:
                import crud # Local import to avoid circular dep if any
                try:
                    # Leverage the existing get_public_script logic which checks visibility
                    # We can't easily reuse the router function directly here without duplicating auth/visibility logic, 
                    # but since crud.py might not have get_public_script with folder check, we will query DB directly
                    # simplified for now: just check if it's public.
                    import models
                    script = db.query(models.Script).filter(models.Script.id == script_id).first()
                    if script and script.isPublic == 1:
                        return Response(content=script.content, media_type="text/markdown")
                    else:
                        return Response(content="Script not found or is private.", status_code=404, media_type="text/markdown")
                except Exception as e:
                    pass # Fallback to SPA if database query fails

        if os.path.exists(INDEX_PATH):
             html_template = open(INDEX_PATH, "r", encoding="utf-8").read()

             # SEO injection for reader pages
             if full_path.startswith("read/"):
                 script_id = full_path.strip("/").split("/")[-1]
                 script = db.query(models.Script).filter(models.Script.id == script_id).first()
                 if script and script.isPublic == 1:
                     canonical_url = f"{_public_base_url()}/read/{script_id}"
                     title = f"{script.title or 'Untitled'}｜Screenplay Reader"
                     desc = ((script.content or "").strip().replace("\n", " ")[:200] or "公開劇本閱讀頁")
                     image_url = script.coverUrl or ""
                     structured = {
                         "@context": "https://schema.org",
                         "@type": "CreativeWork",
                         "name": script.title or "Untitled",
                         "headline": script.title or "Untitled",
                         "url": canonical_url,
                         "inLanguage": "zh-Hant",
                         "description": desc,
                         "isAccessibleForFree": True,
                     }
                     if image_url:
                         structured["image"] = image_url
                     return HTMLResponse(
                         content=_inject_seo_html(
                             html_template,
                             title=title,
                             description=desc,
                             canonical_url=canonical_url,
                             og_type="article",
                             image_url=image_url,
                             structured_data=structured,
                         )
                     )

             # SEO injection for author pages
             if full_path.startswith("author/"):
                 author_id = full_path.strip("/").split("/")[-1]
                 persona = db.query(models.Persona).filter(models.Persona.id == author_id).first()
                 user = db.query(models.User).filter(models.User.id == author_id).first() if not persona else None
                 if persona or user:
                     display_name = (persona.displayName if persona else user.displayName) or "作者"
                     bio = (persona.bio if persona else user.bio) or f"{display_name} 的公開作品與個人資訊"
                     avatar = (persona.avatar if persona else user.avatar) or ""
                     banner = (persona.bannerUrl if persona else "") or ""
                     website = (persona.website if persona else user.website) or ""
                     links = _ensure_list(persona.links) if persona else []
                     same_as = [website] if website else []
                     same_as.extend([x.get("url") for x in links if isinstance(x, dict) and x.get("url")])
                     canonical_url = f"{_public_base_url()}/author/{author_id}"
                     page_title = f"{display_name}｜Screenplay Reader"
                     page_desc = str(bio).strip()[:200]
                     image_url = avatar or banner
                     structured = {
                         "@context": "https://schema.org",
                         "@type": "Person",
                         "name": display_name,
                         "url": canonical_url,
                         "description": page_desc,
                     }
                     if image_url:
                         structured["image"] = image_url
                     if same_as:
                         structured["sameAs"] = same_as
                     return HTMLResponse(
                         content=_inject_seo_html(
                             html_template,
                             title=page_title,
                             description=page_desc,
                             canonical_url=canonical_url,
                             og_type="profile",
                             image_url=image_url,
                             structured_data=structured,
                         )
                     )

             # SEO injection for organization pages
             if full_path.startswith("org/"):
                 org_id = full_path.strip("/").split("/")[-1]
                 org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
                 if org:
                     canonical_url = f"{_public_base_url()}/org/{org_id}"
                     page_title = f"{(org.name or '組織')}｜Screenplay Reader"
                     page_desc = str(org.description or f"{org.name or '組織'} 的公開作品與成員資訊").strip()[:200]
                     image_url = org.logoUrl or org.bannerUrl or ""
                     structured = {
                         "@context": "https://schema.org",
                         "@type": "Organization",
                         "name": org.name or "Organization",
                         "url": canonical_url,
                         "description": page_desc,
                     }
                     if org.logoUrl:
                         structured["logo"] = org.logoUrl
                     if image_url:
                         structured["image"] = image_url
                     if org.website:
                         structured["sameAs"] = [org.website]
                     return HTMLResponse(
                         content=_inject_seo_html(
                             html_template,
                             title=page_title,
                             description=page_desc,
                             canonical_url=canonical_url,
                             og_type="website",
                             image_url=image_url,
                             structured_data=structured,
                         )
                     )

             return HTMLResponse(content=html_template)
        return {"error": "Frontend not built"}
