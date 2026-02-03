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

# Organization Schemas
class OrganizationBase(BaseModel):
    name: str
    description: Optional[str] = ""
    website: Optional[str] = ""
    logoUrl: Optional[str] = ""
    tags: List[str] = []

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    logoUrl: Optional[str] = None
    tags: Optional[List[str]] = None

class OrganizationTransferRequest(BaseModel):
    newOwnerId: str
    transferScripts: bool = True
    
class Organization(OrganizationBase):
    id: str
    ownerId: str
    createdAt: int
    updatedAt: int

    model_config = ConfigDict(from_attributes=True)

# User Schemas
class UserBase(BaseModel):
    handle: Optional[str] = None
    displayName: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    website: Optional[str] = None # Added
    settings: Optional[dict] = {}

class UserCreate(UserBase):
    pass

class OrganizationMemberRequest(BaseModel):
    userId: str

class ScriptTransferRequest(BaseModel):
    newOwnerId: str

# Persona Schemas
class PersonaBase(BaseModel):
    displayName: str
    bio: Optional[str] = ""
    avatar: Optional[str] = ""
    website: Optional[str] = ""
    organizationIds: List[str] = []
    tags: List[str] = []

class PersonaCreate(PersonaBase):
    pass
    
class Persona(PersonaBase):
    id: str
    ownerId: str
    createdAt: int
    updatedAt: int
    
    model_config = ConfigDict(from_attributes=True)

class PersonaPublic(Persona):
    organizations: List[Organization] = []

class OrganizationPublic(Organization):
    members: List[Persona] = []

class User(UserBase):
    id: str
    settings: Any # JSON parsed
    organizationId: Optional[str] = None
    organization: Optional[Organization] = None
    personas: List[Persona] = []
    
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
    website: Optional[str] = None

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
    status: Optional[str] = "Private" # Added
    parent_folder: Optional[str] = None # Renamed from 'folder' in implementation to avoid confusion, but DB has 'folder'
    type: Optional[str] = "script"
    
class ScriptCreate(ScriptBase):
    title: Optional[str] = "Untitled" # Override title to be optional with default
    folder: Optional[str] = "/" # Corresponds to parent_folder in ScriptBase
    author: Optional[str] = None
    draftDate: Optional[str] = None
    markerThemeId: Optional[str] = None
    coverUrl: Optional[str] = None # Added
    
class ScriptUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    author: Optional[str] = None
    draftDate: Optional[str] = None
    isPublic: Optional[bool] = None # Deprecated in favor of status? Keep for compat
    status: Optional[str] = None
    folder: Optional[str] = None
    type: Optional[str] = None
    markerThemeId: Optional[str] = None
    coverUrl: Optional[str] = None
    organizationId: Optional[str] = None
    personaId: Optional[str] = None

class ScriptReorderItem(BaseModel):
    id: str
    sortOrder: float

class ScriptReorderRequest(BaseModel):
    items: List[ScriptReorderItem]

class Script(BaseModel):
    id: str
    ownerId: str
    title: str
    content: str
    createdAt: int
    lastModified: int
    author: Optional[str] = None
    draftDate: Optional[str] = None
    isPublic: int
    status: Optional[str] = "Private"
    coverUrl: Optional[str] = None
    views: int = 0
    likes: int = 0
    type: str # 'script' or 'folder'
    folder: str
    sortOrder: float
    markerThemeId: Optional[str] = None
    markerTheme: Optional[MarkerTheme] = None
    tags: List[Tag] = []
    organizationId: Optional[str] = None
    organization: Optional[Organization] = None
    personaId: Optional[str] = None
    persona: Optional[Persona] = None
    owner: Optional[UserPublic] = None

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
    status: Optional[str] = "Private"
    coverUrl: Optional[str] = None
    views: int = 0
    likes: int = 0
    type: str
    folder: str
    sortOrder: float
    markerThemeId: Optional[str] = None
    tags: List[Tag] = []

    model_config = ConfigDict(from_attributes=True)
