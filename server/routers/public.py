from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from sqlalchemy import orm
from sqlalchemy.orm import Session
import json
import crud
import schemas
import models
from dependencies import get_db

router = APIRouter(prefix="/api", tags=["public"])

# Helper to convert User to PersonaPublic
def user_to_persona_public(user: models.User, db: Session) -> schemas.PersonaPublic:
    # Get Organization if any
    orgs = []
    if user.organizationId:
        org = db.query(models.Organization).filter(models.Organization.id == user.organizationId).first()
        if org:
            if isinstance(org.tags, str):
                try:
                    org.tags = json.loads(org.tags)
                except Exception:
                    org.tags = []
            orgs.append(org)
    
    return schemas.PersonaPublic(
        id=user.id,
        ownerId=user.id,
        displayName=user.displayName or user.handle or "Anonymous",
        bio=user.bio or "",
        avatar=user.avatar or "",
        website=user.website or "",
        organizationIds=[user.organizationId] if user.organizationId else [],
        tags=[], # Users don't have tags
        createdAt=user.createdAt,
        updatedAt=user.lastLogin, # Use lastLogin as proxy for update
        organizations=orgs
    )

@router.get("/public-scripts")
def read_public_scripts(
    ownerId: Optional[str] = None,
    folder: Optional[str] = None,
    personaId: Optional[str] = None,
    organizationId: Optional[str] = None,
    db: Session = Depends(get_db)
):
    return crud.get_public_scripts(
        db,
        ownerId=ownerId,
        folder=folder,
        personaId=personaId,
        organizationId=organizationId
    )

