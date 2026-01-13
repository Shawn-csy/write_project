from sqlalchemy import Column, Integer, String, Text, Float, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base
import time

class Script(Base):
    __tablename__ = "scripts"

    id = Column(String, primary_key=True, index=True)
    ownerId = Column(String, index=True)
    title = Column(String)
    content = Column(String, default="")
    createdAt = Column(Integer, default=lambda: int(time.time() * 1000))
    lastModified = Column(Integer, default=lambda: int(time.time() * 1000))
    isPublic = Column(Integer, default=0, index=True) # 0 or 1
    type = Column(String, default="script") # 'script' or 'folder'
    folder = Column(String, default="/", index=True)
    sortOrder = Column(Float, default=0.0)
    markerThemeId = Column(String, nullable=True)

    # Relationships
    tags = relationship("Tag", secondary="script_tags", back_populates="scripts")

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    handle = Column(String, unique=True)
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
    owner = relationship("User", backref="marker_themes")
