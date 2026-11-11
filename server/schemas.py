import json
from pydantic import BaseModel, ConfigDict, Field, field_validator
from typing import Annotated, List, Literal, Optional, Any, Dict, Union

# Tag Schemas
class TagBase(BaseModel):
    name: str
    color: str = "bg-gray-500"

class TagCreate(TagBase):
    pass

class TagAttach(BaseModel):
    tagId: int

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
    logoCrop: Optional[Dict[str, float]] = None
    bannerUrl: Optional[str] = ""
    bannerCrop: Optional[Dict[str, float]] = None
    tags: List[str] = []

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    logoUrl: Optional[str] = None
    logoCrop: Optional[Dict[str, float]] = None
    bannerUrl: Optional[str] = None
    bannerCrop: Optional[Dict[str, float]] = None
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
    avatarCrop: Optional[Dict[str, float]] = None
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
    avatarCrop: Optional[Dict[str, float]] = None
    bannerUrl: Optional[str] = ""
    bannerCrop: Optional[Dict[str, float]] = None
    website: Optional[str] = ""
    links: List[Dict[str, Any]] = []
    organizationIds: List[str] = []
    voiceActorWorks: List[Dict[str, Any]] = []
    voiceActorOrganizations: List[Dict[str, Any]] = []
    voiceActorContributors: List[Dict[str, Any]] = []
    tags: List[str] = []
    voiceActorHidden: bool = False
    defaultLicenseCommercial: Optional[str] = ""
    defaultLicenseDerivative: Optional[str] = ""
    defaultLicenseNotify: Optional[str] = ""
    defaultLicenseSpecialTerms: List[str] = []

class PersonaCreate(PersonaBase):
    pass
    
class Persona(PersonaBase):
    id: str
    ownerId: Optional[str] = None
    createdAt: int
    updatedAt: int
    organizationRole: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class PersonaPublic(Persona):
    organizations: List[Organization] = []
    roles: List[Literal["scriptwriter", "voice_actor", "post_production", "cover_art", "recording_studio"]] = []
    productionCredits: List[Dict[str, Any]] = []
    profileContributors: List[Dict[str, Any]] = []
    profileSources: List[str] = []
    roleProfiles: Dict[str, Any] = {}
    voiceActorCollaborationEnabled: bool = True
    voiceActorClaimed: bool = False


class AdminVoiceActorRecord(Persona):
    voiceActorHidden: bool = False
    ownerName: str = ""
    sourceTypes: List[str] = []
    demoCount: int = 0
    internalDemoCount: int = 0
    externalDemoCount: int = 0
    scriptCount: int = 0


class AdminVoiceActorUpdate(BaseModel):
    displayName: str
    bio: str = ""
    avatar: str = ""
    website: str = ""
    links: List[Dict[str, Any]] = []
    voiceActorHidden: bool = False


class AdminVoiceActorCreate(BaseModel):
    displayName: str

    @field_validator("displayName", mode="before")
    @classmethod
    def clean_voice_actor_display_name(cls, value: Any) -> str:
        name = str(value or "").strip()
        if not name or len(name) > 120:
            raise ValueError("聲演名稱需為 1 至 120 個字")
        return name


class VoiceActorProfileSubmissionCreate(BaseModel):
    personaId: str
    profileKind: Optional[Literal["voice_actor", "author", "production"]] = None
    displayName: str
    submitterName: str
    contactEmail: str
    contributorName: str = ""
    bio: str = ""
    avatar: str = ""
    website: str = ""
    links: List[Dict[str, Any]] = []
    organizations: List[Dict[str, Any]] = []
    works: List[Dict[str, Any]] = []
    websiteTrap: str = ""


class VoiceActorProfileSubmissionStatusUpdate(BaseModel):
    status: Literal["approved", "rejected"]
    reviewNote: str = ""
    acceptedFields: List[Literal["displayName", "bio", "avatar", "website", "links", "organizations", "works", "contributorName"]] = []


class VoiceActorProfileSubmissionRecord(BaseModel):
    id: str
    personaId: str
    profileKind: Literal["voice_actor", "author", "production"] = "voice_actor"
    personaName: str = ""
    submitterName: str = ""
    contactEmail: str = ""
    contributorName: str = ""
    collaborators: List[Dict[str, Any]] = []
    currentProfile: Dict[str, Any] = {}
    profile: Dict[str, Any] = {}
    acceptedFields: List[str] = []
    status: Literal["pending", "approved", "rejected"]
    reviewNote: str = ""
    reviewedAt: Optional[int] = None
    createdAt: int


class VoiceActorProfileSubmissionListResponse(BaseModel):
    total: int
    items: List[VoiceActorProfileSubmissionRecord]


class VoiceActorProfileSubmissionResponse(BaseModel):
    success: bool
    submissionId: str
    createdAt: int


class ProductionResourceProfileSubmissionCreate(BaseModel):
    resourceId: str
    displayName: str
    bio: str = ""
    avatarUrl: str = ""
    profileUrl: str = ""
    profileLabel: str = ""
    links: List[Dict[str, Any]] = []
    works: List[Dict[str, Any]] = []
    contributorName: str
    submitterName: str
    contactEmail: str
    websiteTrap: str = ""


class ProductionResourceSubmissionCreate(BaseModel):
    name: str
    category: Literal["voice_actor", "post_production", "cover_art", "recording_studio"]
    bio: str = ""
    avatarUrl: str = ""
    profileUrl: str = ""
    links: List[Dict[str, Any]] = []
    works: List[Dict[str, Any]] = []
    submitterName: str
    contactEmail: str
    websiteTrap: str = ""


