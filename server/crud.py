from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
import models, schemas
from typing import List, Optional
import time
import uuid
import json

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
def get_public_scripts(db: Session):
    return db.query(models.Script).filter(models.Script.isPublic == 1, models.Script.type == 'script').order_by(models.Script.lastModified.desc()).limit(50).all()

def search_scripts(db: Session, query: str, ownerId: str):
    # Simple LIKE search for now, FTS not explicitly supported in simple ORM without extending
    search = f"%{query}%"
    return db.query(models.Script).filter(
        models.Script.ownerId == ownerId,
        or_(models.Script.title.like(search), models.Script.content.like(search))
    ).limit(20).all()
