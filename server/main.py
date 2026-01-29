from fastapi import FastAPI, Depends, HTTPException, Header, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from routers import analysis
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas, crud, database
import io
import zipfile
import urllib.parse
import json

models.Base.metadata.create_all(bind=database.engine)

# Migration Helper
def run_migrations():
    from sqlalchemy import text
    try:
        with database.engine.connect() as conn:
            # Check existing columns
            result = conn.execute(text("PRAGMA table_info(scripts)"))
            columns = [row.name for row in result.fetchall()]
            
            if 'type' not in columns:
                print("Migrating: Adding 'type' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN type TEXT DEFAULT 'script'"))
            
            if 'folder' not in columns:
                print("Migrating: Adding 'folder' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN folder TEXT DEFAULT '/'"))
                
            if 'sortOrder' not in columns:
                print("Migrating: Adding 'sortOrder' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN sortOrder REAL DEFAULT 0.0"))

            if 'markerThemeId' not in columns:
                print("Migrating: Adding 'markerThemeId' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN markerThemeId TEXT DEFAULT NULL"))

            if 'author' not in columns:
                print("Migrating: Adding 'author' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN author TEXT DEFAULT ''"))

            if 'draftDate' not in columns:
                print("Migrating: Adding 'draftDate' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN draftDate TEXT DEFAULT ''"))
            
            conn.commit()
    except Exception as e:
        print(f"Migration failed: {e}")

run_migrations()

app = FastAPI()

app.include_router(analysis.router)

app.add_middleware(
    CORSMiddleware,
    # allow_origins=["*"], # Wildcard '*' is invalid with allow_credentials=True
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8080",
        "https://scripts.shawnup.com",
        "https://scripts-api.shawnup.com",
        "https://scripts-666540946249.asia-east1.run.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user_id(x_user_id: Optional[str] = Header(None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing X-User-ID header")
    return x_user_id

@app.get("/api/scripts", response_model=List[schemas.ScriptSummary])
def read_scripts(db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    return crud.get_scripts(db, ownerId=ownerId)

@app.post("/api/scripts", response_model=schemas.Script)
def create_script(script: schemas.ScriptCreate, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    return crud.create_script(db=db, script=script, ownerId=ownerId)

@app.get("/api/scripts/{script_id}", response_model=schemas.Script)
def read_script(script_id: str, x_user_id: str = Header(...), db: Session = Depends(get_db)):
    db_script = crud.get_script(db, script_id=script_id, ownerId=x_user_id)
    if db_script is None:
        raise HTTPException(status_code=404, detail="Script not found")
    return db_script

@app.get("/api/export/all")
def export_all_scripts(x_user_id: str = Header(...), db: Session = Depends(get_db)):
    scripts = crud.get_scripts(db, x_user_id)
    
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "a", zipfile.ZIP_DEFLATED, False) as zip_file:
        for s in scripts:
            if s.type == 'script':
                # Sanitization
                safe_title = "".join(c for c in s.title if c.isalnum() or c in (' ', '-', '_')).strip()
                filename = f"{safe_title}.fountain"
                
                # Folder path
                folder = s.folder.strip('/')
                if folder:
                    safe_folder = "/".join(["".join(c for c in part if c.isalnum() or c in (' ', '-', '_')).strip() for part in folder.split('/')])
                    full_path = f"{safe_folder}/{filename}"
                else:
                    full_path = filename
                
                zip_file.writestr(full_path, s.content or "")
    
    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer, 
        media_type="application/zip", 
        headers={"Content-Disposition": "attachment; filename=scripts_backup.zip"}
    )