class ProductionResourceSubmissionStatusUpdate(BaseModel):
    status: Literal["approved", "rejected"]
    reviewNote: str = ""


class ProductionResourceSubmissionRecord(BaseModel):
    id: str
    submitterName: str
    contactEmail: str
    profile: Dict[str, Any]
    status: Literal["pending", "approved", "rejected"]
    reviewNote: str = ""
    publishedId: Optional[str] = None
    reviewedAt: Optional[int] = None
    createdAt: int


class ProductionResourceSubmissionListResponse(BaseModel):
    total: int
    items: List[ProductionResourceSubmissionRecord]


class ProductionResourceProfileSubmissionStatusUpdate(BaseModel):
    status: Literal["approved", "rejected"]
    acceptedFields: List[Literal["displayName", "bio", "avatarUrl", "profileUrl", "links", "works", "contributorName"]] = []
    reviewNote: str = ""


class ProductionResourceProfileSubmissionRecord(BaseModel):
    id: str
    resourceId: str
    resourceName: str = ""
    submitterName: str
    contactEmail: str
    currentProfile: Dict[str, Any] = {}
    profile: Dict[str, Any] = {}
    acceptedFields: List[str] = []
    status: Literal["pending", "approved", "rejected"]
    reviewNote: str = ""
    reviewedAt: Optional[int] = None
    createdAt: int


class ProductionResourceProfileSubmissionListResponse(BaseModel):
    total: int
    items: List[ProductionResourceProfileSubmissionRecord]


class ProductionResourceProfileSubmissionResponse(BaseModel):
    success: bool
    submissionId: str
    createdAt: int


class VoiceActorClaimRequestCreate(BaseModel):
    personaId: str
    proofUrl: str = ""
    note: str = ""


class VoiceActorClaimRequestStatusUpdate(BaseModel):
    status: Literal["approved", "rejected"]
    reviewNote: str = ""


class VoiceActorClaimRequestRecord(BaseModel):
    id: str
    personaId: str
    personaName: str = ""
    requesterId: str
    requesterName: str = ""
    verifiedEmail: str = ""
    proofUrl: str = ""
    note: str = ""
    status: Literal["pending", "approved", "rejected"]
    reviewNote: str = ""
    reviewedAt: Optional[int] = None
    createdAt: int


class VoiceActorClaimRequestListResponse(BaseModel):
    total: int
    items: List[VoiceActorClaimRequestRecord]


class VoiceActorCollaborationUpdate(BaseModel):
    enabled: bool


class ExternalAuthorProfileSubmissionCreate(BaseModel):
    externalAuthorId: Optional[str] = None
    authorKey: str
    displayName: str
    submitterName: str
    contactEmail: str
    contributorName: str = ""
    bio: str = ""
    avatar: str = ""
    profileUrl: str = ""
    website: str = ""
    links: List[Dict[str, Any]] = []
    organizations: List[Dict[str, Any]] = []
    works: List[Dict[str, Any]] = []
    websiteTrap: str = ""


class ExternalAuthorProfileSubmissionStatusUpdate(BaseModel):
    status: Literal["approved", "rejected"]
    reviewNote: str = ""
    acceptedFields: List[Literal["displayName", "bio", "avatar", "profileUrl", "website", "links", "organizations", "works", "contributorName"]] = []


class ExternalAuthorProfileSubmissionRecord(BaseModel):
    id: str
    authorKey: str
    authorName: str = ""
    submitterName: str = ""
    contactEmail: str = ""
    contributorName: str = ""
    collaborators: List[Dict[str, Any]] = []
    currentProfile: Dict[str, Any] = {}
    profile: Dict[str, Any] = {}
    acceptedFields: List[str] = []
    status: Literal["pending", "approved", "rejected"]
    reviewNote: str = ""
    reviewedAt: Optional[int] = None
    createdAt: int


class ExternalAuthorProfileSubmissionListResponse(BaseModel):
    total: int
    items: List[ExternalAuthorProfileSubmissionRecord]


class ExternalAuthorProfileSubmissionResponse(BaseModel):
    success: bool
    submissionId: str
    createdAt: int

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
    layoutConfig: Optional[Any] = None  # JSON object stored as TEXT in DB
    isPublic: bool = False
    description: Optional[str] = ""

class MarkerThemeCreate(MarkerThemeBase):
    id: Optional[str] = None

class MarkerThemeUpdate(BaseModel):
    name: Optional[str] = None
    configs: Optional[Union[List[Dict[str, Any]], Dict[str, Any], str]] = None
    layoutConfig: Optional[Any] = None  # JSON object stored as TEXT in DB
    isPublic: Optional[bool] = None
    description: Optional[str] = None

class UserPublic(BaseModel):
    id: str
    handle: Optional[str] = None
    email: Optional[str] = None # Include email if needed for admin search, or maybe restrict? Assuming visible for search results.
    displayName: Optional[str] = "Anonymous"
    avatar: Optional[str] = None
    avatarCrop: Optional[Dict[str, float]] = None
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

    @field_validator("layoutConfig", mode="before")
    @classmethod
    def parse_layout_config(cls, v: Any) -> Any:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return None
        return v

class SeriesBase(BaseModel):
    name: str
    summary: Optional[str] = ""
    coverUrl: Optional[str] = ""
    coverCrop: Optional[Dict[str, float]] = None

class SeriesCreate(SeriesBase):
    pass

