from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, orm, func
import models, schemas
from typing import List, Optional
import time
import uuid
import json


def touch_parent_folders(db: Session, folder_path: str, ownerId: str, timestamp: int):
    if not folder_path or folder_path == "/": return
    path = folder_path
    while path != "/":
        parts = path.split('/') # /A/B -> ['', 'A', 'B']
        if len(parts) < 2: break 
        title = parts[-1]
        # Parent Folder Path: /A
        parent = "/" + "/".join(parts[1:-1])
        
        db.query(models.Script).filter(
             models.Script.ownerId == ownerId,
             models.Script.type == 'folder',
             models.Script.title == title,
             models.Script.folder == parent
        ).update({"lastModified": timestamp})
        
        path = parent

def get_scripts(db: Session, ownerId: str):
    # Fetch Script AND calculated content length (characters)
    # OPTIMIZATION: Defer loading 'content' to avoid memory spike on large scripts list
    results = db.query(models.Script, func.length(models.Script.content).label('contentLength'))\
        .options(orm.defer(models.Script.content))\
        .filter(models.Script.ownerId == ownerId)\
        .order_by(models.Script.sortOrder.asc(), models.Script.lastModified.desc())\
        .all()
    
    out = []
    for script, length in results:
        # Attach dynamic property for Pydantic to read
        script.contentLength = length or 0 
        out.append(script)
    return out

def create_script(db: Session, script: schemas.ScriptCreate, ownerId: str):
    db_script = models.Script(
        id=str(uuid.uuid4()),
        ownerId=ownerId,
        title=script.title or "Untitled",
        content=script.content or "",
        type=script.type,
        folder=script.folder,
        author=script.author or "",
        draftDate=script.draftDate or "",
        isPublic=1 if script.isPublic else 0,
        markerThemeId=script.markerThemeId  # Ensure this is set too
    )
    # Calc sort order
    max_order = db.query(models.Script).filter(models.Script.ownerId == ownerId, models.Script.folder == script.folder).order_by(models.Script.sortOrder.desc()).first()
    if max_order:
        db_script.sortOrder = max_order.sortOrder + 1000.0
    else:
        db_script.sortOrder = 0.0

    db.add(db_script)
    db.commit()
    db.refresh(db_script)
    
    # Touch parents
    touch_parent_folders(db, db_script.folder, ownerId, int(time.time() * 1000))
    db.commit()
    
    return db_script

def get_script(db: Session, script_id: str, ownerId: str):
    return db.query(models.Script).filter(models.Script.id == script_id, models.Script.ownerId == ownerId).first()

def update_script(db: Session, script_id: str, script: schemas.ScriptUpdate, ownerId: str):
    db_script = get_script(db, script_id, ownerId)
    if not db_script:
        return None
    
    # Handle folder rename cascading
    if script.title and db_script.type == 'folder' and db_script.title != script.title:
        old_path_prefix = f"{db_script.folder}/{db_script.title}" if db_script.folder != "/" else f"/{db_script.title}"
        new_path_prefix = f"{db_script.folder}/{script.title}" if db_script.folder != "/" else f"/{script.title}"
        
        # Find children
        children = db.query(models.Script).filter(models.Script.ownerId == ownerId, models.Script.folder.like(f"{old_path_prefix}%")).all()
        for child in children:
            child.folder = new_path_prefix + child.folder[len(old_path_prefix):]

    update_data = script.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key == 'isPublic':
             setattr(db_script, key, 1 if value else 0)
        else:
             setattr(db_script, key, value)
    
    db_script.lastModified = int(time.time() * 1000)
    touch_parent_folders(db, db_script.folder, ownerId, db_script.lastModified)
    db.commit()
    return db_script

