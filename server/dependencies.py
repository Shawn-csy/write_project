
from fastapi import Header, HTTPException
from typing import Optional

async def get_current_user_id(x_user_id: Optional[str] = Header(None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing X-User-ID header")
    return x_user_id
