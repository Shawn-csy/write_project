
import sys
import os
from sqlalchemy.orm import Session

# Add server directory to path
sys.path.append(os.path.join(os.getcwd(), 'server'))

try:
    from database import SessionLocal, engine
    import models
    import crud
    from sqlalchemy import text
    
    db = SessionLocal()
    
    script_id = "96bb3246-e82b-4f94-b86c-05dedaf997c7"
    print(f"Attempting to fetch script {script_id}...")
    
    # Try raw query first to check data
    raw = db.execute(text("SELECT * FROM scripts WHERE id = :id"), {"id": script_id}).fetchone()
    if raw:
        print(f"Raw script found: {raw._mapping}")
    else:
        print("Script not found in DB via raw SQL")
        
    # Try CRUD with relationship loading
    try:
        from main import read_public_script
        # We can't call controller directly easily due to Depends, but we can mimic the query
        from sqlalchemy import orm
        
        script = db.query(models.Script).options(
            orm.joinedload(models.Script.owner),
            orm.joinedload(models.Script.tags)
        ).filter(models.Script.id == script_id).first()
        
        print(f"ORM fetch result: {script}")
        if script:
            print(f"Owner: {script.owner}")
            print(f"Tags: {script.tags}")
            
    except Exception as e:
        print("Error during ORM fetch:")
        import traceback
        traceback.print_exc()
        
finally:
    if 'db' in locals():
        db.close()