class SeriesUpdate(BaseModel):
    name: Optional[str] = None
    summary: Optional[str] = None
    coverUrl: Optional[str] = None
    coverCrop: Optional[Dict[str, float]] = None

class Series(SeriesBase):
    id: str
    ownerId: str
    slug: str
    createdAt: int
    updatedAt: int
    scriptCount: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


class SeriesReorderItem(BaseModel):
    scriptId: str
    seriesOrder: Optional[int] = None

class SeriesReorderRequest(BaseModel):
    items: List[SeriesReorderItem]

class StudioSeriesSummary(BaseModel):
    id: str
    name: str = ""
    summary: Optional[str] = ""
    coverUrl: Optional[str] = ""
    coverCrop: Optional[Dict[str, float]] = None


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
    coverCrop: Optional[Dict[str, float]] = None
    coverDesign: Optional[Dict[str, Any]] = None
    personaId: Optional[str] = None
    organizationId: Optional[str] = None
    seriesId: Optional[str] = None
    seriesOrder: Optional[int] = None
    licenseCommercial: Optional[str] = None
    licenseDerivative: Optional[str] = None
    licenseNotify: Optional[str] = None
    synopsis: Optional[str] = None
    outline: Optional[str] = None
    activityName: Optional[str] = None
    activityBannerUrl: Optional[str] = None
    activityContent: Optional[str] = None
    activityWorkUrl: Optional[str] = None
    activityDemoLinks: Optional[str] = None  # JSON string
    customMetadata: Optional[List[Dict[str, Any]]] = None
    targetAudience: Optional[str] = None
    contentRating: Optional[str] = None
    license: Optional[str] = None
    licenseSpecialTerms: Optional[str] = None  # JSON array string
    authorDisplayMode: Optional[str] = None
    authorOverrideName: Optional[str] = None

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
    coverCrop: Optional[Dict[str, float]] = None
    coverDesign: Optional[Dict[str, Any]] = None
    coverIsAiGenerated: Optional[bool] = None
    organizationId: Optional[str] = None
    personaId: Optional[str] = None
    disableCopy: Optional[bool] = None
    seriesId: Optional[str] = None
    seriesOrder: Optional[int] = None
    licenseCommercial: Optional[str] = None
    licenseDerivative: Optional[str] = None
    licenseNotify: Optional[str] = None
    synopsis: Optional[str] = None
    outline: Optional[str] = None
    activityName: Optional[str] = None
    activityBannerUrl: Optional[str] = None
    activityContent: Optional[str] = None
    activityWorkUrl: Optional[str] = None
    activityDemoLinks: Optional[str] = None  # JSON string
    customMetadata: Optional[List[Dict[str, Any]]] = None
    targetAudience: Optional[str] = None
    contentRating: Optional[str] = None
    license: Optional[str] = None
    licenseSpecialTerms: Optional[str] = None  # JSON array string
    authorDisplayMode: Optional[str] = None
    authorOverrideName: Optional[str] = None

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
    customMetadata: List[Dict[str, Any]] = []
    createdAt: int
    lastModified: int
    author: Optional[str] = None
    draftDate: Optional[str] = None
    isPublic: int
    status: Optional[str] = "Private"
    coverUrl: Optional[str] = None
    coverCrop: Optional[Dict[str, float]] = None
    coverDesign: Optional[Dict[str, Any]] = None
    coverIsAiGenerated: bool = False
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
    synopsis: Optional[str] = None
    outline: Optional[str] = None
    activityName: Optional[str] = None
    activityBannerUrl: Optional[str] = None
    activityContent: Optional[str] = None
    activityWorkUrl: Optional[str] = None
    activityDemoLinks: Optional[str] = None  # JSON string
    hasPublishIdentity: bool = False
    metadataSeriesName: Optional[str] = ""
    publishReadiness: Optional[str] = "needs_work"
    targetAudience: Optional[str] = None
    contentRating: Optional[str] = None
    license: Optional[str] = None
    licenseSpecialTerms: Optional[str] = None  # JSON array string
    authorDisplayMode: Optional[str] = None
    authorOverrideName: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class ScriptSummary(BaseModel):
    id: str
    ownerId: str
    title: str
    contentLength: Optional[int] = 0
    customMetadata: List[Dict[str, Any]] = []
    # content excluded
    createdAt: int
    lastModified: int
    author: Optional[str] = None
    draftDate: Optional[str] = None
    isPublic: int
    status: Optional[str] = "Private"
    coverUrl: Optional[str] = None
    coverCrop: Optional[Dict[str, float]] = None
    coverDesign: Optional[Dict[str, Any]] = None
    coverIsAiGenerated: bool = False
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
    personaId: Optional[str] = None
    seriesId: Optional[str] = None
    seriesOrder: Optional[int] = None
    series: Optional[Series] = None
    synopsis: Optional[str] = None
    outline: Optional[str] = None
    activityName: Optional[str] = None
    activityBannerUrl: Optional[str] = None
    activityContent: Optional[str] = None
    activityWorkUrl: Optional[str] = None
    activityDemoLinks: Optional[str] = None  # JSON string
    hasPublishIdentity: bool = False
    metadataSeriesName: Optional[str] = ""
    publishReadiness: Optional[str] = "needs_work"

    model_config = ConfigDict(from_attributes=True)

