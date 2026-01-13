from pydantic import BaseModel
from typing import List, Optional, Any, Dict

# Tag Schemas
class TagBase(BaseModel):
    name: str
    color: str = "bg-gray-500"

class TagCreate(TagBase):
    pass

class Tag(TagBase):
    id: int
    ownerId: str

    class Config:
        from_attributes = True

# Script Schemas
class ScriptBase(BaseModel):
    title: str
    content: Optional[str] = None
    isPublic: Optional[bool] = False
    parent_folder: Optional[str] = None # Renamed from 'folder' in implementation to avoid confusion, but DB has 'folder'
    type: Optional[str] = "script"
    
class ScriptCreate(BaseModel):
    title: Optional[str] = "Untitled"
    type: Optional[str] = "script"
    folder: Optional[str] = "/"
    markerThemeId: Optional[str] = None

class ScriptUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    isPublic: Optional[bool] = None
    folder: Optional[str] = None
    type: Optional[str] = None
    markerThemeId: Optional[str] = None

class ScriptReorderItem(BaseModel):
    id: str
    sortOrder: float

class Script(BaseModel):
    id: str
    ownerId: str
    title: str
    content: str
    createdAt: int
    lastModified: int
    isPublic: int
    type: str # 'script' or 'folder'
    folder: str
    sortOrder: float
    markerThemeId: Optional[str] = None
    tags: List[Tag] = []

    class Config:
        from_attributes = True

# User Schemas
class UserBase(BaseModel):
    handle: Optional[str] = None
    displayName: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    settings: Optional[dict] = {}

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: str
    settings: Any # JSON parsed
    
    class Config:
        from_attributes = True
    class Config:
        from_attributes = True

# Marker Theme Schemas
class MarkerThemeBase(BaseModel):
    name: str
    configs: str = "[]"
    isPublic: bool = False
    description: Optional[str] = ""

class MarkerThemeCreate(MarkerThemeBase):
    id: Optional[str] = None

class MarkerThemeUpdate(BaseModel):
    name: Optional[str] = None
    configs: Optional[str] = None
    isPublic: Optional[bool] = None
    description: Optional[str] = None

class UserPublic(BaseModel):
    id: str
    handle: Optional[str] = None
    displayName: Optional[str] = "Anonymous"
    avatar: Optional[str] = None

    class Config:
        from_attributes = True

class MarkerTheme(MarkerThemeBase):
    id: str
    ownerId: str
    owner: Optional[UserPublic] = None
    createdAt: int
    updatedAt: int

    class Config:
        from_attributes = True
