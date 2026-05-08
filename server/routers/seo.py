from fastapi import APIRouter, Depends, Response, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
import os
import traceback
import html
from urllib.parse import urlparse
import models
from dependencies import get_db

router = APIRouter()

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # /app in container

def _get_script_description(script) -> str:
    """Extract synopsis/outline from customMetadata; fall back to a content excerpt as last resort."""
    SYNOPSIS_KEYS = {"synopsis", "summary", "摘要", "outline", "大綱"}
    if script.customMetadata and isinstance(script.customMetadata, list):
        meta_map = {
            str(entry.get("key") or "").strip().lower().replace(" ", ""): str(entry.get("value") or "").strip()
            for entry in script.customMetadata
            if isinstance(entry, dict)
        }
        for key in SYNOPSIS_KEYS:
            value = meta_map.get(key, "")
            if value:
                return value[:300]
    # Last resort: first non-empty line of content (not the full body)
    if script.content:
        for line in script.content.splitlines():
            line = line.strip()
            if line:
                return line[:200] + ("..." if len(line) > 200 else "")
    return ""

def _resolve_dist_dir() -> str:
    # Prefer /app/dist (docker compose mount), fallback to ../dist (local repo root)
    candidates = [
        os.path.join(BASE_DIR, "dist"),
        os.path.join(os.path.dirname(BASE_DIR), "dist"),
    ]
    for path in candidates:
        if os.path.exists(path):
            return path
    return candidates[0]

DIST_DIR = _resolve_dist_dir()
INDEX_PATH = os.path.join(DIST_DIR, "index.html")
FRONTEND_DEV_URL = os.getenv("FRONTEND_DEV_URL", "http://localhost:1090").rstrip("/")

@router.get("/read/{script_id}")
def read_script_seo(script_id: str, request: Request, db: Session = Depends(get_db)):
    try:
        # 1. Try to find the script
        script = db.query(models.Script).filter(models.Script.id == script_id).first()
        
        # --- AI Content Negotiation ---
        accept_header = request.headers.get("accept", "")
        user_agent = request.headers.get("user-agent", "").lower()
        
        is_ai_bot = any(bot in user_agent for bot in ["gptbot", "claudebot", "google-extended", "anthropic", "perplexitybot"])
        wants_markdown = "text/markdown" in accept_header or "text/plain" in accept_header
        
        if (is_ai_bot or wants_markdown) and script and script.isPublic == 1:
            return Response(content=script.content, media_type="text/markdown")
            
        # --- Googlebot SSR Injection & Fallback ---
        is_googlebot = "googlebot" in user_agent
        safe_content = html.escape(script.content) if script and script.content else ""
        safe_title = html.escape(script.title or "") if script else ""
        desc_text = _get_script_description(script) if script else ""
        safe_desc = html.escape(desc_text) if desc_text else "線上閱讀、瀏覽與分享 Fountain 劇本的閱讀器。"

        ssr_html = f"""
        <!DOCTYPE html>
        <html lang="zh-TW">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{safe_title}｜Screenplay Reader</title>
            <meta name="description" content="{safe_desc}">
            <meta property="og:title" content="{safe_title}">
            <meta property="og:description" content="{safe_desc}">
        </head>
        <body>
            <div id="root">
                <article style="max-width: 800px; margin: 0 auto; padding: 2rem; font-family: serif; white-space: pre-wrap; line-height: 1.6;">
                    <h1>{safe_title}</h1>
                    <pre style="white-space: pre-wrap; font-family: inherit;">{safe_content}</pre>
                </article>
            </div>
        </body>
        </html>
        """

        # 2. Read template
        if not os.path.exists(INDEX_PATH):
            if is_googlebot and script and script.isPublic == 1:
                return HTMLResponse(content=ssr_html, status_code=200)
            dev_read_url = f"{FRONTEND_DEV_URL}/read/{script_id}"
            current_url = str(request.url)
            current = urlparse(current_url)
            target = urlparse(dev_read_url)
            same_origin = (current.scheme, current.netloc) == (target.scheme, target.netloc)
            same_path = current.path.rstrip("/") == target.path.rstrip("/")
            # Avoid redirect loops when target is effectively the same route.
            if dev_read_url.rstrip("/") == current_url.rstrip("/") or (same_origin and same_path):
                return HTMLResponse(
                    content=(
                        "<!doctype html><html><head><meta charset=\"utf-8\"></head><body>"
                        "<p>Development mode: frontend bundle not found on backend.</p>"
                        "<p>Current /read route is handled by backend SEO fallback.</p>"
                        f"<p>Try opening frontend directly: <a href=\"{FRONTEND_DEV_URL}\">{FRONTEND_DEV_URL}</a></p>"
                        "</body></html>"
                    ),
                    status_code=200,
                )

            return HTMLResponse(
                content=(
                    "<!doctype html><html><head><meta charset=\"utf-8\">"
                    f"<meta http-equiv=\"refresh\" content=\"0;url={dev_read_url}\">"
                    "</head><body>"
                    "<p>Development mode: redirecting to frontend dev server...</p>"
                    f"<p><a href=\"{dev_read_url}\">{dev_read_url}</a></p>"
                    "</body></html>"
                ),
                status_code=200,
            )
            
        with open(INDEX_PATH, "r", encoding="utf-8") as f:
            html_content = f.read()

        # 3. Inject Tags & Content
        if script and script.isPublic:
            title = f"{safe_title}｜Screenplay Reader"
            desc_raw = _get_script_description(script) or "線上閱讀、瀏覽與分享 Fountain 劇本的閱讀器。"
            desc = html.escape(desc_raw).replace("\n", " ")
            
            # Helper to replace meta content
            def replace_meta(html_text, property_name, new_content):
                import re
                pattern = rf'(<meta property="{property_name}" content=")([^"]*)(" />)'
                if re.search(pattern, html_text):
                    return re.sub(pattern, rf'\g<1>{new_content}\g<3>', html_text)
                return html_text
                
            html_content = html_content.replace("<title>Screenplay Reader</title>", f"<title>{title}</title>")
            
            # OG Tags
            html_content = replace_meta(html_content, "og:title", safe_title)
            html_content = replace_meta(html_content, "og:description", desc)
            
            # Standard Description
            html_content = html_content.replace('<meta name="description" content="線上閱讀、瀏覽與分享 Fountain 劇本的閱讀器。" />', f'<meta name="description" content="{desc}" />')

            if is_googlebot and script.content:
                # Inject right after <div id="root"> using the pre-built partial
                partial_html = f"""
                <article style="max-width: 800px; margin: 0 auto; padding: 2rem; font-family: serif; white-space: pre-wrap; line-height: 1.6;">
                    <h1>{safe_title}</h1>
                    <pre style="white-space: pre-wrap; font-family: inherit;">{safe_content}</pre>
                </article>
                """
                html_content = html_content.replace('<div id="root"></div>', f'<div id="root">{partial_html}</div>')

        return HTMLResponse(content=html_content)
    except Exception as e:
        error_msg = f"SEO Injection Error: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        return HTMLResponse(content="<h1>500 Internal Server Error</h1>", status_code=500)