class ScriptStudioSummary(BaseModel):
    id: str
    ownerId: str
    title: str
    contentLength: Optional[int] = 0
    # content and customMetadata excluded for publisher studio initial load
    createdAt: int
    lastModified: int
    author: Optional[str] = None
    draftDate: Optional[str] = None
    isPublic: int
    status: Optional[str] = "Private"
    coverUrl: Optional[str] = None
    coverCrop: Optional[Dict[str, float]] = None
    coverDesign: Optional[Dict[str, Any]] = None
    coverIsAiGenerated: bool = False
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
    personaId: Optional[str] = None
    organizationId: Optional[str] = None
    seriesId: Optional[str] = None
    seriesOrder: Optional[int] = None
    series: Optional[Series] = None
    targetAudience: Optional[str] = None
    contentRating: Optional[str] = None
    synopsis: Optional[str] = None
    hasPublishIdentity: bool = False
    metadataSeriesName: Optional[str] = ""
    publishReadiness: Optional[str] = "needs_work"

    model_config = ConfigDict(from_attributes=True)


class StudioScriptSummary(BaseModel):
    id: str
    ownerId: str
    title: str
    contentLength: Optional[int] = 0
    createdAt: int
    lastModified: int
    author: Optional[str] = None
    draftDate: Optional[str] = None
    isPublic: int
    status: Optional[str] = "Private"
    coverUrl: Optional[str] = None
    coverCrop: Optional[Dict[str, float]] = None
    coverDesign: Optional[Dict[str, Any]] = None
    coverIsAiGenerated: bool = False
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
    personaId: Optional[str] = None
    organizationId: Optional[str] = None
    seriesId: Optional[str] = None
    seriesOrder: Optional[int] = None
    series: Optional[StudioSeriesSummary] = None
    targetAudience: Optional[str] = None
    contentRating: Optional[str] = None
    synopsis: Optional[str] = None
    hasPublishIdentity: bool = False
    metadataSeriesName: str = ""
    publishReadiness: Optional[str] = "needs_work"


class StudioScriptCounts(BaseModel):
    all: int = 0
    needs_work: int = 0
    ready: int = 0
    published: int = 0


class StudioScriptsResponse(BaseModel):
    items: List[StudioScriptSummary] = []
    total: int = 0
    limit: int = 24
    offset: int = 0
    nextOffset: Optional[int] = None
    counts: StudioScriptCounts = StudioScriptCounts()


class StudioBootstrapResponse(BaseModel):
    scripts: StudioScriptsResponse
    personas: List[Persona] = []
    organizations: List[Organization] = []
    tags: List[Tag] = []
    series: List[Series] = []
    myInvites: List[OrganizationInvite] = []

class ScriptAdminMetadataUpdate(BaseModel):
    title: Optional[str] = None
    author: Optional[str] = None
    draftDate: Optional[str] = None
    status: Optional[str] = None
    markerThemeId: Optional[str] = None
    coverUrl: Optional[str] = None
    coverCrop: Optional[Dict[str, float]] = None
    coverIsAiGenerated: Optional[bool] = None
    organizationId: Optional[str] = None
    personaId: Optional[str] = None
    disableCopy: Optional[bool] = None
    seriesId: Optional[str] = None
    seriesOrder: Optional[int] = None
    licenseCommercial: Optional[str] = None
    licenseDerivative: Optional[str] = None
    licenseNotify: Optional[str] = None
    synopsis: Optional[str] = None
    outline: Optional[str] = None
    activityName: Optional[str] = None
    activityBannerUrl: Optional[str] = None
    activityContent: Optional[str] = None
    activityWorkUrl: Optional[str] = None
    activityDemoLinks: Optional[str] = None  # JSON string
    customMetadata: Optional[List[Dict[str, Any]]] = None
    tags: Optional[List[int]] = None


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


class PublicTermsScreen(BaseModel):
    model_config = ConfigDict(extra="forbid")

    width: Optional[int] = Field(default=None, ge=0, le=100000)
    height: Optional[int] = Field(default=None, ge=0, le=100000)
    colorDepth: Optional[int] = Field(default=None, ge=0, le=128)
    pixelRatio: Optional[float] = Field(default=None, ge=0, le=100)


class PublicTermsViewport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    width: Optional[int] = Field(default=None, ge=0, le=100000)
    height: Optional[int] = Field(default=None, ge=0, le=100000)


class PublicTermsAcceptanceCreate(BaseModel):
    termsVersion: str = Field(max_length=128)
    scriptId: Optional[str] = Field(default=None, max_length=128)
    visitorId: Optional[str] = Field(default=None, max_length=128)
    locale: Optional[str] = Field(default=None, max_length=64)
    timezone: Optional[str] = Field(default=None, max_length=128)
    timezoneOffsetMinutes: Optional[int] = Field(default=None, ge=-1440, le=1440)
    userAgent: Optional[str] = Field(default=None, max_length=512)
    platform: Optional[str] = Field(default=None, max_length=128)
    screen: PublicTermsScreen = Field(default_factory=PublicTermsScreen)
    viewport: PublicTermsViewport = Field(default_factory=PublicTermsViewport)
    pagePath: Optional[str] = Field(default=None, max_length=2048)
    referrer: Optional[str] = Field(default=None, max_length=2048)
    acceptedChecks: List[Annotated[str, Field(max_length=128)]] = Field(default_factory=list, max_length=16)


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


