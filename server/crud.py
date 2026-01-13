from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc, orm
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
    return db.query(models.Script).filter(models.Script.ownerId == ownerId).order_by(models.Script.sortOrder.asc(), models.Script.lastModified.desc()).all()

def create_script(db: Session, script: schemas.ScriptCreate, ownerId: str):
    db_script = models.Script(
        id=str(uuid.uuid4()),
        ownerId=ownerId,
        title=script.title or "Untitled",
        content="",
        type=script.type,
        folder=script.folder
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
    db.commit()
    return db_user

# Public & Search
def get_public_scripts(db: Session, ownerId: Optional[str] = None, folder: Optional[str] = None):
    q = db.query(models.Script).filter(models.Script.isPublic == 1)
    
    if ownerId and folder is not None:
         # Browsing a specific public folder
         q = q.filter(models.Script.ownerId == ownerId, models.Script.folder == folder)
         return q.order_by(models.Script.sortOrder.asc(), models.Script.title.asc()).all()
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
         candidates = q.order_by(models.Script.lastModified.desc()).limit(200).all()
         
         results = []
         for s in candidates:
             # If the folder containing this item is ALSO public, we hide this item 
             # (assuming user should enter the folder to see it)
             if (s.ownerId, s.folder) in public_paths:
                 continue
             results.append(s)
             if len(results) >= 50: break
             
         return results

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
    db.query(models.MarkerTheme).filter(models.MarkerTheme.id == theme_id, models.MarkerTheme.ownerId == ownerId).delete()
    db.commit()
