from typing import List
import json
import time
import uuid

from sqlalchemy.orm import Session

import models


def touch_parent_folders(db: Session, folder_path: str, ownerId: str, timestamp: int):
    if not folder_path or folder_path == "/":
        return
    path = folder_path
    while path != "/":
        parts = path.split("/")
        if len(parts) < 2:
            break
        title = parts[-1]
        parent = "/" + "/".join(parts[1:-1])

        db.query(models.Script).filter(
            models.Script.ownerId == ownerId,
            models.Script.type == "folder",
            models.Script.title == title,
            models.Script.folder == parent,
        ).update({"lastModified": timestamp})

        path = parent


def ensure_folder_tree(db: Session, ownerId: str, folder_path: str):
    if not folder_path or folder_path == "/":
        return
    parts = [p for p in folder_path.strip("/").split("/") if p]
    parent = "/"
    now = int(time.time() * 1000)
    for part in parts:
        existing = db.query(models.Script).filter(
            models.Script.ownerId == ownerId,
            models.Script.type == "folder",
            models.Script.title == part,
            models.Script.folder == parent,
        ).first()
        if not existing:
            db.add(
                models.Script(
                    id=str(uuid.uuid4()),
                    ownerId=ownerId,
                    title=part,
                    type="folder",
                    folder=parent,
                    createdAt=now,
                    lastModified=now,
                )
            )
        parent = f"{parent.rstrip('/')}/{part}" if parent != "/" else f"/{part}"


def ensure_folders_for_owner(db: Session, ownerId: str, folder_paths: List[str]):
    for path in {p for p in folder_paths if p and p != "/"}:
        ensure_folder_tree(db, ownerId, path)


def _ensure_list(val):
    if isinstance(val, list):
        return val
    if isinstance(val, str):
        try:
            parsed = json.loads(val)
            if isinstance(parsed, str):
                try:
                    parsed = json.loads(parsed)
                except Exception:
                    pass
            if isinstance(parsed, list):
                return parsed
        except Exception:
            pass
    return []


__all__ = [
    "touch_parent_folders",
    "ensure_folder_tree",
    "ensure_folders_for_owner",
    "_ensure_list",
]