def delete_script(db: Session, script_id: str, ownerId: str):
    db_script = get_script(db, script_id, ownerId)
    if not db_script:
        return False
    
    if db_script.type == 'folder':
        folder_path = f"{db_script.folder}/{db_script.title}" if db_script.folder != "/" else f"/{db_script.title}"
        db.query(models.Script).filter(models.Script.ownerId == ownerId, models.Script.folder.like(f"{folder_path}%")).delete(synchronize_session=False)

    db.delete(db_script)
    db.commit()
    return True

def reorder_scripts(db: Session, updates: List[schemas.ScriptReorderItem], ownerId: str):
    # Process in batch transaction
    try:
        for item in updates:
            db.query(models.Script).filter(models.Script.id == item.id, models.Script.ownerId == ownerId).update({"sortOrder": item.sortOrder})
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Reorder failed: {e}")
        return False



# Engagement
def increment_script_view(db: Session, script_id: str):
    db.query(models.Script).filter(models.Script.id == script_id).update({models.Script.views: models.Script.views + 1})
    db.commit()

def toggle_script_like(db: Session, script_id: str, user_id: str):
    existing = db.query(models.ScriptLike).filter(models.ScriptLike.scriptId == script_id, models.ScriptLike.userId == user_id).first()
    
    if existing:
        # Unlike
        db.delete(existing)
        # Check for concurrency, but for sqlite simple update is fine
        db.query(models.Script).filter(models.Script.id == script_id).update({models.Script.likes: models.Script.likes - 1})
        db.commit()
        return False
    else:
        # Like
        like = models.ScriptLike(scriptId=script_id, userId=user_id)
        db.add(like)
        db.query(models.Script).filter(models.Script.id == script_id).update({models.Script.likes: models.Script.likes + 1})
        db.commit()
        return True

# Tags
def get_tags(db: Session, ownerId: str):
    return db.query(models.Tag).filter(models.Tag.ownerId == ownerId).all()

def create_tag(db: Session, tag: schemas.TagCreate, ownerId: str):
    db_tag = models.Tag(ownerId=ownerId, name=tag.name, color=tag.color)
    db.add(db_tag)
    try:
        db.commit()
        db.refresh(db_tag)
        return db_tag
    except:
        db.rollback()
        return None

def delete_tag(db: Session, tag_id: int, ownerId: str):
    db.query(models.Tag).filter(models.Tag.id == tag_id, models.Tag.ownerId == ownerId).delete()
    db.commit()

def add_tag_to_script(db: Session, script_id: str, tag_id: int):
    link = models.ScriptTag(scriptId=script_id, tagId=tag_id)
    db.add(link)
    try:
        db.commit()
    except:
        db.rollback()

def remove_tag_from_script(db: Session, script_id: str, tag_id: int):
    db.query(models.ScriptTag).filter(models.ScriptTag.scriptId == script_id, models.ScriptTag.tagId == tag_id).delete()
    db.commit()

# User
def get_user(db: Session, user_id: str):
    return db.query(models.User).filter(models.User.id == user_id).first()

def update_user(db: Session, user_id: str, user_update: schemas.UserCreate):
    db_user = get_user(db, user_id)
    if not db_user:
        db_user = models.User(id=user_id)
        db.add(db_user)
    
    update_data = user_update.model_dump(exclude_unset=True)
    if 'settings' in update_data:
        db_user.settings = json.dumps(update_data.pop('settings'))
    
    for key, value in update_data.items():
        setattr(db_user, key, value)
    
    db_user.lastLogin = int(time.time() * 1000)
    try:
        db.commit()
    except Exception as e:
        print(f"Error updating user: {e}")
        db.rollback()
        # Re-raise so main.py can handle specifics like 409 Conflict if needed, 
        # or return None to signal failure.
        # Given existing pattern, we might want to return None, but main.py expects success.
        # Let's raise a ValueError or similar that main calls can catch.
        raise e
    return db_user

