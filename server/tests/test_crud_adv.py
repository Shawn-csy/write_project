import pytest
from sqlalchemy.orm import Session
from sqlalchemy import exc
import models, schemas, crud
import uuid
import time
import json

def test_update_script_is_public(db_session: Session):
    # Test line 96: isPublic toggle
    script = crud.create_script(db_session, schemas.ScriptCreate(title="PublicTest", type="script"), "user1")
    updated = crud.update_script(db_session, script.id, schemas.ScriptUpdate(isPublic=True), "user1")
    assert updated.isPublic == 1
    updated = crud.update_script(db_session, script.id, schemas.ScriptUpdate(isPublic=False), "user1")
    assert updated.isPublic == 0

def test_delete_script_not_found(db_session: Session):
    # Test line 108
    assert crud.delete_script(db_session, "nonexistent", "user1") is False

def test_reorder_scripts_exception(db_session: Session, monkeypatch):
    # Test lines 125-128: Mock update to fail
    from sqlalchemy.orm.query import Query
    def mock_update(*args, **kwargs):
        raise exc.SQLAlchemyError("Forced failure")
    
    monkeypatch.setattr(Query, "update", mock_update)
    
    updates = [schemas.ScriptReorderItem(id="1", sortOrder=1.0)]
    assert crud.reorder_scripts(db_session, updates, "user1") is False

def test_create_tag_exception(db_session: Session, monkeypatch):
    # Test lines 142-144
    def mock_commit(*args, **kwargs):
        raise exc.SQLAlchemyError("Forced failure")
    monkeypatch.setattr(db_session, "commit", mock_commit)
    
    tag = schemas.TagCreate(name="FailTag", color="#000")
    assert crud.create_tag(db_session, tag, "user1") is None

def test_add_tag_to_script_exception(db_session: Session, monkeypatch):
    # Test lines 155-156
    def mock_commit(*args, **kwargs):
        raise exc.SQLAlchemyError("Forced failure")
    monkeypatch.setattr(db_session, "commit", mock_commit)
    
    # Just call it, it swallows exception
    crud.add_tag_to_script(db_session, "script1", 1)

def test_update_user_logic(db_session: Session):
    # Test lines 166-190
    user_id = "test-user-" + str(uuid.uuid4())
    # 1. Create with defaults (line 169-170)
    user_update = schemas.UserCreate(displayName="Test User", settings={"theme": "dark"})
    user = crud.update_user(db_session, user_id, user_update)
    assert user.id == user_id
    assert json.loads(user.settings)["theme"] == "dark"
    
    # 2. Update existing (line 177)
    user_update_2 = schemas.UserCreate(displayName="New Name")
    user = crud.update_user(db_session, user_id, user_update_2)
    assert user.displayName == "New Name"

def test_get_scripts_logic(db_session: Session):
    # Test lines 29-43
    user1 = "user1"
    crud.create_script(db_session, schemas.ScriptCreate(title="S1", type="script", content="Hello"), user1)
    scripts = crud.get_scripts(db_session, user1)
    assert len(scripts) == 1
    assert scripts[0].contentLength == 5

def test_search_scripts_logic(db_session: Session):
    # Test lines 225-230
    user1 = "user1"
    crud.create_script(db_session, schemas.ScriptCreate(title="UniqueTitle", content="Some text"), user1)
    results = crud.search_scripts(db_session, "UniqueTitle", user1)
    assert len(results) == 1
    
    results = crud.search_scripts(db_session, "text", user1)
    assert len(results) == 1

def test_tag_maintenance(db_session: Session):
    # Test lines 132-160
    user1 = "user1"
    tag = crud.create_tag(db_session, schemas.TagCreate(name="T1", color="red"), user1)
    assert len(crud.get_tags(db_session, user1)) == 1
    
    script = crud.create_script(db_session, schemas.ScriptCreate(title="Tagged"), user1)
    crud.add_tag_to_script(db_session, script.id, tag.id)
    
    crud.remove_tag_from_script(db_session, script.id, tag.id)
    crud.delete_tag(db_session, tag.id, user1)
    assert len(crud.get_tags(db_session, user1)) == 0

