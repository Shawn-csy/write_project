from sqlalchemy import Column, Integer, String, Text, Float, Boolean, ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from database import Base
import time

class Script(Base):
    __tablename__ = "scripts"

    id = Column(String, primary_key=True, index=True)
    ownerId = Column(String, ForeignKey("users.id"), index=True)
    title = Column(String)
    content = Column(String, default="")
    customMetadata = Column(JSON, default=list)
    createdAt = Column(Integer, default=lambda: int(time.time() * 1000))
    lastModified = Column(Integer, default=lambda: int(time.time() * 1000))
    author = Column(String, default="")
    draftDate = Column(String, default="")
    isPublic = Column(Integer, default=0, index=True) # 0 or 1
    type = Column(String, default="script") # 'script' or 'folder'
    folder = Column(String, default="/", index=True)
    sortOrder = Column(Float, default=0.0)
    markerThemeId = Column(String, ForeignKey("marker_themes.id"), nullable=True)
    seriesId = Column(String, ForeignKey("series.id"), nullable=True, index=True)
    seriesOrder = Column(Integer, nullable=True)
    
    # Relationships
    tags = relationship("Tag", secondary="script_tags", back_populates="scripts")
    markerTheme = relationship("MarkerTheme", lazy="joined")
    owner = relationship("User", backref="scripts", foreign_keys=[ownerId])
    series = relationship("Series", foreign_keys=[seriesId], lazy="joined")

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    handle = Column(String, unique=True)
    email = Column(String, index=True) # Added for search/ownership transfer
    displayName = Column(String)
    avatar = Column(String)
    bio = Column(Text)
    settings = Column(String, default="{}") # JSON string
    createdAt = Column(Integer, default=lambda: int(time.time() * 1000))
    lastLogin = Column(Integer, default=lambda: int(time.time() * 1000))

class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    ownerId = Column(String)
    name = Column(String)
    color = Column(String)

    scripts = relationship("Script", secondary="script_tags", back_populates="tags")

class ScriptTag(Base):
    __tablename__ = "script_tags"

    scriptId = Column(String, ForeignKey("scripts.id", ondelete="CASCADE"), primary_key=True)
    tagId = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True)

class MarkerTheme(Base):
    __tablename__ = "marker_themes"

    id = Column(String, primary_key=True, index=True)
    ownerId = Column(String, ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name = Column(String)
    configs = Column(String, default="[]") # JSON string of configs
    isPublic = Column(Boolean, default=False, index=True)
    description = Column(Text, default="")
    createdAt = Column(Integer, default=lambda: int(time.time() * 1000))
    updatedAt = Column(Integer, default=lambda: int(time.time() * 1000))

    # Relationships
    # Relationships
    owner = relationship("User", backref="marker_themes")

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String, primary_key=True) # UUID
    name = Column(String)
    description = Column(Text, default="")
    website = Column(String, default="")
    logoUrl = Column(String, default="")
    bannerUrl = Column(String, default="")
    tags = Column(JSON, default=list)
    ownerId = Column(String, ForeignKey("users.id"))
    createdAt = Column(Integer, default=lambda: int(time.time() * 1000))
    updatedAt = Column(Integer, default=lambda: int(time.time() * 1000))

    # Relationships
    owner = relationship("User", foreign_keys=[ownerId], backref="owned_organizations")
    members = relationship("User", foreign_keys="User.organizationId", back_populates="organization")

class OrganizationInvite(Base):
    __tablename__ = "organization_invites"

    id = Column(String, primary_key=True, index=True)
    orgId = Column(String, ForeignKey("organizations.id"), index=True)
    invitedUserId = Column(String, ForeignKey("users.id"), index=True)
    inviterUserId = Column(String, ForeignKey("users.id"), index=True)
    status = Column(String, default="pending")  # pending, accepted, declined, revoked
    createdAt = Column(Integer, default=lambda: int(time.time() * 1000))


class OrganizationMembership(Base):
    __tablename__ = "organization_memberships"
    __table_args__ = (
        UniqueConstraint("orgId", "userId", name="uq_org_memberships_org_user"),
    )

    id = Column(String, primary_key=True, index=True)
    orgId = Column(String, ForeignKey("organizations.id"), index=True, nullable=False)
    userId = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    role = Column(String, default="member")
    createdAt = Column(Integer, default=lambda: int(time.time() * 1000))
    updatedAt = Column(Integer, default=lambda: int(time.time() * 1000))


class PersonaOrganizationMembership(Base):
    __tablename__ = "persona_organization_memberships"
    __table_args__ = (
        UniqueConstraint("orgId", "personaId", name="uq_persona_org_memberships_org_persona"),
    )

    id = Column(String, primary_key=True, index=True)
    orgId = Column(String, ForeignKey("organizations.id"), index=True, nullable=False)
    personaId = Column(String, ForeignKey("personas.id"), index=True, nullable=False)
    role = Column(String, default="member")
    createdAt = Column(Integer, default=lambda: int(time.time() * 1000))
    updatedAt = Column(Integer, default=lambda: int(time.time() * 1000))