# Public & Search
def get_public_scripts(
    db: Session,
    ownerId: Optional[str] = None,
    folder: Optional[str] = None,
    personaId: Optional[str] = None,
    organizationId: Optional[str] = None
):
    # Base query for explicitly public items
    # Eager load related data
    base_q = db.query(models.Script).options(
        orm.joinedload(models.Script.owner),
        orm.joinedload(models.Script.tags),
        orm.joinedload(models.Script.organization),
        orm.joinedload(models.Script.persona)
    ).filter(models.Script.isPublic == 1)

    if personaId:
        base_q = base_q.filter(models.Script.personaId == personaId)
    if organizationId:
        base_q = base_q.filter(models.Script.organizationId == organizationId)
    
    if ownerId and folder is not None:
         # Check if the folder itself implies public access
         # 1. Find the folder script
         # folder param ex: "/MyFolder". Split to title="MyFolder", parent="/"
         
         is_inherited_public = False
         if folder != "/":
             parts = folder.strip("/").split("/")
             folder_title = parts[-1]
             folder_parent = "/" + "/".join(parts[:-1])
             if folder_parent != "/" and not folder_parent.startswith("/"):
                 folder_parent = "/" + folder_parent # Ensure absolute path
             
             # Find the folder node
             folder_script = db.query(models.Script).filter(
                 models.Script.ownerId == ownerId,
                 models.Script.title == folder_title,
                 models.Script.folder == folder_parent,
                 models.Script.type == 'folder',
                 models.Script.isPublic == 1
             ).first()
             
             if folder_script:
                 is_inherited_public = True
         
         if is_inherited_public:
             # Return ALL scripts in this folder, regardless of their own isPublic status
             inherited_q = db.query(models.Script).options(
                 orm.joinedload(models.Script.owner),
                 orm.joinedload(models.Script.tags),
                 orm.joinedload(models.Script.organization),
                 orm.joinedload(models.Script.persona)
             ).filter(
                 models.Script.ownerId == ownerId, 
                 models.Script.folder == folder
             )
             if personaId:
                 inherited_q = inherited_q.filter(models.Script.personaId == personaId)
             if organizationId:
                 inherited_q = inherited_q.filter(models.Script.organizationId == organizationId)
             return inherited_q.order_by(models.Script.sortOrder.asc(), models.Script.title.asc()).all()
         else:
             # Standard behavior: only return explicitly public children
             return base_q.filter(
                 models.Script.ownerId == ownerId, 
                 models.Script.folder == folder
             ).order_by(models.Script.sortOrder.asc(), models.Script.title.asc()).all()
    else:
         # Public Feed (Recent)
         # Filter out items that are inside a Public Folder (to prevent clutter)
         
         # 1. Get all public folders to identify "Public Contents"
         pub_folders = db.query(models.Script).filter(models.Script.isPublic == 1, models.Script.type == 'folder').all()
         public_paths = set()
         for f in pub_folders:
             path = (f.folder if f.folder != '/' else '') + '/' + f.title
             public_paths.add((f.ownerId, path))
             
         # 2. Fetch candidates (over-fetch to allow filtering)
         candidates = base_q.order_by(models.Script.lastModified.desc()).limit(200).all()
         
         results = []
         for s in candidates:
             # If the folder containing this item is ALSO public, we hide this item 
             # (assuming user should enter the folder to see it)
             if (s.ownerId, s.folder) in public_paths:
                 continue
             results.append(s)
             if len(results) >= 50: break
             
         return results

def search_scripts(db: Session, query: str, ownerId: str):
    search = f"%{query}%"
    return db.query(models.Script).filter(
        models.Script.ownerId == ownerId,
        or_(models.Script.title.like(search), models.Script.content.like(search))
    ).limit(20).all()

# Marker Themes
def get_user_themes(db: Session, ownerId: str):
    return db.query(models.MarkerTheme).filter(models.MarkerTheme.ownerId == ownerId).all()


def get_public_themes(db: Session):
    return db.query(models.MarkerTheme).options(orm.joinedload(models.MarkerTheme.owner)).filter(models.MarkerTheme.isPublic == True).order_by(models.MarkerTheme.updatedAt.desc()).limit(100).all()

