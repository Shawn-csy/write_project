from fastapi import APIRouter, Depends, Header, HTTPException, Response
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse
import io
import zipfile
import crud
import schemas
import models
from dependencies import get_db, get_current_user_id

router = APIRouter(prefix="/api/scripts", tags=["scripts"])

@router.get("", response_model=List[schemas.ScriptSummary])
def read_scripts(db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    return crud.get_scripts(db, ownerId=ownerId)

@router.post("", response_model=schemas.Script)
def create_script(script: schemas.ScriptCreate, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    return crud.create_script(db=db, script=script, ownerId=ownerId)

@router.put("/reorder")
def reorder_scripts(payload: schemas.ScriptReorderRequest, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    print(f"Reordering {len(payload.items)} items")
    crud.reorder_scripts(db, payload.items, ownerId)
    return {"success": True}

@router.get("/{script_id}", response_model=schemas.Script)
def read_script(script_id: str, x_user_id: str = Header(...), db: Session = Depends(get_db)):
    db_script = crud.get_script(db, script_id=script_id, ownerId=x_user_id)
    if db_script is None:
        raise HTTPException(status_code=404, detail="Script not found")
    return db_script

@router.put("/{script_id}")
def update_script(script_id: str, script: schemas.ScriptUpdate, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    updated = crud.update_script(db, script_id, script, ownerId)
    if not updated:
        raise HTTPException(status_code=404, detail="Script not found")
    return {"success": True, "lastModified": updated.lastModified}

@router.delete("/{script_id}")
def delete_script(script_id: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    success = crud.delete_script(db, script_id, ownerId)
    if not success:
         raise HTTPException(status_code=404, detail="Script not found")
    return {"success": True}

@router.post("/{script_id}/transfer")
def transfer_script(script_id: str, payload: schemas.ScriptTransferRequest, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    success = crud.transfer_script_ownership(db, script_id, payload.newOwnerId, ownerId)
    if not success:
         raise HTTPException(status_code=404, detail="Script not found or permission denied")
    return {"success": True}

# Engagement
@router.post("/{script_id}/view")
def increment_view(script_id: str, db: Session = Depends(get_db)):
    crud.increment_script_view(db, script_id)
    return {"success": True}

@router.post("/{script_id}/like")
def toggle_like(script_id: str, db: Session = Depends(get_db), x_user_id: str = Header(...)):
    liked = crud.toggle_script_like(db, script_id, x_user_id)
    return {"success": True, "liked": liked}

# Export (Note: Endpoint path is /api/export/all, handled here or in a separate router? 
# It's related to scripts but the path doesn't start with /api/scripts. 
# I'll create a separate router instance in the same file or just keep it here and use a different prefix or include separately.
# Or better: mount it under specific path in main. For now, I'll add it here with exact path.)

# Note: Router prefix is /api/scripts, so I cannot put /api/export/all easily inside this router unless I override path.
# I'll make a separate router for export or just use absolute path.
export_router = APIRouter(tags=["export"])

@export_router.get("/api/export/all")
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

search_router = APIRouter(tags=["search"])

@search_router.get("/api/search")
def search(q: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    return crud.search_scripts(db, q, ownerId)
