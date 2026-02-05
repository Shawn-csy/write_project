
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
    import schemas
    from sqlalchemy import orm

    # Setup connection
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    SessionLocal = orm.sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    script_id = "e5bbebfb-9d50-4dc6-9cb8-5358821c15a3" # The one that failed
    
    print(f"Fetching script {script_id}...")
    script_db = db.query(models.Script).options(
        orm.joinedload(models.Script.owner),
        orm.joinedload(models.Script.tags),
        orm.joinedload(models.Script.organization),
        orm.joinedload(models.Script.persona)
    ).filter(models.Script.id == script_id).first()
    
    if script_db:
        print("Script fetched from DB.")
        # Test Pydantic Conversion
        try:
            print("Attempting Pydantic validation...")
            pydantic_script = schemas.Script.from_orm(script_db)
            print("Success! Serialized script:")
            # print(pydantic_script.json())
        except Exception as e:
            print("VALIDATION ERROR:")
            print(e)
            import traceback
            traceback.print_exc()
    else:
        print("Script not found in DB.")

except Exception as e:
    print(f"Setup Error: {e}")
    import traceback
    traceback.print_exc()