def create_theme(db: Session, theme: schemas.MarkerThemeCreate, ownerId: str):
    db_theme = models.MarkerTheme(
        id=theme.id if theme.id else str(uuid.uuid4()),
        ownerId=ownerId,
        name=theme.name,
        configs=theme.configs,
        isPublic=theme.isPublic,
        description=theme.description
    )
    db.add(db_theme)
    db.commit()
    db.refresh(db_theme)
    return db_theme

def update_theme(db: Session, theme_id: str, theme: schemas.MarkerThemeUpdate, ownerId: str):
    db_theme = db.query(models.MarkerTheme).filter(models.MarkerTheme.id == theme_id, models.MarkerTheme.ownerId == ownerId).first()
    if not db_theme:
        return None
    
    update_data = theme.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_theme, key, value)
    
    db_theme.updatedAt = int(time.time() * 1000)
    db.commit()
    db.refresh(db_theme)
    return db_theme

def delete_theme(db: Session, theme_id: str, ownerId: str):
    # 1. Clean up references in scripts
    db.query(models.Script).filter(models.Script.ownerId == ownerId, models.Script.markerThemeId == theme_id).update({models.Script.markerThemeId: None})
    
    # 2. Delete the theme
    db.query(models.MarkerTheme).filter(models.MarkerTheme.id == theme_id, models.MarkerTheme.ownerId == ownerId).delete()
    db.commit()


# ----------------------------------------------------------------
# Organization Management
# ----------------------------------------------------------------
def create_organization(db: Session, org: schemas.OrganizationCreate, ownerId: str):
    db_org = models.Organization(
        id=str(uuid.uuid4()),
        name=org.name,
        description=org.description,
        website=org.website or "",
        logoUrl=org.logoUrl or "",
        tags=org.tags or [],
        ownerId=ownerId,
        createdAt=int(time.time() * 1000),
        updatedAt=int(time.time() * 1000)
    )
    db.add(db_org)
    db.commit()
    db.refresh(db_org)
    return db_org

def get_user_organizations(db: Session, ownerId: str):
    orgs = db.query(models.Organization).filter(models.Organization.ownerId == ownerId).all()
    for o in orgs:
        if isinstance(o.tags, str):
            try:
                o.tags = json.loads(o.tags)
            except Exception:
                o.tags = []
    return orgs

def update_organization(db: Session, org_id: str, org_update: schemas.OrganizationUpdate, ownerId: str):
    db_org = db.query(models.Organization).filter(models.Organization.id == org_id, models.Organization.ownerId == ownerId).first()
    if not db_org:
        return None

    update_data = org_update.model_dump(exclude_unset=True)
    if "tags" in update_data and update_data["tags"] is None:
        update_data["tags"] = []
    for key, value in update_data.items():
        setattr(db_org, key, value)
    
    db_org.updatedAt = int(time.time() * 1000)
    db.commit()
    db.refresh(db_org)
    return db_org

def transfer_organization(db: Session, org_id: str, new_owner_id: str, current_owner_id: str, transfer_scripts: bool = True):
    db_org = db.query(models.Organization).filter(models.Organization.id == org_id, models.Organization.ownerId == current_owner_id).first()
    if not db_org:
        return False
    
    new_owner = db.query(models.User).filter(models.User.id == new_owner_id).first()
    if not new_owner:
        return False

    try:
        db_org.ownerId = new_owner_id
        db_org.updatedAt = int(time.time() * 1000)
        
        if transfer_scripts:
            db.query(models.Script).filter(models.Script.organizationId == org_id).update({models.Script.ownerId: new_owner_id})
        
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Transfer failed: {e}")
        return False

# ----------------------------------------------------------------
# Admin / User Search
# ----------------------------------------------------------------
def search_users(db: Session, query: str):
    search = f"%{query}%"
    return db.query(models.User).filter(
        or_(
            models.User.handle.like(search),
            models.User.displayName.like(search),
            models.User.id == query 
        )
    ).limit(10).all()


