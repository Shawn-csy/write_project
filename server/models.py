from sqlalchemy import Column, Integer, String, Text, Float, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base
import time

class Script(Base):
    __tablename__ = "scripts"

    id = Column(String, primary_key=True, index=True)
    ownerId = Column(String, ForeignKey("users.id"), index=True)
    title = Column(String)
    content = Column(String, default="")
    createdAt = Column(Integer, default=lambda: int(time.time() * 1000))
    lastModified = Column(Integer, default=lambda: int(time.time() * 1000))
    author = Column(String, default="")
    draftDate = Column(String, default="")
    isPublic = Column(Integer, default=0, index=True) # 0 or 1
    type = Column(String, default="script") # 'script' or 'folder'
    folder = Column(String, default="/", index=True)
    sortOrder = Column(Float, default=0.0)
    markerThemeId = Column(String, ForeignKey("marker_themes.id"), nullable=True)
    
    # Relationships
    tags = relationship("Tag", secondary="script_tags", back_populates="scripts")
    markerTheme = relationship("MarkerTheme", lazy="joined")
    owner = relationship("User", backref="scripts", foreign_keys=[ownerId])

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
    defaultLicense = Column(String, default="")
    defaultLicenseUrl = Column(String, default="")
    defaultLicenseTerms = Column(JSON, default=list)
    createdAt = Column(Integer, default=lambda: int(time.time() * 1000))
    updatedAt = Column(Integer, default=lambda: int(time.time() * 1000))
    
    owner = relationship("User", back_populates="personas")

Script.personaId = Column(String, ForeignKey("personas.id"), nullable=True)
Script.persona = relationship("Persona", lazy="joined")
Script.disableCopy = Column(Boolean, default=False)  # Content protection: disable copy on public page