@app.put("/api/scripts/reorder")
def reorder_scripts(payload: schemas.ScriptReorderRequest, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    print(f"Reordering {len(payload.items)} items")
    crud.reorder_scripts(db, payload.items, ownerId)
    return {"success": True}

@app.put("/api/scripts/{script_id}")
def update_script(script_id: str, script: schemas.ScriptUpdate, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    updated = crud.update_script(db, script_id, script, ownerId)
    if not updated:
        raise HTTPException(status_code=404, detail="Script not found")
    return {"success": True, "lastModified": updated.lastModified}

@app.delete("/api/scripts/{script_id}")
def delete_script(script_id: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    success = crud.delete_script(db, script_id, ownerId)
    if not success:
         raise HTTPException(status_code=404, detail="Script not found")
    return {"success": True}




# Tags
@app.get("/api/tags", response_model=List[schemas.Tag])
def read_tags(db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    return crud.get_tags(db, ownerId)

@app.post("/api/tags")
def create_tag(tag: schemas.TagCreate, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    return crud.create_tag(db, tag, ownerId)

@app.delete("/api/tags/{tag_id}")
def delete_tag(tag_id: int, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    crud.delete_tag(db, tag_id, ownerId)
    return {"success": True}

@app.post("/api/scripts/{script_id}/tags")
def attach_tag(script_id: str, payload: dict, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    crud.add_tag_to_script(db, script_id, payload.get('tagId'))
    return {"success": True}

@app.delete("/api/scripts/{script_id}/tags/{tag_id}")
def detach_tag(script_id: str, tag_id: int, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    crud.remove_tag_from_script(db, script_id, tag_id)
    return {"success": True}

# User
@app.get("/api/me", response_model=schemas.User)
def read_users_me(db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    user = crud.get_user(db, ownerId)
    if not user:
        return {"id": ownerId, "settings": {}}
    # Parse settings JSON
    try:
        user.settings = json.loads(user.settings) if user.settings else {}
    except ValueError:
        user.settings = {}
    return user

@app.put("/api/me")
def update_user_me(user: schemas.UserCreate, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    try:
        crud.update_user(db, ownerId, user)
    except Exception as e:
        # Check for integrity error (e.g. unique handle)
        print(f"Update failed: {e}")
        if "UNIQUE constraint failed" in str(e): 
             raise HTTPException(status_code=409, detail="Handle already taken")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    return {"success": True}

# Public
@app.get("/api/public-scripts")
def read_public_scripts(ownerId: Optional[str] = None, folder: Optional[str] = None, db: Session = Depends(get_db)):
    return crud.get_public_scripts(db, ownerId=ownerId, folder=folder)

@app.get("/api/public-scripts/{script_id}", response_model=schemas.Script)
def read_public_script(script_id: str, db: Session = Depends(get_db)):
    # Re-use get_script but ignore ownerId checking for fetching, verify isPublic instead is manual
    # But crud.get_script filters by ownerId. So we query manually or add special method.
    script = db.query(models.Script).filter(models.Script.id == script_id, models.Script.isPublic == 1).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    return script

# Search
@app.get("/api/search")
def search(q: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    return crud.search_scripts(db, q, ownerId)

# Marker Themes
@app.get("/api/themes", response_model=List[schemas.MarkerTheme])
def read_themes(db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    return crud.get_user_themes(db, ownerId)

@app.get("/api/themes/public", response_model=List[schemas.MarkerTheme])
def read_public_themes(db: Session = Depends(get_db)):
    return crud.get_public_themes(db)

@app.post("/api/themes")
def create_theme(theme: schemas.MarkerThemeCreate, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    return crud.create_theme(db, theme, ownerId)

@app.put("/api/themes/{theme_id}")
def update_theme(theme_id: str, theme: schemas.MarkerThemeUpdate, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    updated = crud.update_theme(db, theme_id, theme, ownerId)
    if not updated:
        raise HTTPException(status_code=404, detail="Theme not found")
    return updated

@app.delete("/api/themes/{theme_id}")
def delete_theme(theme_id: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    crud.delete_theme(db, theme_id, ownerId)
    return {"success": True}

@app.post("/api/themes/{theme_id}/copy")
def copy_theme(theme_id: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    # 1. Get original theme (ignoring owner check, but checking public status)
    original = db.query(models.MarkerTheme).filter(models.MarkerTheme.id == theme_id).first()
    if not original:
         raise HTTPException(status_code=404, detail="Theme not found")
    
    if not original.isPublic and original.ownerId != ownerId:
         raise HTTPException(status_code=403, detail="Cannot copy private theme")
         
    # 2. Create copy
    new_theme = schemas.MarkerThemeCreate(
        name=f"{original.name} (Copy)",
        configs=original.configs,
        isPublic=False,
        description=original.description
    )
    return crud.create_theme(db, new_theme, ownerId)

# ----------------------------------------------------------------
# SEO & Static File Serving
# ----------------------------------------------------------------
from fastapi.responses import HTMLResponse
import os
import traceback

DIST_DIR = os.path.join(os.path.dirname(__file__), "..", "dist")
INDEX_PATH = os.path.join(DIST_DIR, "index.html")

@app.get("/read/{script_id}", response_class=HTMLResponse)
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
            title = f"{script.title}｜Screenplay Reader"
            desc = (script.content[:200] + "...") if script.content else "線上閱讀、瀏覽與分享 Fountain 劇本的閱讀器。"
            desc = desc.replace('"', '&quot;').replace('\n', ' ')
            
            # Helper to replace meta content
            def replace_meta(html, property_name, new_content):
                import re
                pattern = rf'(<meta property="{property_name}" content=")([^"]*)(" />)'
                # Check if pattern exists first to avoid errors if regex fails
                if re.search(pattern, html):
                    return re.sub(pattern, rf'\g<1>{new_content}\g<3>', html)
                return html
                
            html_content = html_content.replace("<title>Screenplay Reader</title>", f"<title>{title}</title>")
            html_content = replace_meta(html_content, "og:title", script.title)
            html_content = replace_meta(html_content, "og:description", desc)
            html_content = html_content.replace('<meta name="description" content="線上閱讀、瀏覽與分享 Fountain 劇本的閱讀器。" />', f'<meta name="description" content="{desc}" />')

        return HTMLResponse(content=html_content)
    except Exception as e:
        error_msg = f"SEO Injection Error: {str(e)}\n{traceback.format_exc()}"
        print(error_msg)
        return HTMLResponse(content=f"<h1>500 Internal Server Error</h1><pre>{error_msg}</pre>", status_code=500)

    # 3. Inject Tags if script found & public (or just found? Let's show meta for shared links even if private? No, secure it.)
    # If standard user visits /read/ID, the React app handles auth. 
    # But for SEO bot, if it's private, we probably shouldn't show details.
    # However, if user shares a private link, maybe they want the preview? 
    # Let's stick to: If public, show specific meta. If not, show generic.
    
    if script and script.isPublic:
        title = f"{script.title}｜Screenplay Reader"
        desc = (script.content[:200] + "...") if script.content else "線上閱讀、瀏覽與分享 Fountain 劇本的閱讀器。"
        desc = desc.replace('"', '&quot;').replace('\n', ' ')
        
        # Replace Title
        html_content = html_content.replace("<title>Screenplay Reader</title>", f"<title>{title}</title>")
        
        # Replace OG Tags
        html_content = html_content.replace('content="Screenplay Reader"', f'content="{script.title}"') # Naive replacement for OG Title if it matches default
        html_content = html_content.replace('content="線上閱讀、瀏覽與分享 Fountain 劇本的閱讀器。"', f'content="{desc}"')
        
        # Or better, regex replacement or specific token if we prepared index.html
        # Since we didn't prepare tokens, we'll do robust replacement:
        # We know the specific strings from index.html
        
        # Helper to replace meta content
        def replace_meta(html, property_name, new_content):
            import re
            pattern = rf'(<meta property="{property_name}" content=")([^"]*)(" />)'
            return re.sub(pattern, rf'\g<1>{new_content}\g<3>', html)
            
        html_content = replace_meta(html_content, "og:title", script.title)
        html_content = replace_meta(html_content, "og:description", desc)
        # Also standard description
        html_content = html_content.replace('<meta name="description" content="線上閱讀、瀏覽與分享 Fountain 劇本的閱讀器。" />', f'<meta name="description" content="{desc}" />')

    return HTMLResponse(content=html_content)


# Serve Static Files (SPA Fallback)
from fastapi.staticfiles import StaticFiles

if os.path.exists(DIST_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_DIR, "assets")), name="assets")
    
    # Catch-all for React Router (Must be last)
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if os.path.exists(INDEX_PATH):
             return HTMLResponse(content=open(INDEX_PATH, "r", encoding="utf-8").read())
        return {"error": "Frontend not built"}