class PublicFeedbackCreate(BaseModel):
    kind: Literal["bug", "listing", "ad_application"] = "bug"
    contactName: Optional[str] = ""
    contactEmail: Optional[str] = ""
    scriptTitle: Optional[str] = ""
    scriptSummary: Optional[str] = ""
    authorName: Optional[str] = ""
    authorBio: Optional[str] = ""
    authorSocialUrl: Optional[str] = ""
    documentUrl: Optional[str] = ""
    coverUrl: Optional[str] = ""
    categories: List[str] = []
    seriesName: Optional[str] = ""
    notes: Optional[str] = ""
    content: str = ""
    pageUrl: Optional[str] = ""
    activityPageId: Optional[str] = None
    activityScriptId: Optional[str] = None
    confirmPublicListing: bool = False
    website: Optional[str] = ""  # Honeypot; real visitors should leave this empty.

    @field_validator("contactName", "contactEmail", "scriptTitle", "scriptSummary", "authorName", "authorBio", "authorSocialUrl", "documentUrl", "coverUrl", "seriesName", "notes", "pageUrl", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: Any) -> str:
        return str(value or "").strip()

    @field_validator("content", mode="before")
    @classmethod
    def normalize_content(cls, value: Any) -> str:
        return str(value or "").strip()

    @field_validator("categories", mode="before")
    @classmethod
    def normalize_categories(cls, value: Any) -> List[str]:
        if not isinstance(value, list):
            return []
        result: list[str] = []
        seen: set[str] = set()
        for item in value:
            for raw in str(item or "").replace("，", ",").replace("、", ",").split(","):
                category = raw.strip()[:80]
                if category and category not in seen:
                    result.append(category)
                    seen.add(category)
        return result[:30]


class PublicFeedbackRecord(BaseModel):
    id: str
    kind: Literal["bug", "listing", "ad_application"]
    contactName: str = ""
    contactEmail: str = ""
    scriptTitle: str = ""
    scriptSummary: str = ""
    authorName: str = ""
    authorBio: str = ""
    authorSocialUrl: str = ""
    documentUrl: str = ""
    coverUrl: str = ""
    categories: List[str] = []
    seriesName: str = ""
    notes: str = ""
    content: str
    pageUrl: str = ""
    activityPageId: Optional[str] = None
    status: str = "new"
    createdAt: int
    updatedAt: int

    model_config = ConfigDict(from_attributes=True)


class PublicFeedbackResponse(BaseModel):
    success: bool = True
    feedbackId: str
    createdAt: int


class PublicFeedbackStatusUpdate(BaseModel):
    status: Literal["new", "reviewed", "closed"]


class PublicFeedbackListResponse(BaseModel):
    total: int
    items: List[PublicFeedbackRecord] = []


class PublicManualVoiceActor(BaseModel):
    name: str
    socialUrl: str = ""
    personaId: Optional[str] = None

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: Any) -> str:
        name = str(value or "").strip()
        if not name:
            raise ValueError("名單外聲演請填寫姓名")
        return name[:120]

    @field_validator("socialUrl", mode="before")
    @classmethod
    def validate_social_url(cls, value: Any) -> str:
        import re
        url = str(value or "").strip()
        if not url:
            return ""
        if len(url) > 2000 or not re.fullmatch(r"https://[^\s]+", url, flags=re.IGNORECASE):
            raise ValueError("社群連結需使用有效的 HTTPS 網址")
        return url


class PublicDemoSubmissionCreate(BaseModel):
    scriptType: Literal["internal", "external"]
    scriptId: Optional[str] = None
    externalScriptId: Optional[str] = None
    activityPageId: Optional[str] = None
    demoName: str = ""
    demoUrl: str
    coverUrl: str = ""
    cast: str = ""
    voiceTypes: List[Literal["male", "female"]] = []
    voiceActorIds: List[str] = []
    manualVoiceActors: List[PublicManualVoiceActor] = []
    description: str = ""
    displayName: str = ""
    contactEmail: str = ""
    confirmPublic: bool = False
    confirmVoiceActorProfiles: bool = False
    website: str = ""  # Honeypot.

    @field_validator("demoUrl", mode="before")
    @classmethod
    def validate_demo_url(cls, value: Any) -> str:
        import re
        url = str(value or "").strip()
        if len(url) > 2000 or not re.fullmatch(r"https://[^\s]+", url, flags=re.IGNORECASE):
            raise ValueError("請提供有效的 HTTPS Demo 連結")
        return url

    @field_validator("coverUrl", mode="before")
    @classmethod
    def validate_demo_cover_url(cls, value: Any) -> str:
        import re
        url = str(value or "").strip()
        if not url:
            return ""
        if len(url) > 2000 or not re.fullmatch(r"https://[^\s]+", url, flags=re.IGNORECASE):
            raise ValueError("封面圖片需使用有效的 HTTPS 連結")
        return url

    @field_validator("demoName", "cast", "description", "displayName", "contactEmail", mode="before")
    @classmethod
    def normalize_demo_text(cls, value: Any) -> str:
        return str(value or "").strip()

    @field_validator("voiceActorIds", mode="before")
    @classmethod
    def normalize_voice_actor_ids(cls, value: Any) -> List[str]:
        if not isinstance(value, list):
            return []
        return list(dict.fromkeys(str(item).strip() for item in value if str(item).strip()))[:20]

    @field_validator("voiceTypes", mode="before")
    @classmethod
    def normalize_voice_types(cls, value: Any) -> List[str]:
        if not isinstance(value, list):
            return []
        allowed = {"male", "female"}
        return list(dict.fromkeys(str(item).strip().lower() for item in value if str(item).strip().lower() in allowed))

    @field_validator("manualVoiceActors", mode="before")
    @classmethod
    def limit_manual_voice_actors(cls, value: Any) -> List[Any]:
        if not isinstance(value, list):
            return []
        return value[:20]