class OrganizationRequest(Base):
    __tablename__ = "organization_requests"

    id = Column(String, primary_key=True, index=True)
    orgId = Column(String, ForeignKey("organizations.id"), index=True)
    requesterUserId = Column(String, ForeignKey("users.id"), index=True)
    status = Column(String, default="pending")  # pending, accepted, declined, cancelled
    createdAt = Column(Integer, default=lambda: int(time.time() * 1000))

class ScriptLike(Base):
    __tablename__ = "script_likes"

    userId = Column(String, ForeignKey("users.id"), primary_key=True)
    scriptId = Column(String, ForeignKey("scripts.id"), primary_key=True)
    createdAt = Column(Integer, default=lambda: int(time.time() * 1000))

class Series(Base):
    __tablename__ = "series"

    id = Column(String, primary_key=True, index=True)
    ownerId = Column(String, ForeignKey("users.id"), index=True, nullable=False)
    name = Column(String, nullable=False)
    slug = Column(String, index=True, nullable=False)
    summary = Column(Text, default="")
    coverUrl = Column(String, default="")
    createdAt = Column(Integer, default=lambda: int(time.time() * 1000))
    updatedAt = Column(Integer, default=lambda: int(time.time() * 1000))

    owner = relationship("User", foreign_keys=[ownerId], backref="series")

# Extend Script
Script.status = Column(String, default="Private") # Private, Public, Unlisted
Script.coverUrl = Column(String, default="")
Script.views = Column(Integer, default=0)
Script.likes = Column(Integer, default=0)
Script.organizationId = Column(String, ForeignKey("organizations.id"), nullable=True)
Script.organization = relationship("Organization", foreign_keys=[Script.organizationId], lazy="joined")

# Extend User
User.website = Column(String, default="")
User.organizationId = Column(String, ForeignKey("organizations.id"), nullable=True)
User.organization = relationship("Organization", foreign_keys=[User.organizationId], back_populates="members")
User.personas = relationship("Persona", back_populates="owner")

class Persona(Base):
    __tablename__ = "personas"
    
    id = Column(String, primary_key=True)
    ownerId = Column(String, ForeignKey("users.id"))
    displayName = Column(String)
    avatar = Column(String, default="")
    bannerUrl = Column(String, default="")
    bio = Column(Text, default="")
    website = Column(String, default="")
    links = Column(JSON, default=list)
    organizationIds = Column(JSON, default=list)
    tags = Column(JSON, default=list)
    defaultLicenseCommercial = Column(String, default="")
    defaultLicenseDerivative = Column(String, default="")
    defaultLicenseNotify = Column(String, default="")
    defaultLicenseSpecialTerms = Column(JSON, default=list)
    createdAt = Column(Integer, default=lambda: int(time.time() * 1000))
    updatedAt = Column(Integer, default=lambda: int(time.time() * 1000))
    
    owner = relationship("User", back_populates="personas")

Script.personaId = Column(String, ForeignKey("personas.id"), nullable=True)
Script.persona = relationship("Persona", lazy="joined")
Script.disableCopy = Column(Boolean, default=False)  # Content protection: disable copy on public page
Script.licenseCommercial = Column(String, default="")
Script.licenseDerivative = Column(String, default="")
Script.licenseNotify = Column(String, default="")


class PublicTermsAcceptance(Base):
    __tablename__ = "public_terms_acceptances"

    id = Column(String, primary_key=True, index=True)
    termsKey = Column(String, index=True, default="public_reader_terms")
    termsVersion = Column(String, index=True)
    scriptId = Column(String, ForeignKey("scripts.id"), nullable=True, index=True)
    userId = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    visitorId = Column(String, nullable=True, index=True)
    acceptedAt = Column(Integer, default=lambda: int(time.time() * 1000), index=True)
    ipAddress = Column(String, default="")
    forwardedFor = Column(String, default="")
    userAgent = Column(Text, default="")
    acceptLanguage = Column(String, default="")
    referer = Column(String, default="")
    origin = Column(String, default="")
    host = Column(String, default="")
    clientMeta = Column(JSON, default=dict)
    headerSnapshot = Column(JSON, default=dict)


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(String, primary_key=True, index=True)
    userId = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    email = Column(String, nullable=True, index=True)
    createdBy = Column(String, ForeignKey("users.id"), nullable=True)
    createdAt = Column(Integer, default=lambda: int(time.time() * 1000), index=True)


class SiteSetting(Base):
    __tablename__ = "site_settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(Text, default="")
    updatedBy = Column(String, ForeignKey("users.id"), nullable=True)
    updatedAt = Column(Integer, default=lambda: int(time.time() * 1000), index=True)