# ----------------------------------------------------------------
# Script Transfer (Single Item)
# ----------------------------------------------------------------
def transfer_script_ownership(db: Session, script_id: str, new_owner_id: str, current_owner_id: str):
    db_script = db.query(models.Script).filter(models.Script.id == script_id, models.Script.ownerId == current_owner_id).first()
    if not db_script:
        return False
        
    db_script.ownerId = new_owner_id
    db_script.lastModified = int(time.time() * 1000)
    db.commit()
    return True

# ----------------------------------------------------------------
# Organization Members (Deferred in Model, but Logic Here)
# ----------------------------------------------------------------
# Since we mapped `User.organizationId` (One-to-Many), a user can only be in one Org?
# Based on current schema: models.User.organizationId is a single ForeignKey.
# So "Adding member" means setting their organizationId.
def add_organization_member(db: Session, org_id: str, user_id: str, ownerId: str):
    # Verify requestor is owner of org
    org = db.query(models.Organization).filter(models.Organization.id == org_id, models.Organization.ownerId == ownerId).first()
    if not org:
        return False
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        return False
        
    user.organizationId = org_id
    db.commit()
    return True

def remove_organization_member(db: Session, org_id: str, user_id: str, ownerId: str):
    # Verify requestor is owner of org OR user themselves leaving?
    # For now, owner removing member.
    org = db.query(models.Organization).filter(models.Organization.id == org_id, models.Organization.ownerId == ownerId).first()
    if not org:
        return False
        
    user = db.query(models.User).filter(models.User.id == user_id, models.User.organizationId == org_id).first()
    if not user:
        return False
        
    user.organizationId = None
    db.commit()
    return True

# Persona Operations
def create_persona(db: Session, persona: schemas.PersonaCreate, ownerId: str):
    db_persona = models.Persona(
        id=str(uuid.uuid4()),
        ownerId=ownerId,
        displayName=persona.displayName,
        bio=persona.bio,
        avatar=persona.avatar,
        website=persona.website or "",
        organizationIds=persona.organizationIds or [],
        tags=persona.tags or []
    )
    db.add(db_persona)
    db.commit()
    db.refresh(db_persona)
    return db_persona

def update_persona(db: Session, persona_id: str, persona: schemas.PersonaCreate, ownerId: str):
    db_persona = db.query(models.Persona).filter(models.Persona.id == persona_id, models.Persona.ownerId == ownerId).first()
    if not db_persona:
        return None
    update_data = persona.model_dump(exclude_unset=True)
    if "tags" in update_data and update_data["tags"] is None:
        update_data["tags"] = []
    for key, value in update_data.items():
        setattr(db_persona, key, value)
    db_persona.updatedAt = int(time.time() * 1000)
    db.commit()
    db.refresh(db_persona)
    return db_persona

def get_user_personas(db: Session, ownerId: str):
    personas = db.query(models.Persona).filter(models.Persona.ownerId == ownerId).all()
    for p in personas:
        if isinstance(p.organizationIds, str):
            try:
                p.organizationIds = json.loads(p.organizationIds)
            except Exception:
                p.organizationIds = []
        if isinstance(p.tags, str):
            try:
                p.tags = json.loads(p.tags)
            except Exception:
                p.tags = []
    return personas

def delete_persona(db: Session, persona_id: str):
    persona = db.query(models.Persona).filter(models.Persona.id == persona_id).first()
    if persona:
        # Unlink scripts using this persona
        db.query(models.Script).filter(models.Script.personaId == persona_id).update({models.Script.personaId: None})
        db.delete(persona)
        db.commit()
        return True
    return False
    
    # 2. Unlink members
    db.query(models.User).filter(models.User.organizationId == org_id).update({models.User.organizationId: None})
    
    # 3. Delete Org
    result = db.query(models.Organization).filter(models.Organization.id == org_id, models.Organization.ownerId == ownerId).delete()
    db.commit()
    return result > 0