@router.get("/public-scripts/{script_id}", response_model=schemas.Script)
def read_public_script(script_id: str, db: Session = Depends(get_db)):
    script = db.query(models.Script).options(
        orm.joinedload(models.Script.owner),
        orm.joinedload(models.Script.tags),
        orm.joinedload(models.Script.organization),
        orm.joinedload(models.Script.persona)
    ).filter(models.Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    
    if not script.isPublic:
        # Check inheritance: Is parent folder public?
        if script.folder != "/":
             parts = script.folder.strip("/").split("/")
             folder_title = parts[-1]
             folder_parent = "/" + "/".join(parts[:-1])
             if folder_parent != "/" and not folder_parent.startswith("/"):
                 folder_parent = "/" + folder_parent
                 
             folder_script = db.query(models.Script).filter(
                 models.Script.ownerId == script.ownerId,
                 models.Script.title == folder_title,
                 models.Script.folder == folder_parent,
                 models.Script.type == 'folder',
                 models.Script.isPublic == 1
             ).first()
             
             if not folder_script:
                   raise HTTPException(status_code=404, detail="Script is private")
        else:
             raise HTTPException(status_code=404, detail="Script is private")
         

    # Ensure nested JSON fields are parsed (imported from crud, or manually handled if crud not exposed)
    # Since we are in routers, we can't easily import private _ensure_list from crud if not exported.
    # But we can assume crud.py/schemas.py handles it? No, raw model access.
    # Let's duplicate the simple parsing logic or move it to a util.
    # For now, inline simple check.
    
    if script.persona:
        if isinstance(script.persona.tags, str):
            try:
                script.persona.tags = json.loads(script.persona.tags)
            except:
                script.persona.tags = []
        # Double encoded check
        if isinstance(script.persona.tags, str):
             try: script.persona.tags = json.loads(script.persona.tags)
             except: pass
             
        if isinstance(script.persona.organizationIds, str):
            try:
                script.persona.organizationIds = json.loads(script.persona.organizationIds)
            except:
                script.persona.organizationIds = []

        if isinstance(script.persona.defaultLicenseTerms, str):
             try:
                 script.persona.defaultLicenseTerms = json.loads(script.persona.defaultLicenseTerms)
             except:
                 script.persona.defaultLicenseTerms = []
             # Double check
             if isinstance(script.persona.defaultLicenseTerms, str):
                  try: script.persona.defaultLicenseTerms = json.loads(script.persona.defaultLicenseTerms)
                  except: pass
             
    if script.organization:
        if isinstance(script.organization.tags, str):
            try:
                script.organization.tags = json.loads(script.organization.tags)
            except:
                script.organization.tags = []
    
    return script

@router.get("/public-personas/{persona_id}", response_model=schemas.PersonaPublic)
def get_public_persona(persona_id: str, db: Session = Depends(get_db)):
    # 1. Try Persona
    persona = db.query(models.Persona).filter(models.Persona.id == persona_id).first()
    if persona:
        if isinstance(persona.organizationIds, str):
            try:
                persona.organizationIds = json.loads(persona.organizationIds)
            except Exception:
                persona.organizationIds = []
        if isinstance(persona.tags, str):
            try:
                persona.tags = json.loads(persona.tags)
            except Exception:
                persona.tags = []
        if isinstance(persona.links, str):
            try:
                persona.links = json.loads(persona.links)
            except Exception:
                persona.links = []
        orgs = []
        if persona.organizationIds:
            orgs = db.query(models.Organization).filter(models.Organization.id.in_(persona.organizationIds)).all()
            for o in orgs:
                if isinstance(o.tags, str):
                    try:
                        o.tags = json.loads(o.tags)
                    except Exception:
                        o.tags = []
        result = schemas.PersonaPublic.model_validate(persona)
        result.organizations = orgs
        return result
    
    # 2. Try User
    user = db.query(models.User).filter(models.User.id == persona_id).first()
    if user:
        return user_to_persona_public(user, db)

    raise HTTPException(status_code=404, detail="Author not found")

@router.get("/public-personas", response_model=List[schemas.PersonaPublic])
def list_public_personas(db: Session = Depends(get_db)):
    # Return personas that have at least one explicitly public script
    persona_ids = [
        row[0]
        for row in db.query(models.Script.personaId)
        .filter(models.Script.isPublic == 1)
        .filter(models.Script.personaId.isnot(None))
        .distinct()
        .all()
    ]

    if not persona_ids:
        return []

    personas = db.query(models.Persona).filter(models.Persona.id.in_(persona_ids)).all()
    results = []

    all_org_ids = set()
    persona_org_map = {}
    for p in personas:
        org_ids = p.organizationIds
        if isinstance(org_ids, str):
            try:
                org_ids = json.loads(org_ids)
            except Exception:
                org_ids = []
        if isinstance(p.tags, str):
            try:
                p.tags = json.loads(p.tags)
            except Exception:
                p.tags = []
        if isinstance(p.links, str):
            try:
                p.links = json.loads(p.links)
            except Exception:
                p.links = []
        org_ids = org_ids or []
        persona_org_map[p.id] = org_ids
        all_org_ids.update(org_ids)

    org_map = {}
    if all_org_ids:
        orgs = db.query(models.Organization).filter(models.Organization.id.in_(list(all_org_ids))).all()
        for o in orgs:
            if isinstance(o.tags, str):
                try:
                    o.tags = json.loads(o.tags)
                except Exception:
                    o.tags = []
        org_map = {o.id: o for o in orgs}

    for p in personas:
        result = schemas.PersonaPublic.model_validate(p)
        result.organizations = [org_map[oid] for oid in persona_org_map.get(p.id, []) if oid in org_map]
        results.append(result)
    return results

@router.get("/public-organizations/{org_id}", response_model=schemas.OrganizationPublic)
def get_public_organization(org_id: str, db: Session = Depends(get_db)):
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    if isinstance(org.tags, str):
        try:
            org.tags = json.loads(org.tags)
        except Exception:
            org.tags = []
    all_personas = db.query(models.Persona).all()
    members = []
    for p in all_personas:
        org_ids = p.organizationIds
        if isinstance(org_ids, str):
            try:
                org_ids = json.loads(org_ids)
            except Exception:
                org_ids = []
        if isinstance(p.tags, str):
            try:
                p.tags = json.loads(p.tags)
            except Exception:
                p.tags = []
        if org_ids and org_id in org_ids:
            members.append(p)
    # Avoid validating org.members (User objects) against Persona schema
    try:
        org.members = []
    except Exception:
        pass
    result = schemas.OrganizationPublic.model_validate(org)
    result.members = members
    return result

@router.get("/public-organizations", response_model=List[schemas.OrganizationPublic])
def list_public_organizations(db: Session = Depends(get_db)):
    # Return all organizations (even without public scripts)
    orgs = db.query(models.Organization).all()
    results = []
    for org in orgs:
        if isinstance(org.tags, str):
            try:
                org.tags = json.loads(org.tags)
            except Exception:
                org.tags = []
        try:
            org.members = []
        except Exception:
            pass
        result = schemas.OrganizationPublic.model_validate(org)
        result.members = []
        results.append(result)
    return results

@router.get("/themes/public", response_model=List[schemas.MarkerTheme])
def read_public_themes(db: Session = Depends(get_db)):
    return crud.get_public_themes(db)
