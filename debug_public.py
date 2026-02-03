
import sys
import os
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
import uuid

# Add server directory to path
sys.path.append(os.path.join(os.getcwd(), 'server'))
# Force DB PATH
os.environ["DB_PATH"] = os.path.abspath("server/data/scripts.db")

try:
    from database import SQLALCHEMY_DATABASE_URL
    import models
    import crud
    from sqlalchemy import orm

    # Setup connection
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    SessionLocal = orm.sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    # 1. Get a public script ID first
    first_script = db.query(models.Script).filter(models.Script.isPublic == 1).first()
    if not first_script:
        print("No public scripts found to test.")
        # Create one for testing?
        print("Creating dummy public script...")
        dummy = models.Script(
            id=str(uuid.uuid4()),
            title="Debug Script",
            isPublic=1,
            ownerId="test" # Assuming test user doesn't exist might be fine for this check if foreign key constraint doesn't explode immediately (sqlite default usually ok unless PRAGMA on)
        )
        db.add(dummy)
        db.commit()
        script_id = dummy.id
    else:
        script_id = first_script.id
        
    print(f"Attempting to query public script ID: {script_id}")
    
    # Replicate main.py logic
    try:
        script = db.query(models.Script).options(
            orm.joinedload(models.Script.owner),
            orm.joinedload(models.Script.tags),
            orm.joinedload(models.Script.organization),
            orm.joinedload(models.Script.persona)
        ).filter(models.Script.id == script_id, models.Script.isPublic == 1).first()
        
        if script:
            print(f"Success! Found script: {script.title}")
            print(f" - Owner: {script.owner.displayName if script.owner else 'None'}")
            print(f" - Org: {script.organization.name if script.organization else 'None'}")
            print(f" - Persona: {script.persona.displayName if script.persona else 'None'}")
        else:
            print("Script not found (or not public).")
             
    except Exception as e:
        print("CRASH during Query:")
        import traceback
        traceback.print_exc()

except Exception as e:
    print(f"Setup Error: {e}")
    import traceback
    traceback.print_exc()
