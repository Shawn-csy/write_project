# NOTE: Use BigInteger (not Integer) for all millisecond timestamp columns.
# SQLite Integer is dynamically sized and handles large values silently,
# but PostgreSQL Integer is 32-bit (max ~2.1B) and will raise "integer out of range"
# for Unix millisecond timestamps (~1.7T as of 2026).
from sqlalchemy import Column, Integer, BigInteger, String, Text, Float, Boolean, ForeignKey, JSON, UniqueConstraint, Index
from sqlalchemy.orm import backref, relationship
from database import Base
import time
import uuid


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    handle = Column(String, unique=True)
    email = Column(String, index=True)  # Added for search/ownership transfer
    displayName = Column(String)
    avatar = Column(String)
    avatarCrop = Column(JSON, nullable=True)
    bio = Column(Text)
    settings = Column(String, default="{}")  # JSON string
    website = Column(String, default="")
    organizationId = Column(String, ForeignKey("organizations.id"), nullable=True)
    createdAt = Column(BigInteger, default=lambda: int(time.time() * 1000))
    lastLogin = Column(BigInteger, default=lambda: int(time.time() * 1000))

    organization = relationship("Organization", foreign_keys="[User.organizationId]", back_populates="members")
    personas = relationship("Persona", back_populates="owner")


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String, primary_key=True)  # UUID
    name = Column(String)
    description = Column(Text, default="")
    website = Column(String, default="")
    logoUrl = Column(String, default="")
    logoCrop = Column(JSON, nullable=True)
    bannerUrl = Column(String, default="")
    bannerCrop = Column(JSON, nullable=True)
    tags = Column(JSON, default=list)
    ownerId = Column(String, ForeignKey("users.id"))
    createdAt = Column(BigInteger, default=lambda: int(time.time() * 1000))
    updatedAt = Column(BigInteger, default=lambda: int(time.time() * 1000))

    owner = relationship("User", foreign_keys=[ownerId], backref="owned_organizations")
    members = relationship("User", foreign_keys="[User.organizationId]", back_populates="organization")


class Persona(Base):
    __tablename__ = "personas"

    id = Column(String, primary_key=True)
    ownerId = Column(String, ForeignKey("users.id"))
    displayName = Column(String)
    avatar = Column(String, default="")
    avatarCrop = Column(JSON, nullable=True)
    bannerUrl = Column(String, default="")
    bannerCrop = Column(JSON, nullable=True)
    bio = Column(Text, default="")
    website = Column(String, default="")
    links = Column(JSON, default=list)
    organizationIds = Column(JSON, default=list)
    voiceActorWorks = Column(JSON, default=list)
    voiceActorOrganizations = Column(JSON, default=list)
    voiceActorContributors = Column(JSON, default=list)
    tags = Column(JSON, default=list)
    voiceActorHidden = Column(Boolean, default=False, nullable=False, index=True)
    defaultLicenseCommercial = Column(String, default="")
    defaultLicenseDerivative = Column(String, default="")
    defaultLicenseNotify = Column(String, default="")
    defaultLicenseSpecialTerms = Column(JSON, default=list)
    createdAt = Column(BigInteger, default=lambda: int(time.time() * 1000))
    updatedAt = Column(BigInteger, default=lambda: int(time.time() * 1000))

    owner = relationship("User", back_populates="personas")


