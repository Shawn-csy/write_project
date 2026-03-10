from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Any, Dict, Union
from typing_extensions import Literal

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
    bannerUrl: Optional[str] = ""
    tags: List[str] = []

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    logoUrl: Optional[str] = None
    bannerUrl: Optional[str] = None
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
    email: Optional[str] = None
    displayName: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    website: Optional[str] = None # Added
    settings: Optional[dict] = {}
    isAdmin: Optional[bool] = False

class UserCreate(UserBase):
    pass

class OrganizationMemberRequest(BaseModel):
    userId: str

class OrganizationInviteRequest(BaseModel):
    userId: Optional[str] = None
    email: Optional[str] = None


class OrganizationMemberRoleUpdate(BaseModel):
    role: Literal["admin", "member"]

class OrganizationRequestCreate(BaseModel):
    orgId: str


class ScriptTransferRequest(BaseModel):
    newOwnerId: str

# Persona Schemas
class PersonaBase(BaseModel):
    displayName: str
    bio: Optional[str] = ""
    avatar: Optional[str] = ""
    bannerUrl: Optional[str] = ""
    website: Optional[str] = ""
    links: List[Dict[str, Any]] = []
    organizationIds: List[str] = []
    tags: List[str] = []
    defaultLicenseCommercial: Optional[str] = ""
    defaultLicenseDerivative: Optional[str] = ""
    defaultLicenseNotify: Optional[str] = ""
    defaultLicenseSpecialTerms: List[str] = []

class PersonaCreate(PersonaBase):
    pass
    
class Persona(PersonaBase):
    id: str
    ownerId: str
    createdAt: int
    updatedAt: int
    organizationRole: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class PersonaPublic(Persona):
    organizations: List[Organization] = []

class OrganizationPublic(Organization):
    members: List[Persona] = []

class User(UserBase):
    id: str
    settings: Any # JSON parsed
    organizationId: Optional[str] = None
    organizationIds: List[str] = []
    organization: Optional[Organization] = None
    personas: List[Persona] = []
    
    model_config = ConfigDict(from_attributes=True)

# Marker Theme Schemas
class MarkerThemeBase(BaseModel):
    name: str
    configs: Union[List[Dict[str, Any]], Dict[str, Any], str] = []
    isPublic: bool = False
    description: Optional[str] = ""

class MarkerThemeCreate(MarkerThemeBase):
    id: Optional[str] = None

class MarkerThemeUpdate(BaseModel):
    name: Optional[str] = None
    configs: Optional[Union[List[Dict[str, Any]], Dict[str, Any], str]] = None
    isPublic: Optional[bool] = None
    description: Optional[str] = None

class UserPublic(BaseModel):
    id: str
    handle: Optional[str] = None
    email: Optional[str] = None # Include email if needed for admin search, or maybe restrict? Assuming visible for search results.
    displayName: Optional[str] = "Anonymous"
    avatar: Optional[str] = None
    website: Optional[str] = None
    organizationRole: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class OrganizationInvite(BaseModel):
    id: str
    orgId: str
    invitedUserId: str
    inviterUserId: str
    status: str
    createdAt: int
    invitedUser: Optional[UserPublic] = None
    inviterUser: Optional[UserPublic] = None

    model_config = ConfigDict(from_attributes=True)

class OrganizationRequest(BaseModel):
    id: str
    orgId: str
    requesterUserId: str
    status: str
    createdAt: int
    requester: Optional[UserPublic] = None

    model_config = ConfigDict(from_attributes=True)

class OrganizationMembersResponse(BaseModel):
    users: List[UserPublic] = []
    personas: List[Persona] = []

class OrganizationInvitesResponse(BaseModel):
    invites: List[OrganizationInvite] = []

class OrganizationRequestsResponse(BaseModel):
    requests: List[OrganizationRequest] = []

class MarkerTheme(MarkerThemeBase):
    id: str
    ownerId: str
    owner: Optional[UserPublic] = None
    createdAt: int
    updatedAt: int

    model_config = ConfigDict(from_attributes=True)