class StudioDemoSubmissionCreate(BaseModel):
    scriptType: Literal["internal", "external"]
    scriptId: Optional[str] = None
    externalScriptId: Optional[str] = None
    voiceActorPersonaId: str
    demoName: str = ""
    demoUrl: str
    coverUrl: str = ""
    cast: str = ""
    voiceTypes: List[Literal["male", "female"]] = []
    description: str = ""

    @field_validator("demoUrl", "coverUrl", mode="before")
    @classmethod
    def validate_https_urls(cls, value: Any, info) -> str:
        import re
        url = str(value or "").strip()
        if not url and info.field_name == "coverUrl":
            return ""
        if len(url) > 2000 or not re.fullmatch(r"https://[^\s]+", url, flags=re.IGNORECASE):
            raise ValueError("請提供有效的 HTTPS 連結")
        return url

    @field_validator("demoName", "cast", "description", mode="before")
    @classmethod
    def normalize_text(cls, value: Any) -> str:
        return str(value or "").strip()

    @field_validator("voiceTypes", mode="before")
    @classmethod
    def normalize_voice_types(cls, value: Any) -> List[str]:
        if not isinstance(value, list):
            return []
        allowed = {"male", "female"}
        return list(dict.fromkeys(str(item).strip().lower() for item in value if str(item).strip().lower() in allowed))


class StudioDemoSubmissionUpdate(BaseModel):
    demoName: str = ""
    demoUrl: str
    coverUrl: str = ""
    cast: str = ""
    voiceTypes: List[Literal["male", "female"]] = []
    description: str = ""

    @field_validator("demoUrl", "coverUrl", mode="before")
    @classmethod
    def validate_https_urls(cls, value: Any, info) -> str:
        import re
        url = str(value or "").strip()
        if not url and info.field_name == "coverUrl":
            return ""
        if len(url) > 2000 or not re.fullmatch(r"https://[^\s]+", url, flags=re.IGNORECASE):
            raise ValueError("請提供有效的 HTTPS 連結")
        return url

    @field_validator("demoName", "cast", "description", mode="before")
    @classmethod
    def normalize_text(cls, value: Any) -> str:
        return str(value or "").strip()

    @field_validator("voiceTypes", mode="before")
    @classmethod
    def normalize_voice_types(cls, value: Any) -> List[str]:
        if not isinstance(value, list):
            return []
        allowed = {"male", "female"}
        return list(dict.fromkeys(str(item).strip().lower() for item in value if str(item).strip().lower() in allowed))


class PublicDemoSubmissionRecord(BaseModel):
    id: str
    ownerId: Optional[str] = None
    voiceActorPersonaId: Optional[str] = None
    scriptType: Literal["internal", "external"]
    scriptId: Optional[str] = None
    externalScriptId: Optional[str] = None
    activityPageId: Optional[str] = None
    scriptTitle: str = ""
    scriptUrl: str = ""
    demoName: str = ""
    demoUrl: str
    coverUrl: str = ""
    cast: str = ""
    voiceTypes: List[Literal["male", "female"]] = []
    voiceActorIds: List[str] = []
    manualVoiceActors: List[PublicManualVoiceActor] = []
    voiceActorNames: List[str] = []
    description: str = ""
    displayName: str = ""
    contactEmail: str = ""
    status: Literal["pending", "approved", "rejected"] = "pending"
    reviewedAt: Optional[int] = None
    createdAt: int

    model_config = ConfigDict(from_attributes=True)


class PublicDemoSubmissionListResponse(BaseModel):
    total: int
    items: List[PublicDemoSubmissionRecord] = []


class PublicDemoSubmissionStatusUpdate(BaseModel):
    status: Literal["approved", "rejected", "pending"]


class AdminDemoRecord(BaseModel):
    id: str
    sourceKind: Literal["submission", "internal", "external"]
    parentId: Optional[str] = None
    scriptTitle: str = ""
    scriptUrl: str = ""
    demoName: str = ""
    demoUrl: str
    coverUrl: str = ""
    cast: str = ""
    voiceTypes: List[Literal["male", "female"]] = []
    voiceActorIds: List[str] = []
    description: str = ""
    displayName: str = ""
    contactEmail: str = ""
    status: str = "approved"
    createdAt: int = 0


class AdminDemoListResponse(BaseModel):
    total: int
    items: List[AdminDemoRecord] = []


class AdminDemoTarget(BaseModel):
    id: str
    sourceKind: Literal["internal", "external"]
    title: str
    authorName: str = ""


class AdminDemoMutation(BaseModel):
    sourceKind: Literal["submission", "internal", "external"]
    parentId: Optional[str] = None
    scriptTitle: str = ""
    scriptUrl: str = ""
    demoName: str = ""
    demoUrl: str
    coverUrl: str = ""
    cast: str = ""
    voiceTypes: List[Literal["male", "female"]] = []
    voiceActorIds: List[str] = []
    description: str = ""
    displayName: str = ""
    contactEmail: str = ""
    status: Literal["pending", "approved", "rejected"] = "approved"

    @field_validator("voiceActorIds", mode="before")
    @classmethod
    def normalize_admin_voice_actor_ids(cls, value: Any) -> List[str]:
        if not isinstance(value, list):
            return []
        return list(dict.fromkeys(str(item).strip() for item in value if str(item).strip()))[:20]

    @field_validator("demoUrl", "coverUrl", "scriptUrl", mode="before")
    @classmethod
    def validate_admin_demo_urls(cls, value: Any, info) -> str:
        import re
        url = str(value or "").strip()
        if not url and info.field_name in {"coverUrl", "scriptUrl"}:
            return ""
        if info.field_name == "scriptUrl" and len(url) <= 2000 and url.startswith("/") and not url.startswith("//"):
            return url
        if len(url) > 2000 or not re.fullmatch(r"https?://[^\s]+", url, flags=re.IGNORECASE):
            raise ValueError("請提供有效的公開連結")
        return url

    @field_validator("demoName", "cast", "description", "displayName", "contactEmail", "scriptTitle", mode="before")
    @classmethod
    def clean_admin_demo_text(cls, value: Any) -> str:
        return str(value or "").strip()


