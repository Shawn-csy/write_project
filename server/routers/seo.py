from fastapi import APIRouter, Depends, Response, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
import os
import traceback
import html
import models
from dependencies import get_db

router = APIRouter()

# Note: We need a way to reference DIST_DIR/INDEX_PATH which are relative to main.py usually.
# We will check relative to this file.
# server/routers/seo.py -> server/routers/ -> server/ -> dist/
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # server directory
DIST_DIR = os.path.join(os.path.dirname(BASE_DIR), "dist")
INDEX_PATH = os.path.join(DIST_DIR, "index.html")

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
        
        ssr_html = f"""
        <!DOCTYPE html>
        <html lang="zh-TW">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>{safe_title}｜Screenplay Reader</title>
            <meta name="description" content="{html.escape(safe_content[:200] + '...') if safe_content else '線上閱讀、瀏覽與分享 Fountain 劇本的閱讀器。'}">
            <meta property="og:title" content="{safe_title}">
            <meta property="og:description" content="{html.escape(safe_content[:200] + '...') if safe_content else '線上閱讀、瀏覽與分享 Fountain 劇本的閱讀器。'}">
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
            return HTMLResponse(content="<h1>Development Mode: Build frontend to see SEO tags.</h1><script>window.location.reload()</script>", status_code=200)
            
        with open(INDEX_PATH, "r", encoding="utf-8") as f:
            html_content = f.read()

        # 3. Inject Tags & Content
        if script and script.isPublic:
            title = f"{safe_title}｜Screenplay Reader"
            desc_raw = (script.content[:200] + "...") if script.content else "線上閱讀、瀏覽與分享 Fountain 劇本的閱讀器。"
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
        return HTMLResponse(content=f"<h1>500 Internal Server Error</h1><pre>{error_msg}</pre>", status_code=500)