class PersonaRole(Base):
    """Role-specific state attached to one public identity.

    Persona owns shared profile fields. Role visibility and role-only profile
    data live here so adding a new role does not add more columns to Persona.
    """

    __tablename__ = "persona_roles"
    __table_args__ = (UniqueConstraint("personaId", "role", name="uq_persona_roles_persona_role"),)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    personaId = Column(String, ForeignKey("personas.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String, nullable=False, index=True)
    isVisible = Column(Boolean, nullable=False, default=True, index=True)
    sourceTypes = Column(JSON, nullable=False, default=list)
    profile = Column(JSON, nullable=False, default=dict)
    createdAt = Column(BigInteger, nullable=False, default=lambda: int(time.time() * 1000))
    updatedAt = Column(BigInteger, nullable=False, default=lambda: int(time.time() * 1000))

    persona = relationship("Persona", backref=backref("roleRecords", cascade="all, delete-orphan"))


class ProductionResource(Base):
    """A sourced, editorially reviewed production service listing."""

    __tablename__ = "production_resources"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    categories = Column(JSON, nullable=False, default=list)
    summary = Column(Text, nullable=False, default="")
    websiteUrl = Column(String, nullable=False)
    sourceUrl = Column(String, nullable=False)
    status = Column(String, nullable=False, default="draft", index=True)
    reviewedAt = Column(BigInteger, nullable=False)
    createdAt = Column(BigInteger, nullable=False, default=lambda: int(time.time() * 1000))
    updatedAt = Column(BigInteger, nullable=False, default=lambda: int(time.time() * 1000))


class ProductionResourceCredit(Base):
    """A reviewed credit linking one resource to a public audio work."""

    __tablename__ = "production_resource_credits"
    __table_args__ = (UniqueConstraint("resourceId", "audioWorkId", "creditRole", name="uq_production_resource_credit"),)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    resourceId = Column(String, ForeignKey("production_resources.id", ondelete="CASCADE"), nullable=False, index=True)
    audioWorkId = Column(String, ForeignKey("public_audio_work_submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    creditRole = Column(String, nullable=False)
    creditedAs = Column(String, nullable=False)
    createdAt = Column(BigInteger, nullable=False, default=lambda: int(time.time() * 1000))


class ProductionResourceEnrichment(Base):
    """Verified profile details sourced from a credit link or an official site."""

    __tablename__ = "production_resource_enrichments"

    id = Column(String, primary_key=True)
    profileUrl = Column(Text, nullable=False)
    profileLabel = Column(String, nullable=False)
    avatarUrl = Column(Text, nullable=False, default="")
    bio = Column(Text, nullable=False, default="")
    sourceUrl = Column(Text, nullable=False)
    checkedAt = Column(BigInteger, nullable=False)


class ProductionResourceLink(Base):
    """A verified additional public contact link for a curated or derived resource."""

    __tablename__ = "production_resource_links"

    id = Column(String, primary_key=True)
    resourceId = Column(String, nullable=False, index=True)
    label = Column(String, nullable=False)
    url = Column(Text, nullable=False)
    sourceUrl = Column(Text, nullable=False)
    checkedAt = Column(BigInteger, nullable=False)


class ProductionResourceProfileOverride(Base):
    """Reviewed visitor edits layered over source-backed resource research."""

    __tablename__ = "production_resource_profile_overrides"

    id = Column(String, primary_key=True)
    profile = Column(JSON, nullable=False, default=dict)
    contributors = Column(JSON, nullable=False, default=list)
    updatedAt = Column(BigInteger, nullable=False, default=lambda: int(time.time() * 1000))


class ProductionResourceProfileSubmission(Base):
    """Visitor-proposed resource profile changes awaiting administrator review."""

    __tablename__ = "production_resource_profile_submissions"

    id = Column(String, primary_key=True)
    resourceId = Column(String, nullable=False, index=True)
    submitterName = Column(String, nullable=False)
    contactEmail = Column(String, nullable=False)
    profile = Column(JSON, nullable=False, default=dict)
    acceptedFields = Column(JSON, nullable=False, default=list)
    status = Column(String, nullable=False, default="pending", index=True)
    reviewNote = Column(Text, nullable=False, default="")
    reviewedAt = Column(BigInteger, nullable=True)
    reviewedBy = Column(String, nullable=True)
    createdAt = Column(BigInteger, nullable=False, default=lambda: int(time.time() * 1000), index=True)


class AudioWorkCredit(Base):
    """A source-backed production credit attached to one audio work."""

    __tablename__ = "audio_work_credits"
    __table_args__ = (UniqueConstraint("audioWorkId", "role", "creditedAs", "provenance", name="uq_audio_work_credit"),)

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    audioWorkId = Column(String, ForeignKey("public_audio_work_submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String, nullable=False, index=True)
    sourceRole = Column(String, nullable=False)
    creditedAs = Column(Text, nullable=False)
    provenance = Column(String, nullable=False)  # official_page | catalog_description
    sourceUrl = Column(Text, nullable=False)
    checkedAt = Column(BigInteger, nullable=False)


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    ownerId = Column(String)
    name = Column(String)
    color = Column(String)

    scripts = relationship("Script", secondary="script_tags", back_populates="tags")


class MarkerTheme(Base):
    __tablename__ = "marker_themes"

    id = Column(String, primary_key=True, index=True)
    ownerId = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name = Column(String)
    configs = Column(String, default="[]")  # JSON string of configs
    layoutConfig = Column(Text, default=None, nullable=True)  # JSON string of LayoutConfig
    isPublic = Column(Boolean, default=False, index=True)
    description = Column(Text, default="")
    createdAt = Column(BigInteger, default=lambda: int(time.time() * 1000))
    updatedAt = Column(BigInteger, default=lambda: int(time.time() * 1000))

    owner = relationship("User", backref="marker_themes")


class Series(Base):
    __tablename__ = "series"

    id = Column(String, primary_key=True, index=True)
    ownerId = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    name = Column(String, nullable=False)
    slug = Column(String, index=True, nullable=False)
    summary = Column(Text, default="")
    coverUrl = Column(String, default="")
    coverCrop = Column(JSON, nullable=True)
    createdAt = Column(BigInteger, default=lambda: int(time.time() * 1000))
    updatedAt = Column(BigInteger, default=lambda: int(time.time() * 1000))

    owner = relationship("User", foreign_keys=[ownerId], backref="series")


class Script(Base):
    __tablename__ = "scripts"

    id = Column(String, primary_key=True, index=True)
    ownerId = Column(String, ForeignKey("users.id"), index=True)
    title = Column(String)
    content = Column(String, default="")
    customMetadata = Column(JSON, default=list)
    createdAt = Column(BigInteger, default=lambda: int(time.time() * 1000))
    lastModified = Column(BigInteger, default=lambda: int(time.time() * 1000))
    author = Column(String, default="")
    draftDate = Column(String, default="")
    isPublic = Column(Integer, default=0, index=True)  # 0 or 1
    type = Column(String, default="script")  # 'script' or 'folder'
    folder = Column(String, default="/", index=True)
    sortOrder = Column(Float, default=0.0)
    markerThemeId = Column(String, ForeignKey("marker_themes.id"), nullable=True)
    seriesId = Column(String, ForeignKey("series.id"), nullable=True, index=True)
    seriesOrder = Column(Integer, nullable=True)
    status = Column(String, default="Private")  # Private, Public, Unlisted
    coverUrl = Column(String, default="")
    coverCrop = Column(JSON, nullable=True)
    coverDesign = Column(JSON, nullable=True)
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    organizationId = Column(String, ForeignKey("organizations.id"), nullable=True)
    personaId = Column(String, ForeignKey("personas.id"), nullable=True)
    disableCopy = Column(Boolean, default=False)  # Content protection: disable copy on public page
    coverIsAiGenerated = Column(Boolean, default=False)
    licenseCommercial = Column(String, default="")
    licenseDerivative = Column(String, default="")
    licenseNotify = Column(String, default="")
    synopsis = Column(String, nullable=True)
    outline = Column(String, nullable=True)
    activityName = Column(String, nullable=True)
    activityBannerUrl = Column(String, nullable=True)
    activityContent = Column(Text, nullable=True)
    activityWorkUrl = Column(String, nullable=True)
    activityDemoLinks = Column(Text, nullable=True)  # JSON string
    hasPublishIdentity = Column(Boolean, default=False, index=True)
    metadataSeriesName = Column(String, default="")
    publishReadiness = Column(String, default="needs_work", index=True)
    targetAudience = Column(String, nullable=True)
    contentRating = Column(String, nullable=True)
    license = Column(String, nullable=True)
    licenseSpecialTerms = Column(Text, nullable=True)  # JSON array string
    authorDisplayMode = Column(String, nullable=True)  # "persona" | "owner" | "override" | ""
    authorOverrideName = Column(String, nullable=True)

    tags = relationship("Tag", secondary="script_tags", back_populates="scripts")
    markerTheme = relationship("MarkerTheme", lazy="joined")
    owner = relationship("User", backref="scripts", foreign_keys=[ownerId])
    series = relationship("Series", foreign_keys=[seriesId], lazy="joined")
    organization = relationship("Organization", foreign_keys=[organizationId], lazy="joined")
    persona = relationship("Persona", foreign_keys=[personaId], lazy="joined")


class ScriptTag(Base):
    __tablename__ = "script_tags"

    scriptId = Column(String, ForeignKey("scripts.id", ondelete="CASCADE"), primary_key=True)
    tagId = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)


class OrganizationInvite(Base):
    __tablename__ = "organization_invites"

    id = Column(String, primary_key=True, index=True)
    orgId = Column(String, ForeignKey("organizations.id"), index=True)
    invitedUserId = Column(String, ForeignKey("users.id"), index=True)
    inviterUserId = Column(String, ForeignKey("users.id"), index=True)
    status = Column(String, default="pending")  # pending, accepted, declined, revoked
    createdAt = Column(BigInteger, default=lambda: int(time.time() * 1000))


class OrganizationMembership(Base):
    __tablename__ = "organization_memberships"
    __table_args__ = (
        UniqueConstraint("orgId", "userId", name="uq_org_memberships_org_user"),
    )

    id = Column(String, primary_key=True, index=True)
    orgId = Column(String, ForeignKey("organizations.id"), index=True, nullable=False)
    userId = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    role = Column(String, default="member")
    createdAt = Column(BigInteger, default=lambda: int(time.time() * 1000))
    updatedAt = Column(BigInteger, default=lambda: int(time.time() * 1000))


class PersonaOrganizationMembership(Base):
    __tablename__ = "persona_organization_memberships"
    __table_args__ = (
        UniqueConstraint("orgId", "personaId", name="uq_persona_org_memberships_org_persona"),
    )

    id = Column(String, primary_key=True, index=True)
    orgId = Column(String, ForeignKey("organizations.id"), index=True, nullable=False)
    personaId = Column(String, ForeignKey("personas.id"), index=True, nullable=False)
    role = Column(String, default="member")
    createdAt = Column(BigInteger, default=lambda: int(time.time() * 1000))
    updatedAt = Column(BigInteger, default=lambda: int(time.time() * 1000))


class OrganizationRequest(Base):
    __tablename__ = "organization_requests"

    id = Column(String, primary_key=True, index=True)
    orgId = Column(String, ForeignKey("organizations.id"), index=True)
    requesterUserId = Column(String, ForeignKey("users.id"), index=True)
    status = Column(String, default="pending")  # pending, accepted, declined, cancelled
    createdAt = Column(BigInteger, default=lambda: int(time.time() * 1000))


class ScriptLike(Base):
    __tablename__ = "script_likes"
    __table_args__ = (
        UniqueConstraint("scriptId", "userId", "visitorId", name="uq_script_likes_script_actor"),
        Index("ix_script_likes_script_client", "scriptId", "clientKey"),
    )

    id = Column(String, primary_key=True, default=lambda: str(__import__("uuid").uuid4()))
    scriptId = Column(String, ForeignKey("scripts.id", ondelete="CASCADE"), nullable=False, index=True)
    userId = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    visitorId = Column(String, nullable=True, index=True)
    clientKey = Column(String, nullable=True)
    createdAt = Column(BigInteger, default=lambda: int(time.time() * 1000))


class PublicViewWindow(Base):
    """One recent counted view per source and public item, shared across workers."""

    __tablename__ = "public_view_windows"
    __table_args__ = (
        UniqueConstraint("resourceType", "resourceId", "clientKey", name="uq_public_view_window_source"),
    )

    id = Column(String, primary_key=True)
    resourceType = Column(String, nullable=False)
    resourceId = Column(String, nullable=False)
    clientKey = Column(String, nullable=False)
    expiresAt = Column(BigInteger, nullable=False, index=True)


class PublicTermsAcceptance(Base):
    __tablename__ = "public_terms_acceptances"

    id = Column(String, primary_key=True, index=True)
    termsKey = Column(String, index=True, default="public_reader_terms")
    termsVersion = Column(String, index=True)
    scriptId = Column(String, ForeignKey("scripts.id", ondelete="SET NULL"), nullable=True, index=True)
    userId = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    visitorId = Column(String, nullable=True, index=True)
    acceptedAt = Column(BigInteger, default=lambda: int(time.time() * 1000), index=True)
    ipAddress = Column(String, default="")
    forwardedFor = Column(String, default="")
    userAgent = Column(Text, default="")
    acceptLanguage = Column(String, default="")
    referer = Column(String, default="")
    origin = Column(String, default="")
    host = Column(String, default="")
    clientMeta = Column(JSON, default=dict)
    headerSnapshot = Column(JSON, default=dict)


class PublicFeedback(Base):
    """Unauthenticated messages submitted from the public site."""

    __tablename__ = "public_feedback"

    id = Column(String, primary_key=True, index=True)
    kind = Column(String, default="bug", index=True)  # bug | listing | ad_application
    contactName = Column(String, default="")
    contactEmail = Column(String, default="")
    scriptTitle = Column(String, default="")
    scriptSummary = Column(Text, default="")
    authorName = Column(String, default="")
    authorBio = Column(Text, default="")
    authorSocialUrl = Column(Text, default="")
    documentUrl = Column(Text, default="")
    coverUrl = Column(Text, default="")
    categories = Column(JSON, default=list)
    seriesName = Column(String, default="")
    notes = Column(Text, default="")
    content = Column(Text, nullable=False)
    pageUrl = Column(Text, default="")
    activityPageId = Column(String, ForeignKey("activity_pages.id", ondelete="SET NULL"), nullable=True, index=True)
    activityScriptId = Column(String, index=True, nullable=True)
    status = Column(String, default="new", index=True)  # new | reviewed | closed
    ipAddress = Column(String, default="")
    forwardedFor = Column(String, default="")
    userAgent = Column(Text, default="")
    referer = Column(Text, default="")
    createdAt = Column(BigInteger, default=lambda: int(time.time() * 1000), index=True)
    updatedAt = Column(BigInteger, default=lambda: int(time.time() * 1000), index=True)


class PublicDemoSubmission(Base):
    """Public demo links submitted for moderation before they appear in the directory."""

    __tablename__ = "public_demo_submissions"

    id = Column(String, primary_key=True, index=True)
    ownerId = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    voiceActorPersonaId = Column(String, ForeignKey("personas.id", ondelete="SET NULL"), nullable=True, index=True)
    scriptType = Column(String, nullable=False, index=True)  # internal | external
    scriptId = Column(String, ForeignKey("scripts.id", ondelete="SET NULL"), nullable=True, index=True)
    externalScriptId = Column(String, ForeignKey("external_public_scripts.id", ondelete="SET NULL"), nullable=True, index=True)
    activityPageId = Column(String, ForeignKey("activity_pages.id", ondelete="SET NULL"), nullable=True, index=True)
    scriptTitle = Column(Text, nullable=False, default="")
    scriptUrl = Column(Text, nullable=False, default="")
    demoName = Column(String, nullable=False, default="")
    demoUrl = Column(Text, nullable=False)
    coverUrl = Column(Text, nullable=False, default="")
    cast = Column(Text, nullable=False, default="")
    voiceTypes = Column(JSON, nullable=False, default=list)
    voiceActorIds = Column(JSON, nullable=False, default=list)
    manualVoiceActors = Column(JSON, nullable=False, default=list)
    description = Column(Text, nullable=False, default="")
    displayName = Column(String, nullable=False, default="")
    contactEmail = Column(String, nullable=False, default="")
    status = Column(String, nullable=False, default="pending", index=True)  # pending | approved | rejected
    reviewedAt = Column(BigInteger, nullable=True)
    reviewedBy = Column(String, nullable=True)
    createdAt = Column(BigInteger, default=lambda: int(time.time() * 1000), index=True)


class PublicAudioWorkSubmission(Base):
    """Audio work promotions submitted for moderation before they are listed publicly."""

    __tablename__ = "public_audio_work_submissions"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False, default="")
    url = Column(Text, nullable=False)
    coverUrl = Column(Text, nullable=False, default="")
    description = Column(Text, nullable=False, default="")
    creatorName = Column(String, nullable=False, default="")
    creatorUrl = Column(Text, nullable=False, default="")
    organizationId = Column(String, ForeignKey("organizations.id"), nullable=True, index=True)
    voiceActorIds = Column(JSON, nullable=False, default=list)
    accessType = Column(String, nullable=False, default="paid")
    contactEmail = Column(String, nullable=False, default="")
    status = Column(String, nullable=False, default="pending", index=True)  # pending | approved | rejected
    reviewedAt = Column(BigInteger, nullable=True)
    reviewedBy = Column(String, nullable=True)
    publishedAt = Column(BigInteger, nullable=True)  # Source release time; fall back to createdAt.
    createdAt = Column(BigInteger, default=lambda: int(time.time() * 1000), index=True)


class VoiceActorProfileSubmission(Base):
    """Public profile updates for voice actor personas, applied only after admin approval."""

    __tablename__ = "voice_actor_profile_submissions"

    id = Column(String, primary_key=True, index=True)
    personaId = Column(String, ForeignKey("personas.id", ondelete="CASCADE"), nullable=False, index=True)
    submitterName = Column(String, nullable=False, default="")
    contactEmail = Column(String, nullable=False, default="")
    profile = Column(JSON, nullable=False, default=dict)
    acceptedFields = Column(JSON, nullable=False, default=list)
    status = Column(String, nullable=False, default="pending", index=True)
    reviewNote = Column(Text, nullable=False, default="")
    reviewedAt = Column(BigInteger, nullable=True)
    reviewedBy = Column(String, nullable=True)
    createdAt = Column(BigInteger, default=lambda: int(time.time() * 1000), index=True)

    persona = relationship("Persona")


class VoiceActorClaimRequest(Base):
    """A verified account's request to take ownership of an unclaimed voice actor identity."""

    __tablename__ = "voice_actor_claim_requests"

    id = Column(String, primary_key=True, index=True)
    personaId = Column(String, ForeignKey("personas.id", ondelete="CASCADE"), nullable=False, index=True)
    requesterId = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    verifiedEmail = Column(String, nullable=False, default="")
    proofUrl = Column(Text, nullable=False, default="")
    note = Column(Text, nullable=False, default="")
    status = Column(String, nullable=False, default="pending", index=True)
    reviewNote = Column(Text, nullable=False, default="")
    reviewedAt = Column(BigInteger, nullable=True)
    reviewedBy = Column(String, nullable=True)
    createdAt = Column(BigInteger, nullable=False, default=lambda: int(time.time() * 1000), index=True)

    persona = relationship("Persona")
    requester = relationship("User")


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(String, primary_key=True, index=True)
    userId = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    email = Column(String, nullable=True, index=True)
    createdBy = Column(String, ForeignKey("users.id"), nullable=True)
    createdAt = Column(BigInteger, default=lambda: int(time.time() * 1000), index=True)


class SiteSetting(Base):
    __tablename__ = "site_settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(Text, default="")
    updatedBy = Column(String, ForeignKey("users.id"), nullable=True)
    updatedAt = Column(BigInteger, default=lambda: int(time.time() * 1000), index=True)


class ActivityPage(Base):
    """Admin-curated campaign pages shown in the public Activity hub."""

    __tablename__ = "activity_pages"

    id = Column(String, primary_key=True, index=True)
    slug = Column(String, nullable=False, unique=True, index=True)
    title = Column(String, nullable=False)
    summary = Column(Text, default="")
    coverUrl = Column(Text, default="")
    coverCrop = Column(JSON, nullable=True)
    body = Column(Text, default="")
    scriptIds = Column(JSON, default=list)
    externalScriptIds = Column(JSON, default=list)
    acceptingSubmissions = Column(Boolean, default=False, nullable=False)
    status = Column(String, default="draft", index=True)  # draft | published
    sortOrder = Column(Integer, default=0)
    createdAt = Column(BigInteger, default=lambda: int(time.time() * 1000), index=True)
    updatedAt = Column(BigInteger, default=lambda: int(time.time() * 1000), index=True)
    publishedAt = Column(BigInteger, nullable=True)


class ExternalAuthor(Base):
    """Immutable external author identity.

    canonicalKey is an import/grouping hint. Relationships use id, so changing
    a public display name can never detach scripts, supplements, or reviews.
    """

    __tablename__ = "external_authors"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    canonicalKey = Column(String, nullable=False, index=True)
    linkedPersonaId = Column(String, ForeignKey("personas.id", ondelete="SET NULL"), nullable=True, index=True)
    displayName = Column(Text, nullable=False, default="")
    bio = Column(Text, nullable=False, default="")
    profileUrl = Column(Text, nullable=False, default="")
    avatarUrl = Column(Text, nullable=False, default="")
    isHidden = Column(Boolean, nullable=False, default=False, index=True)
    createdAt = Column(BigInteger, nullable=False, default=lambda: int(time.time() * 1000))
    updatedAt = Column(BigInteger, nullable=False, default=lambda: int(time.time() * 1000))


class ExternalPublicScript(Base):
    """A public-script entry curated from an external source.

    The source page remains authoritative for the full work.  We only keep a
    metadata snapshot (plus optional admin overrides) so the public gallery can
    present the work without copying its content into this service.
    """

    __tablename__ = "external_public_scripts"

    id = Column(String, primary_key=True, index=True)
    ownerId = Column(String, index=True, nullable=True)
    sourceUrl = Column(Text, nullable=False, unique=True, index=True)
    canonicalUrl = Column(Text, default="", index=True)
    sourceDomain = Column(String, default="")
    sourceName = Column(String, default="")
    externalAuthorId = Column(String, ForeignKey("external_authors.id", ondelete="SET NULL"), nullable=True, index=True)
    # Stable grouping key for the external author.  Public identity joins must
    # use this key (and ExternalAuthorPageProfile.linkedPersonaId), never a
    # display-name comparison performed by a page component.
    authorKey = Column(String, default="", index=True)
    authorName = Column(String, default="")
    authorBio = Column(Text, default="")
    authorUrl = Column(Text, default="")
    authorAvatarUrl = Column(Text, default="")
    organizationName = Column(String, default="")
    organizationBio = Column(Text, default="")
    organizationUrl = Column(Text, default="")
    organizationAvatarUrl = Column(Text, default="")

    remoteTitle = Column(Text, default="")
    remoteSummary = Column(Text, default="")
    remoteCoverUrl = Column(Text, default="")
    titleOverride = Column(Text, default="")
    summaryOverride = Column(Text, default="")
    coverUrlOverride = Column(Text, default="")

    # External series are metadata-only groupings.  Unlike internal series,
    # they do not own or copy the source content; the series page simply links
    # each chapter back to its original public URL.
    seriesName = Column(String, default="", index=True)
    seriesOrder = Column(Integer, nullable=True)
    demoLinks = Column(Text, nullable=True)  # JSON array of externally hosted samples

    categories = Column(JSON, default=list)
    views = Column(Integer, default=0)
    status = Column(String, default="draft", index=True)
    sortOrder = Column(Float, default=0.0, index=True)
    lastFetchedAt = Column(BigInteger, nullable=True)
    lastFetchError = Column(Text, default="")
    sourceCreatedAt = Column(BigInteger, nullable=True, index=True)
    sourceModifiedAt = Column(BigInteger, nullable=True)
    createdAt = Column(BigInteger, default=lambda: int(time.time() * 1000), index=True)
    mountedAt = Column(BigInteger, nullable=True, index=True)
    updatedAt = Column(BigInteger, default=lambda: int(time.time() * 1000), index=True)


class ExternalAuthorPageProfile(Base):
    """Admin-managed public profile overrides for grouped external authors."""

    __tablename__ = "external_author_page_profiles"

    authorKey = Column(String, primary_key=True, index=True)
    linkedPersonaId = Column(String, ForeignKey("personas.id", ondelete="SET NULL"), nullable=True, index=True)
    displayName = Column(Text, nullable=False, default="")
    bio = Column(Text, nullable=False, default="")
    profileUrl = Column(Text, nullable=False, default="")
    avatarUrl = Column(Text, nullable=False, default="")
    isHidden = Column(Boolean, nullable=False, default=False, index=True)
    createdAt = Column(BigInteger, nullable=False, default=lambda: int(time.time() * 1000))
    updatedAt = Column(BigInteger, nullable=False, default=lambda: int(time.time() * 1000))


class ExternalAuthorPageSupplement(Base):
    """Approved public profile supplements and contributor credits for external authors."""

    __tablename__ = "external_author_page_supplements"

    authorKey = Column(String, primary_key=True, index=True)
    profile = Column(JSON, nullable=False, default=dict)
    contributors = Column(JSON, nullable=False, default=list)
    updatedAt = Column(BigInteger, nullable=False, default=lambda: int(time.time() * 1000))


class ExternalAuthorProfileSubmission(Base):
    """Public proposals to supplement an external scriptwriter profile."""

    __tablename__ = "external_author_profile_submissions"

    id = Column(String, primary_key=True, index=True)
    authorKey = Column(String, nullable=False, index=True)
    authorName = Column(String, nullable=False, default="")
    submitterName = Column(String, nullable=False, default="")
    contactEmail = Column(String, nullable=False, default="")
    profile = Column(JSON, nullable=False, default=dict)
    acceptedFields = Column(JSON, nullable=False, default=list)
    status = Column(String, nullable=False, default="pending", index=True)
    reviewNote = Column(Text, nullable=False, default="")
    reviewedAt = Column(BigInteger, nullable=True)
    reviewedBy = Column(String, nullable=True)
    createdAt = Column(BigInteger, nullable=False, default=lambda: int(time.time() * 1000), index=True)
