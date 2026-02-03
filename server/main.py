from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any
import shutil
import os
import uuid
import json
import time
from sqlalchemy import orm
from sqlalchemy.orm import Session
import models, schemas, crud, database
from routers import analysis
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

            if 'status' not in columns:
                print("Migrating: Adding 'status' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN status TEXT DEFAULT 'Private'"))
            
            if 'coverUrl' not in columns:
                print("Migrating: Adding 'coverUrl' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN coverUrl TEXT DEFAULT ''"))
            
            if 'views' not in columns:
                print("Migrating: Adding 'views' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN views INTEGER DEFAULT 0"))

            if 'likes' not in columns:
                print("Migrating: Adding 'likes' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN likes INTEGER DEFAULT 0"))

            if 'organizationId' not in columns:
                print("Migrating: Adding 'organizationId' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN organizationId TEXT DEFAULT NULL"))
            
            # Check users columns
            result_users = conn.execute(text("PRAGMA table_info(users)"))
            user_columns = [row.name for row in result_users.fetchall()]

            if 'website' not in user_columns:
                print("Migrating: Adding 'website' column to users")
                conn.execute(text("ALTER TABLE users ADD COLUMN website TEXT DEFAULT ''"))
            
            if 'organizationId' not in user_columns:
                print("Migrating: Adding 'organizationId' column to users")
                conn.execute(text("ALTER TABLE users ADD COLUMN organizationId TEXT DEFAULT NULL"))

            # Personas columns
            result_personas = conn.execute(text("PRAGMA table_info(personas)"))
            persona_columns = [row.name for row in result_personas.fetchall()]

            if 'website' not in persona_columns:
                print("Migrating: Adding 'website' column to personas")
                conn.execute(text("ALTER TABLE personas ADD COLUMN website TEXT DEFAULT ''"))

            if 'organizationIds' not in persona_columns:
                print("Migrating: Adding 'organizationIds' column to personas")
                conn.execute(text("ALTER TABLE personas ADD COLUMN organizationIds TEXT DEFAULT '[]'"))

            if 'tags' not in persona_columns:
                print("Migrating: Adding 'tags' column to personas")
                conn.execute(text("ALTER TABLE personas ADD COLUMN tags TEXT DEFAULT '[]'"))

            # Organizations columns
            result_orgs = conn.execute(text("PRAGMA table_info(organizations)"))
            org_columns = [row.name for row in result_orgs.fetchall()]

            if 'website' not in org_columns:
                print("Migrating: Adding 'website' column to organizations")
                conn.execute(text("ALTER TABLE organizations ADD COLUMN website TEXT DEFAULT ''"))

            if 'logoUrl' not in org_columns:
                print("Migrating: Adding 'logoUrl' column to organizations")
                conn.execute(text("ALTER TABLE organizations ADD COLUMN logoUrl TEXT DEFAULT ''"))

            if 'tags' not in org_columns:
                print("Migrating: Adding 'tags' column to organizations")
                conn.execute(text("ALTER TABLE organizations ADD COLUMN tags TEXT DEFAULT '[]'"))
            
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


# Engagement
@app.post("/api/scripts/{script_id}/view")
def increment_view(script_id: str, db: Session = Depends(get_db)):
    crud.increment_script_view(db, script_id)
    return {"success": True}

@app.post("/api/scripts/{script_id}/like")
def toggle_like(script_id: str, db: Session = Depends(get_db), x_user_id: str = Header(...)):
    liked = crud.toggle_script_like(db, script_id, x_user_id)
    return {"success": True, "liked": liked}

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
        updated_user = crud.update_user(db, ownerId, user)
        # Handle settings parsing for response or just return success
    except Exception as e:
        # Check for integrity error (e.g. unique handle)
        print(f"Update failed: {e}")
        if "UNIQUE constraint failed" in str(e): 
             raise HTTPException(status_code=409, detail="Handle already taken")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    return {"success": True}

