
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
import crud
from analysis import ScriptAnalyzer
from dependencies import get_current_user_id
import logging
from rate_limit import limiter

router = APIRouter(prefix="/api/analysis", tags=["analysis"])
logger = logging.getLogger(__name__)


# Wait, I should stick to standard router usage.
# The user wants /api/scripts/{id}/analyze or /api/analysis/{id}?
# Task says /api/scripts/{id}/analyze. 
# But usually analysis is a separate domain.
# Let's use /api/scripts/{script_id}/stats to match RESTful style or /api/analysis/{script_id}.
# Implementation Plan said: /api/scripts/{id}/stats (or similar).
# Let's go with /api/scripts/{script_id}/stats in the scripts router? 
# Or keep it separate. 
# Let's check `routers/scripts.py` if it exists, or create `routers/analysis.py` and use `/api/scripts/{script_id}/stats` path if I can import script crud.

# Actually, I'll put it in `routers/analysis.py` but the path can be `/api/scripts/{script_id}/stats` if I want, 
# BUT `routers/scripts.py` likely owns `/api/scripts` prefix.
# So I should probably add it to `routers/scripts.py` OR make a new router with specific prefix.
# Let's use `/api/analysis/script/{script_id}` to be clean and separate.

@router.get("/script/{script_id}")
@limiter.limit("30/minute")
def analyze_script(
    request: Request,
    script_id: str,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    script = crud.get_script(db, script_id=script_id, ownerId=ownerId)
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    # Parse Marker Configs
    marker_configs = []
    if script.markerTheme and script.markerTheme.configs:
        import json
        try:
            marker_configs = json.loads(script.markerTheme.configs)
        except:
            pass
            
    # Analyze
    analyzer = ScriptAnalyzer(script.content, marker_configs=marker_configs)
    stats = analyzer.analyze()
    
    return stats
