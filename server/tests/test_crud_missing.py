import pytest
from sqlalchemy.orm import Session
from sqlalchemy import exc
import models, schemas
import crud_ops as crud
import uuid
import json

def test_ensure_folder_tree(db_session: Session):
    owner = "u1"
    crud.ensure_folder_tree(db_session, owner, "/a/b/c")
    db_session.flush()
    # Verify folders a, b, c are created
    f_a = db_session.query(models.Script).filter_by(title="a", folder="/", type="folder").first()
    assert f_a is not None
    f_b = db_session.query(models.Script).filter_by(title="b", folder="/a", type="folder").first()
    assert f_b is not None
    f_c = db_session.query(models.Script).filter_by(title="c", folder="/a/b", type="folder").first()
    assert f_c is not None

def test_ensure_folders_for_owner(db_session: Session):
    owner = "u1"
    crud.ensure_folders_for_owner(db_session, owner, ["/foo/bar", "/", "/baz"])
    db_session.flush()
    f_bar = db_session.query(models.Script).filter_by(title="bar", folder="/foo").first()
    assert f_bar is not None
    
def test_create_script_existing_folder(db_session: Session):
    owner = "u1"
    # First creation
    f1 = crud.create_script(db_session, schemas.ScriptCreate(title="dup", folder="/", type="folder"), owner)
    # Second creation should return existing
    f2 = crud.create_script(db_session, schemas.ScriptCreate(title="dup", folder="/", type="folder"), owner)
    assert f1.id == f2.id

def test_get_public_scripts_inherited_public(db_session: Session):
    owner = "u1"
    # Create public folder
    f1 = crud.create_script(db_session, schemas.ScriptCreate(title="Pub", folder="/", type="folder", isPublic=True), owner)
    # Create private children inside
    crud.create_script(db_session, schemas.ScriptCreate(title="c1", folder="/Pub", type="script", isPublic=False), owner)
    
    # Getting public scripts inside the folder should return the children because folder is public
    scripts = crud.get_public_scripts(db_session, ownerId=owner, folder="/Pub")
    assert len(scripts) == 1
    assert scripts[0].title == "c1"

def test_get_public_scripts_uninherited(db_session: Session):
    owner = "u1"
    f1 = crud.create_script(db_session, schemas.ScriptCreate(title="Priv", folder="/", type="folder", isPublic=False), owner)
    crud.create_script(db_session, schemas.ScriptCreate(title="c_pub", folder="/Priv", type="script", isPublic=True), owner)
    crud.create_script(db_session, schemas.ScriptCreate(title="c_priv", folder="/Priv", type="script", isPublic=False), owner)
    
    scripts = crud.get_public_scripts(db_session, ownerId=owner, folder="/Priv")
    # Only explicitly public ones
    assert len(scripts) == 1
    assert scripts[0].title == "c_pub"

def test_theme_configs_parsing():
    assert crud._parse_theme_configs(None) == []
    assert crud._parse_theme_configs([{"a": 1}]) == [{"a": 1}]
    assert crud._parse_theme_configs('{"a": 1}') == {"a": 1}
    assert crud._parse_theme_configs('invalid') == []
    
    assert crud._serialize_theme_configs(None) == "[]"
    assert crud._serialize_theme_configs([{"a": 1}]) == '[{"a": 1}]'
    assert crud._serialize_theme_configs('[{"a": 1}]') == '[{"a": 1}]'

def test_update_theme_configs_serialization(db_session: Session):
    owner = "u1"
    theme = crud.create_theme(db_session, schemas.MarkerThemeCreate(name="t", configs="[]"), owner)
    updated = crud.update_theme(db_session, theme.id, schemas.MarkerThemeUpdate(configs=[{"color": "red"}]), owner)
    assert 'red' in updated.configs

def test_transfer_organization_exceptions(db_session: Session, monkeypatch):
    owner = "u1"
    db_session.add(models.User(id=owner))
    db_session.add(models.User(id="new_owner"))
    db_session.commit()
    
    org = crud.create_organization(db_session, schemas.OrganizationCreate(name="Org"), owner)
    
    def mock_commit(*args, **kwargs):
        raise exc.SQLAlchemyError("Forced failure")
    monkeypatch.setattr(db_session, "commit", mock_commit)
    
    assert crud.transfer_organization(db_session, org.id, "new_owner", owner) is False

def test_transfer_organization_admin(db_session: Session):
    owner = "u1"
    new_owner = "new_owner"
    db_session.add(models.User(id=owner))
    db_session.add(models.User(id=new_owner))
    db_session.commit()
    
    org = crud.create_organization(db_session, schemas.OrganizationCreate(name="OrgAdmin"), owner)
    assert crud.transfer_organization_admin(db_session, org.id, new_owner) is True
    
    db_session.refresh(org)
    assert org.ownerId == new_owner
    
def test_transfer_organization_admin_exceptions(db_session: Session, monkeypatch):
    owner = "u1"
    new_owner = "new_owner_fail"
    db_session.add(models.User(id=owner))
    db_session.add(models.User(id=new_owner))
    db_session.commit()
    
    org = crud.create_organization(db_session, schemas.OrganizationCreate(name="OrgAdminFail"), owner)
    
    def mock_commit(*args, **kwargs):
        raise exc.SQLAlchemyError("Forced failure")
    monkeypatch.setattr(db_session, "commit", mock_commit)
    
    assert crud.transfer_organization_admin(db_session, org.id, new_owner) is False


def test_transfer_script_ownership_admin_requires_new_owner(db_session: Session):
    owner = "script_admin_owner"
    db_session.add(models.User(id=owner))
    db_session.commit()
    script = crud.create_script(db_session, schemas.ScriptCreate(title="S1", type="script"), owner)

    ok = crud.transfer_script_ownership_admin(db_session, script.id, "missing-user")
    assert ok is False

    db_session.refresh(script)
    assert script.ownerId == owner

def test_get_user_organizations_exceptions_tags(db_session: Session):
    owner = "u1"
    org = crud.create_organization(db_session, schemas.OrganizationCreate(name="OrgTags"), owner)
    # Manually break tags
    org.tags = "invalid json"
    db_session.commit()
    
    orgs = crud.get_user_organizations(db_session, owner)
    assert orgs[0].tags == []

def test_update_org_tags_none(db_session: Session):
    owner = "u1"
    org = crud.create_organization(db_session, schemas.OrganizationCreate(name="OrgTagsNone"), owner)
    crud.update_organization(db_session, org.id, schemas.OrganizationUpdate(tags=None), owner)
    db_session.refresh(org)
    # tags=None defaults to []
    # If using string JSON fallback, handle it:
    if isinstance(org.tags, str):
        assert json.loads(org.tags) == []
    else:
        assert org.tags == []
