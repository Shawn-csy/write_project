from pydantic import BaseModel, ConfigDict
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

    model_config = ConfigDict(from_attributes=True)

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
    
    model_config = ConfigDict(from_attributes=True)

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

    model_config = ConfigDict(from_attributes=True)

class MarkerTheme(MarkerThemeBase):
    id: str
    ownerId: str
    owner: Optional[UserPublic] = None
    createdAt: int
    updatedAt: int

    model_config = ConfigDict(from_attributes=True)


# Script Schemas
class ScriptBase(BaseModel):
    title: str
    content: Optional[str] = None
    isPublic: Optional[bool] = False
    parent_folder: Optional[str] = None # Renamed from 'folder' in implementation to avoid confusion, but DB has 'folder'
    type: Optional[str] = "script"
    
class ScriptCreate(BaseModel):
    title: Optional[str] = "Untitled"
class ScriptCreate(ScriptBase):
    title: Optional[str] = "Untitled" # Override title to be optional with default
    folder: Optional[str] = "/" # Corresponds to parent_folder in ScriptBase
    author: Optional[str] = None
    draftDate: Optional[str] = None
    markerThemeId: Optional[str] = None
    
class ScriptUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    author: Optional[str] = None
    draftDate: Optional[str] = None
    isPublic: Optional[bool] = None
    folder: Optional[str] = None
    type: Optional[str] = None
    markerThemeId: Optional[str] = None

class ScriptReorderItem(BaseModel):
    id: str
    sortOrder: float

class ScriptReorderRequest(BaseModel):
    items: List[ScriptReorderItem]

class Script(BaseModel):
    id: str
    ownerId: str
    title: str
    title: str
    content: str
    createdAt: int
    lastModified: int
    author: Optional[str] = None
    draftDate: Optional[str] = None
    isPublic: int
    type: str # 'script' or 'folder'
    folder: str
    sortOrder: float
    markerThemeId: Optional[str] = None
    markerTheme: Optional[MarkerTheme] = None
    tags: List[Tag] = []

    model_config = ConfigDict(from_attributes=True)

class ScriptSummary(BaseModel):
    id: str
    ownerId: str
    title: str
    contentLength: Optional[int] = 0
    # content excluded
    createdAt: int
    lastModified: int
    author: Optional[str] = None
    draftDate: Optional[str] = None
    isPublic: int
    type: str
    folder: str
    sortOrder: float
    markerThemeId: Optional[str] = None
    tags: List[Tag] = []

    model_config = ConfigDict(from_attributes=True)