# Public
@app.get("/api/public-scripts")
def read_public_scripts(
    ownerId: Optional[str] = None,
    folder: Optional[str] = None,
    personaId: Optional[str] = None,
    organizationId: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return crud.get_public_scripts(
        db,
        ownerId=ownerId,
        folder=folder,
        personaId=personaId,
        organizationId=organizationId
    )

@app.get("/api/public-scripts/{script_id}", response_model=schemas.Script)
def read_public_script(script_id: str, db: Session = Depends(get_db)):
    # Re-use get_script but ignore ownerId checking for fetching, verify isPublic instead is manual
    # But crud.get_script filters by ownerId. So we query manually or add special method.
    script = db.query(models.Script).options(
        orm.joinedload(models.Script.owner),
        orm.joinedload(models.Script.tags),
        orm.joinedload(models.Script.organization),
        orm.joinedload(models.Script.persona)
    ).filter(models.Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    if not script.isPublic:
        # Check inheritance: Is parent folder public?
        if script.folder != "/":
             parts = script.folder.strip("/").split("/")
             folder_title = parts[-1]
             folder_parent = "/" + "/".join(parts[:-1])
             if folder_parent != "/" and not folder_parent.startswith("/"):
                 folder_parent = "/" + folder_parent # Ensure absolute path
                 
             folder_script = db.query(models.Script).filter(
                 models.Script.ownerId == script.ownerId,
                 models.Script.title == folder_title,
                 models.Script.folder == folder_parent,
                 models.Script.type == 'folder',
                 models.Script.isPublic == 1
             ).first()
             
             if not folder_script:
                   raise HTTPException(status_code=404, detail="Script is private")
        else:
             raise HTTPException(status_code=404, detail="Script is private")
         
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
# Organization
# ----------------------------------------------------------------
@app.post("/api/organizations", response_model=schemas.Organization)
def create_organization(org: schemas.OrganizationCreate, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    return crud.create_organization(db, org, ownerId)

@app.get("/api/organizations", response_model=List[schemas.Organization])
def read_organizations(db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    return crud.get_user_organizations(db, ownerId)

@app.put("/api/organizations/{org_id}", response_model=schemas.Organization)
def update_organization(org_id: str, org: schemas.OrganizationUpdate, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    updated = crud.update_organization(db, org_id, org, ownerId)
    if not updated:
         raise HTTPException(status_code=404, detail="Organization not found")
    return updated

@app.post("/api/organizations/{org_id}/transfer")
def transfer_organization(org_id: str, payload: schemas.OrganizationTransferRequest, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    success = crud.transfer_organization(db, org_id, payload.newOwnerId, ownerId, payload.transferScripts)
    if not success:
         raise HTTPException(status_code=400, detail="Transfer failed. Check permissions or validity.")
    return {"success": True}

# ----------------------------------------------------------------
# Admin
# ----------------------------------------------------------------
@app.get("/api/admin/users", response_model=List[schemas.UserPublic])
def search_users(q: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    # In a real app, restrict this to Admin-only. 
    # For now, we allow any logged-in user to search for others to transfer ownership (a common pattern).
    return crud.search_users(db, q)

@app.delete("/api/organizations/{org_id}")
def delete_organization(org_id: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    success = crud.delete_organization(db, org_id, ownerId)
    if not success:
         raise HTTPException(status_code=404, detail="Organization not found or permission denied")
    return {"success": True}

@app.post("/api/organizations/{org_id}/members")
def add_member(org_id: str, payload: schemas.OrganizationMemberRequest, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    success = crud.add_organization_member(db, org_id, payload.userId, ownerId)
    if not success:
         raise HTTPException(status_code=400, detail="Failed to add member")
    return {"success": True}

@app.delete("/api/organizations/{org_id}/members/{user_id}")
def remove_member(org_id: str, user_id: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    success = crud.remove_organization_member(db, org_id, user_id, ownerId)
    if not success:
         raise HTTPException(status_code=400, detail="Failed to remove member")
    return {"success": True}

# ----------------------------------------------------------------
# Script Transfer
# ----------------------------------------------------------------
@app.post("/api/scripts/{script_id}/transfer")
def transfer_script(script_id: str, payload: schemas.ScriptTransferRequest, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    success = crud.transfer_script_ownership(db, script_id, payload.newOwnerId, ownerId)
    if not success:
         raise HTTPException(status_code=404, detail="Script not found or permission denied")
    return {"success": True}

# ----------------------------------------------------------------
# SEO & Static File Serving
# ----------------------------------------------------------------
from fastapi.responses import HTMLResponse
import os
import traceback

DIST_DIR = os.path.join(os.path.dirname(__file__), "..", "dist")
INDEX_PATH = os.path.join(DIST_DIR, "index.html")

# Persona Endpoints
@app.post("/api/personas", response_model=schemas.Persona)
def create_persona(persona: schemas.PersonaCreate, db: Session = Depends(get_db), current_user: str = Depends(get_current_user_id)):
    return crud.create_persona(db, persona, current_user)

@app.get("/api/personas", response_model=List[schemas.Persona])
def get_personas(db: Session = Depends(get_db), current_user: str = Depends(get_current_user_id)):
    return crud.get_user_personas(db, current_user)

@app.put("/api/personas/{persona_id}", response_model=schemas.Persona)
def update_persona(persona_id: str, persona: schemas.PersonaCreate, db: Session = Depends(get_db), current_user: str = Depends(get_current_user_id)):
    updated = crud.update_persona(db, persona_id, persona, current_user)
    if not updated:
        raise HTTPException(status_code=404, detail="Persona not found")
    return updated

@app.delete("/api/personas/{persona_id}")
def delete_persona(persona_id: str, db: Session = Depends(get_db), current_user: str = Depends(get_current_user_id)):
    # Verify ownership
    persona = db.query(models.Persona).filter(models.Persona.id == persona_id).first()
    if not persona:
         raise HTTPException(status_code=404, detail="Persona not found")
    if persona.ownerId != current_user:
         raise HTTPException(status_code=403, detail="Not authorized")
         
    crud.delete_persona(db, persona_id)
    return {"success": True}

@app.get("/api/public-personas/{persona_id}", response_model=schemas.PersonaPublic)
def get_public_persona(persona_id: str, db: Session = Depends(get_db)):
    persona = db.query(models.Persona).filter(models.Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found")
    if isinstance(persona.organizationIds, str):
        try:
            persona.organizationIds = json.loads(persona.organizationIds)
        except Exception:
            persona.organizationIds = []
    if isinstance(persona.tags, str):
        try:
            persona.tags = json.loads(persona.tags)
        except Exception:
            persona.tags = []
    orgs = []
    if persona.organizationIds:
        orgs = db.query(models.Organization).filter(models.Organization.id.in_(persona.organizationIds)).all()
        for o in orgs:
            if isinstance(o.tags, str):
                try:
                    o.tags = json.loads(o.tags)
                except Exception:
                    o.tags = []
    result = schemas.PersonaPublic.model_validate(persona)
    result.organizations = orgs
    return result

@app.get("/api/public-personas", response_model=List[schemas.PersonaPublic])
def list_public_personas(db: Session = Depends(get_db)):
    persona_ids = [
        row[0]
        for row in db.query(models.Script.personaId)
        .filter(models.Script.isPublic == 1, models.Script.personaId.isnot(None))
        .distinct()
        .all()
    ]
    if not persona_ids:
        return []
    personas = db.query(models.Persona).filter(models.Persona.id.in_(persona_ids)).all()
    all_org_ids = set()
    persona_org_map = {}
    for p in personas:
        org_ids = p.organizationIds
        if isinstance(org_ids, str):
            try:
                org_ids = json.loads(org_ids)
            except Exception:
                org_ids = []
        if isinstance(p.tags, str):
            try:
                p.tags = json.loads(p.tags)
            except Exception:
                p.tags = []
        org_ids = org_ids or []
        persona_org_map[p.id] = org_ids
        all_org_ids.update(org_ids)
    org_map = {}
    if all_org_ids:
        orgs = db.query(models.Organization).filter(models.Organization.id.in_(list(all_org_ids))).all()
        for o in orgs:
            if isinstance(o.tags, str):
                try:
                    o.tags = json.loads(o.tags)
                except Exception:
                    o.tags = []
        org_map = {o.id: o for o in orgs}
    results = []
    for p in personas:
        result = schemas.PersonaPublic.model_validate(p)
        result.organizations = [org_map[oid] for oid in persona_org_map.get(p.id, []) if oid in org_map]
        results.append(result)
    return results

@app.get("/api/public-organizations/{org_id}", response_model=schemas.OrganizationPublic)
def get_public_organization(org_id: str, db: Session = Depends(get_db)):
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    if isinstance(org.tags, str):
        try:
            org.tags = json.loads(org.tags)
        except Exception:
            org.tags = []
    all_personas = db.query(models.Persona).all()
    members = []
    for p in all_personas:
        org_ids = p.organizationIds
        if isinstance(org_ids, str):
            try:
                org_ids = json.loads(org_ids)
            except Exception:
                org_ids = []
        if isinstance(p.tags, str):
            try:
                p.tags = json.loads(p.tags)
            except Exception:
                p.tags = []
        if org_ids and org_id in org_ids:
            members.append(p)
    result = schemas.OrganizationPublic.model_validate(org)
    result.members = members
    return result

@app.get("/api/public-organizations", response_model=List[schemas.OrganizationPublic])
def list_public_organizations(db: Session = Depends(get_db)):
    org_ids = [
        row[0]
        for row in db.query(models.Script.organizationId)
        .filter(models.Script.isPublic == 1, models.Script.organizationId.isnot(None))
        .distinct()
        .all()
    ]
    if not org_ids:
        return []
    orgs = db.query(models.Organization).filter(models.Organization.id.in_(org_ids)).all()
    results = []
    for org in orgs:
        if isinstance(org.tags, str):
            try:
                org.tags = json.loads(org.tags)
            except Exception:
                org.tags = []
        result = schemas.OrganizationPublic.model_validate(org)
        result.members = []
        results.append(result)
    return results

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
