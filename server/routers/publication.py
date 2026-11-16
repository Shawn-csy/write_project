from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from dependencies import get_db, get_current_user_id, is_admin_user
from services.publication_status import publication_status

router = APIRouter(prefix='/api/admin', tags=['admin'])


@router.get('/publication-status')
def get_publication_status(response: Response, user_id: str = Depends(get_current_user_id), db: Session = Depends(get_db)):
    if not is_admin_user(db, user_id):
        raise HTTPException(status_code=403, detail='Not authorized')
    response.headers['Cache-Control'] = 'no-store'
    return publication_status()