class PublicDemoSubmissionResponse(BaseModel):
    success: bool = True
    submissionId: str
    createdAt: int


class PublicAudioWorkSubmissionCreate(BaseModel):
    title: str
    url: str
    coverUrl: str = ""
    description: str = ""
    creatorName: str = ""
    creatorUrl: str = ""
    organizationId: Optional[str] = None
    accessType: Literal["paid", "free"] = "paid"
    contactEmail: str = ""
    confirmPublic: bool = False
    website: str = ""  # Honeypot.

    @field_validator("url", "coverUrl", "creatorUrl", mode="before")
    @classmethod
    def validate_audio_work_urls(cls, value: Any, info) -> str:
        import re
        url = str(value or "").strip()
        if not url and info.field_name in {"coverUrl", "creatorUrl"}:
            return ""
        if len(url) > 2000 or not re.fullmatch(r"https://[^\s]+", url, flags=re.IGNORECASE):
            raise ValueError("請提供有效的 HTTPS 連結")
        return url

    @field_validator("title", "description", "creatorName", "contactEmail", mode="before")
    @classmethod
    def normalize_audio_work_text(cls, value: Any) -> str:
        return str(value or "").strip()


class PublicAudioWorkSubmissionResponse(BaseModel):
    success: bool = True
    submissionId: str
    createdAt: int


class PublicAudioWorkSubmissionRecord(BaseModel):
    id: str
    title: str
    url: str
    coverUrl: str = ""
    description: str = ""
    creatorName: str = ""
    creatorUrl: str = ""
    organizationId: Optional[str] = None
    voiceActorIds: List[str] = []
    accessType: Literal["paid", "free"] = "paid"
    contactEmail: str = ""
    status: Literal["pending", "approved", "rejected"]
    reviewedAt: Optional[int] = None
    publishedAt: Optional[int] = None
    createdAt: int


class PublicAudioWorkSubmissionListResponse(BaseModel):
    total: int
    items: List[PublicAudioWorkSubmissionRecord] = []


class PublicAudioWorkSubmissionStatusUpdate(BaseModel):
    status: Literal["approved", "rejected", "pending"]
    organizationId: Optional[str] = None
    voiceActorIds: Optional[List[str]] = None
    accessType: Optional[Literal["paid", "free"]] = None


class PublicDemoEntry(BaseModel):
    id: str
    scriptType: Literal["internal", "external"]
    scriptId: Optional[str] = None
    externalScriptId: Optional[str] = None
    scriptTitle: str
    scriptUrl: str
    demoName: str = ""
    demoUrl: str
    coverUrl: str = ""
    cast: str = ""
    voiceTypes: List[Literal["male", "female"]] = []
    voiceActorIds: List[str] = []
    manualVoiceActors: List[PublicManualVoiceActor] = []
    description: str = ""
    displayName: str = ""
    createdAt: int


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
    eyebrow: Optional[str] = None
    title: str = ""
    content: str = ""
    link: str = ""
    imageUrl: str = ""
    imageAlt: Optional[str] = None
    imageCrop: Optional[dict] = None
    imageMobileCrop: Optional[dict] = None
    imageDesktopCrop: Optional[dict] = None
    imageUltraWideCrop: Optional[dict] = None
    imageBackgroundMode: Optional[str] = None


class HomepageBannerSetting(BaseModel):
    title: str = ""
    content: str = ""
    link: str = ""
    imageUrl: str = ""
    items: List[HomepageBannerItem] = []


class DemoBannerSetting(BaseModel):
    items: List[HomepageBannerItem] = []


class ActivityPagePayload(BaseModel):
    slug: str
    title: str
    summary: str = ""
    coverUrl: str = ""
    coverCrop: Optional[dict[str, float]] = None
    body: str = ""
    scriptIds: List[str] = []
    externalScriptIds: List[str] = []
    acceptingSubmissions: bool = False
    status: Literal["draft", "published"] = "draft"
    sortOrder: int = 0


class ActivityPageRecord(ActivityPagePayload):
    id: str
    createdAt: int
    updatedAt: int
    publishedAt: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class ActivitySubmissionRecord(BaseModel):
    id: str
    activityPageId: str
    kind: Literal["demo", "script"]
    title: str
    summary: str = ""
    link: str = ""
    coverUrl: str = ""
    scriptType: Optional[Literal["internal", "external"]] = None
    scriptId: Optional[str] = None
    externalScriptId: Optional[str] = None
    voiceTypes: List[Literal["male", "female"]] = []
    createdAt: int


class ActivitySubmissionListResponse(BaseModel):
    items: List[ActivitySubmissionRecord] = []


class ActivitySubmissionUpdate(BaseModel):
    title: str
    summary: str = ""
    link: str = ""
    coverUrl: str = ""
    voiceTypes: List[Literal["male", "female"]] = []