def test_update_user_exception(db_session: Session, monkeypatch):
    # Test lines 182-189
    def mock_commit(*args, **kwargs):
        raise exc.SQLAlchemyError("Forced user update failure")
    monkeypatch.setattr(db_session, "commit", mock_commit)
    
    user_update = schemas.UserCreate(email="error@example.com")
    with pytest.raises(exc.SQLAlchemyError):
        crud.update_user(db_session, "user1", user_update)

def test_get_public_scripts_feed_logic(db_session: Session):
    # Test lines 205-223: Public Feed logic
    user1 = "user1"
    # Create a public folder
    pub_folder = crud.create_script(db_session, schemas.ScriptCreate(title="PubFolder", type="folder", isPublic=True), user1)
    
    # Create a public script inside that folder
    inner_script = crud.create_script(db_session, schemas.ScriptCreate(title="Inner", type="script", isPublic=True, folder="/PubFolder"), user1)
    
    # Create a public script outside (at root)
    outer_script = crud.create_script(db_session, schemas.ScriptCreate(title="Outer", type="script", isPublic=True, folder="/"), user1)
    
    # Feed should contain PubFolder and Outer, but NOT Inner
    feed = crud.get_public_scripts(db_session)
    titles = [s.title for s in feed]
    assert "PubFolder" in titles
    assert "Outer" in titles
    assert "Inner" not in titles

def test_get_public_scripts_browsing_folder(db_session: Session):
    # Test lines 196-199
    user1 = "user1"
    crud.create_script(db_session, schemas.ScriptCreate(title="InFolder", type="script", isPublic=True, folder="/BrowseMe"), user1)
    
    results = crud.get_public_scripts(db_session, ownerId=user1, folder="/BrowseMe")
    assert len(results) == 1
    assert results[0].title == "InFolder"

def test_theme_crud(db_session: Session):
    # Test lines 237-274
    user1 = "user1"
    # Create
    theme_in = schemas.MarkerThemeCreate(name="MyTheme", configs="[]", isPublic=True, description="desc")
    theme = crud.create_theme(db_session, theme_in, user1)
    assert theme.name == "MyTheme"
    
    # Update
    updated = crud.update_theme(db_session, theme.id, schemas.MarkerThemeUpdate(name="NewName"), user1)
    assert updated.name == "NewName"
    
    # Update not found
    assert crud.update_theme(db_session, "missing", schemas.MarkerThemeUpdate(name="X"), user1) is None
    
    # Public themes
    public_themes = crud.get_public_themes(db_session)
    assert any(t.id == theme.id for t in public_themes)
    
    # User themes
    user_themes = crud.get_user_themes(db_session, user1)
    assert any(t.id == theme.id for t in user_themes)
    
    # Delete (with reference cleanup)
    script = crud.create_script(db_session, schemas.ScriptCreate(title="Themed", markerThemeId=theme.id), user1)
    crud.delete_theme(db_session, theme.id, user1)
    
    db_session.refresh(script)
    assert script.markerThemeId is None
    
    # Theme should be gone
    assert db_session.query(models.MarkerTheme).filter(models.MarkerTheme.id == theme.id).first() is None

def test_script_folder_cascades(db_session: Session):
    user1 = "user1"
    # 1. Update script not found (line 81)
    assert crud.update_script(db_session, "missing", schemas.ScriptUpdate(title="X"), user1) is None
    
    # 2. Folder rename cascade (lines 85-91)
    folder = crud.create_script(db_session, schemas.ScriptCreate(title="Old", type="folder", folder="/"), user1)
    child = crud.create_script(db_session, schemas.ScriptCreate(title="Child", type="script", folder="/Old"), user1)
    grandchild = crud.create_script(db_session, schemas.ScriptCreate(title="GC", type="script", folder="/Old/Sub"), user1)
    
    crud.update_script(db_session, folder.id, schemas.ScriptUpdate(title="New"), user1)
    db_session.refresh(child)
    db_session.refresh(grandchild)
    assert child.folder == "/New"
    assert grandchild.folder == "/New/Sub"
    
    # 3. Folder delete cascade (lines 111-112)
    child_id = child.id
    grandchild_id = grandchild.id
    crud.delete_script(db_session, folder.id, user1)
    
    from models import Script
    assert db_session.query(Script).filter(Script.id == child_id).first() is None
    assert db_session.query(Script).filter(Script.id == grandchild_id).first() is None
