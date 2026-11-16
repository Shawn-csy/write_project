"""Public image URL compatibility endpoints."""
import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from dependencies import get_db
from routers.public_bundle import public_external_script_cover
from services import public_media as media

router = APIRouter(prefix='/api/public-media', tags=['public-media'])

@router.get('')
def query_media(token: str = '', w: str | None = None):
    return media.serve(lambda: media.serve_local(media.decode_token(token), media.parse_width(w)))

@router.get('/external/{item_id}')
def external_media(item_id: str, w: str | None = None, db: Session = Depends(get_db)):
    def work():
        from fastapi import HTTPException
        try:
            lookup = public_external_script_cover(media.strip_extension(item_id), db)
        except HTTPException as exc:
            raise media.MediaError(exc.status_code, 'Media not found')
        raw = json.loads(lookup.body)['coverUrl']
        if not raw:
            raise media.MediaError(404, 'Media not found')
        width = media.parse_width(w)
        if raw.startswith('/media/'):
            return media.serve_local(raw, width)
        data, kind = media.remote_bytes(raw, width)
        return media.image_response(data, kind, width, media.REMOTE_CACHE)
    return media.serve(work)

@router.get('/{token}')
def token_media(token: str, w: str | None = None):
    return query_media(token, w)