class ExternalPublicScriptPreviewRequest(BaseModel):
    sourceUrl: str
    authorUrl: Optional[str] = None
    organizationUrl: Optional[str] = None


class ExternalPublicScriptDemoLink(BaseModel):
    id: str = ""
    name: str = ""
    url: str
    coverUrl: str = ""
    cast: str = ""
    voiceTypes: List[Literal["male", "female"]] = []
    voiceActorIds: List[str] = []
    description: str = ""


class ExternalPublicScriptPayload(BaseModel):
    sourceUrl: str
    externalAuthorId: Optional[str] = None
    authorPersonaId: Optional[str] = None
    canonicalUrl: Optional[str] = None
    sourceDomain: Optional[str] = None
    sourceName: Optional[str] = None
    authorName: Optional[str] = None
    authorBio: Optional[str] = None
    authorUrl: Optional[str] = None
    authorAvatarUrl: Optional[str] = None
    organizationName: Optional[str] = None
    organizationBio: Optional[str] = None
    organizationUrl: Optional[str] = None
    organizationAvatarUrl: Optional[str] = None
    remoteTitle: Optional[str] = None
    remoteSummary: Optional[str] = None
    remoteCoverUrl: Optional[str] = None
    titleOverride: str = ""
    summaryOverride: str = ""
    coverUrlOverride: str = ""
    seriesName: str = ""
    seriesOrder: Optional[int] = None
    demoLinks: List[ExternalPublicScriptDemoLink] = []
    categories: List[str] = []
    status: Literal["draft", "published", "hidden"] = "draft"
    sortOrder: float = 0.0
    mountedAt: Optional[int] = None
    refreshMetadata: bool = False
    skipFirstPageCover: bool = False


class ExternalPublicScriptUpdate(BaseModel):
    externalAuthorId: Optional[str] = None
    sourceUrl: Optional[str] = None
    canonicalUrl: Optional[str] = None
    sourceDomain: Optional[str] = None
    sourceName: Optional[str] = None
    authorName: Optional[str] = None
    authorBio: Optional[str] = None
    authorUrl: Optional[str] = None
    authorAvatarUrl: Optional[str] = None
    organizationName: Optional[str] = None
    organizationBio: Optional[str] = None
    organizationUrl: Optional[str] = None
    organizationAvatarUrl: Optional[str] = None
    remoteTitle: Optional[str] = None
    remoteSummary: Optional[str] = None
    remoteCoverUrl: Optional[str] = None
    titleOverride: Optional[str] = None
    summaryOverride: Optional[str] = None
    coverUrlOverride: Optional[str] = None
    seriesName: Optional[str] = None
    seriesOrder: Optional[int] = None
    demoLinks: Optional[List[ExternalPublicScriptDemoLink]] = None
    categories: Optional[List[str]] = None
    status: Optional[Literal["draft", "published", "hidden"]] = None
    sortOrder: Optional[float] = None
    mountedAt: Optional[int] = None
    refreshMetadata: bool = False
    skipFirstPageCover: bool = False


class ExternalPublicScriptResponse(BaseModel):
    id: str
    sourceUrl: str
    canonicalUrl: str = ""
    sourceDomain: str = ""
    sourceName: str = ""
    externalAuthorId: Optional[str] = None
    authorKey: str = ""
    authorName: str = ""
    authorBio: str = ""
    authorUrl: str = ""
    authorAvatarUrl: str = ""
    organizationName: str = ""
    organizationBio: str = ""
    organizationUrl: str = ""
    organizationAvatarUrl: str = ""
    remoteTitle: str = ""
    remoteSummary: str = ""
    remoteCoverUrl: str = ""
    titleOverride: str = ""
    summaryOverride: str = ""
    coverUrlOverride: str = ""
    seriesName: str = ""
    seriesOrder: Optional[int] = None
    demoLinks: List[ExternalPublicScriptDemoLink] = []
    title: str = ""
    summary: str = ""
    coverUrl: str = ""
    categories: List[str] = []
    views: int = 0
    status: Literal["draft", "published", "hidden"] = "draft"
    sortOrder: float = 0.0
    lastFetchedAt: Optional[int] = None
    lastFetchError: str = ""
    sourceCreatedAt: Optional[int] = None
    sourceModifiedAt: Optional[int] = None
    createdAt: int
    mountedAt: int = 0
    updatedAt: int


class ExternalAuthorPageProfilePayload(BaseModel):
    authorKey: str
    linkedPersonaId: Optional[str] = None
    displayName: str
    bio: str = ""
    profileUrl: str = ""
    avatarUrl: str = ""
    isHidden: bool = False


class ExternalAuthorPageProfileRecord(ExternalAuthorPageProfilePayload):
    createdAt: int
    updatedAt: int


class ExternalPublicScriptPreview(BaseModel):
    sourceUrl: str
    canonicalUrl: str = ""
    sourceDomain: str = ""
    sourceName: str = ""
    authorName: str = ""
    authorBio: str = ""
    authorUrl: str = ""
    authorAvatarUrl: str = ""
    organizationName: str = ""
    organizationBio: str = ""
    organizationUrl: str = ""
    organizationAvatarUrl: str = ""
    remoteTitle: str = ""
    remoteSummary: str = ""
    remoteCoverUrl: str = ""
    sourceCreatedAt: Optional[int] = None
    sourceModifiedAt: Optional[int] = None
    coverPreviewDataUrl: str = ""
