from fastapi import APIRouter, Depends, Response
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

@router.get("/read/{script_id}", response_class=HTMLResponse)
def read_script_seo(script_id: str, db: Session = Depends(get_db)):
    try:
        # 1. Try to find the script
        script = db.query(models.Script).filter(models.Script.id == script_id).first()
        
        # 2. Read template
        if not os.path.exists(INDEX_PATH):
            return HTMLResponse(content="<h1>Development Mode: Build frontend to see SEO tags.</h1><script>window.location.reload()</script>", status_code=200)
            
        with open(INDEX_PATH, "r", encoding="utf-8") as f:
            html_content = f.read()

        # 3. Inject Tags
        if script and script.isPublic:
            safe_title = html.escape(script.title or "")
            title = f"{safe_title}｜Screenplay Reader"
            desc_raw = (script.content[:200] + "...") if script.content else "線上閱讀、瀏覽與分享 Fountain 劇本的閱讀器。"
            desc = html.escape(desc_raw).replace("\n", " ")
            
            # Helper to replace meta content
            def replace_meta(html, property_name, new_content):
                import re
                pattern = rf'(<meta property="{property_name}" content=")([^"]*)(" />)'
                # Check if pattern exists first to avoid errors if regex fails
                if re.search(pattern, html):
                    return re.sub(pattern, rf'\g<1>{new_content}\g<3>', html)
                return html
                
            html_content = html_content.replace("<title>Screenplay Reader</title>", f"<title>{title}</title>")
            
            # OG Tags
            html_content = replace_meta(html_content, "og:title", safe_title)
            html_content = replace_meta(html_content, "og:description", desc)
            
            # Standard Description
            html_content = html_content.replace('<meta name="description" content="線上閱讀、瀏覽與分享 Fountain 劇本的閱讀器。" />', f'<meta name="description" content="{desc}" />')

        return HTMLResponse(content=html_content)
    except Exception as e:
        error_msg = f"SEO Injection Error: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        return HTMLResponse(content=f"<h1>500 Internal Server Error</h1><pre>{error_msg}</pre>", status_code=500)