class SeriesBase(BaseModel):
    name: str
    summary: Optional[str] = ""
    coverUrl: Optional[str] = ""

class SeriesCreate(SeriesBase):
    pass

class SeriesUpdate(BaseModel):
    name: Optional[str] = None
    summary: Optional[str] = None
    coverUrl: Optional[str] = None

class Series(SeriesBase):
    id: str
    ownerId: str
    slug: str
    createdAt: int
    updatedAt: int
    scriptCount: Optional[int] = 0

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
    seriesId: Optional[str] = None
    seriesOrder: Optional[int] = None
    licenseCommercial: Optional[str] = None
    licenseDerivative: Optional[str] = None
    licenseNotify: Optional[str] = None
    
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
    disableCopy: Optional[bool] = None
    seriesId: Optional[str] = None
    seriesOrder: Optional[int] = None
    licenseCommercial: Optional[str] = None
    licenseDerivative: Optional[str] = None
    licenseNotify: Optional[str] = None

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
    disableCopy: bool = False
    licenseCommercial: Optional[str] = ""
    licenseDerivative: Optional[str] = ""
    licenseNotify: Optional[str] = ""
    seriesId: Optional[str] = None
    seriesOrder: Optional[int] = None
    series: Optional[Series] = None

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
    disableCopy: bool = False
    licenseCommercial: Optional[str] = ""
    licenseDerivative: Optional[str] = ""
    licenseNotify: Optional[str] = ""
    seriesId: Optional[str] = None
    seriesOrder: Optional[int] = None
    series: Optional[Series] = None

    model_config = ConfigDict(from_attributes=True)


class PublicTermsSection(BaseModel):
    id: str
    title: str
    body: str


class PublicTermsRequiredCheck(BaseModel):
    id: str
    label: str


class PublicTermsConfigResponse(BaseModel):
    termsKey: str = "public_reader_terms"
    version: str
    title: str
    intro: str = ""
    sections: List[PublicTermsSection] = []
    requiredChecks: List[PublicTermsRequiredCheck] = []


class PublicTermsAcceptanceCreate(BaseModel):
    termsVersion: str
    scriptId: Optional[str] = None
    visitorId: Optional[str] = None
    locale: Optional[str] = None
    timezone: Optional[str] = None
    timezoneOffsetMinutes: Optional[int] = None
    userAgent: Optional[str] = None
    platform: Optional[str] = None
    screen: Dict[str, Any] = {}
    viewport: Dict[str, Any] = {}
    pagePath: Optional[str] = None
    referrer: Optional[str] = None
    acceptedChecks: List[str] = []


class PublicTermsAcceptanceResponse(BaseModel):
    success: bool = True
    acceptanceId: str
    acceptedAt: int


class PublicTermsAcceptanceRecord(BaseModel):
    id: str
    termsKey: str
    termsVersion: str
    scriptId: Optional[str] = None
    userId: Optional[str] = None
    visitorId: Optional[str] = None
    acceptedAt: int
    ipAddress: str = ""
    forwardedFor: str = ""
    userAgent: str = ""
    acceptLanguage: str = ""
    referer: str = ""
    origin: str = ""
    host: str = ""
    clientMeta: Dict[str, Any] = {}
    headerSnapshot: Dict[str, Any] = {}

    model_config = ConfigDict(from_attributes=True)


class PublicTermsAcceptanceListResponse(BaseModel):
    total: int
    items: List[PublicTermsAcceptanceRecord] = []


class AdminUserCreate(BaseModel):
    email: Optional[str] = None
    userId: Optional[str] = None


class AdminUserRecord(BaseModel):
    id: str
    userId: Optional[str] = None
    email: Optional[str] = None
    createdBy: Optional[str] = None
    createdAt: int

    model_config = ConfigDict(from_attributes=True)


class HomepageBannerItem(BaseModel):
    id: str = ""
    title: str = ""
    content: str = ""
    link: str = ""
    imageUrl: str = ""


class HomepageBannerSetting(BaseModel):
    title: str = ""
    content: str = ""
    link: str = ""
    imageUrl: str = ""
    items: List[HomepageBannerItem] = []
