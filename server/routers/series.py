from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import crud_ops as crud
import schemas
from dependencies import get_current_user_id, get_db

router = APIRouter(prefix="/api/series", tags=["series"])


@router.get("", response_model=List[schemas.Series])
def list_series(db: Session = Depends(get_db), owner_id: str = Depends(get_current_user_id)):
    return crud.get_series(db, owner_id)


@router.post("", response_model=schemas.Series)
def create_series(payload: schemas.SeriesCreate, db: Session = Depends(get_db), owner_id: str = Depends(get_current_user_id)):
    return crud.create_series(db, payload, owner_id)


@router.put("/{series_id}", response_model=schemas.Series)
def update_series(series_id: str, payload: schemas.SeriesUpdate, db: Session = Depends(get_db), owner_id: str = Depends(get_current_user_id)):
    updated = crud.update_series(db, series_id, payload, owner_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Series not found")
    return updated


@router.delete("/{series_id}")
def delete_series(series_id: str, db: Session = Depends(get_db), owner_id: str = Depends(get_current_user_id)):
    ok = crud.delete_series(db, series_id, owner_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Series not found")
    return {"success": True}


@router.put("/{series_id}/scripts/reorder")
def reorder_series_scripts(
    series_id: str,
    payload: schemas.SeriesReorderRequest,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    ok, error_code = crud.reorder_series_scripts(db, series_id, payload.items, owner_id)
    if not ok:
        if error_code == "series_not_found":
            raise HTTPException(status_code=404, detail="Series not found")
        if error_code == "script_not_in_series":
            raise HTTPException(status_code=404, detail="One or more scripts not found in series")
        raise HTTPException(status_code=422, detail=error_code)
    return {"success": True}
