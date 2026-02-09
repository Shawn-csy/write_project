
import sys
import os
from sqlalchemy import create_engine, text

# Add server directory to path
sys.path.append(os.path.join(os.getcwd(), 'server'))

# Force DB PATH
os.environ["DB_PATH"] = os.path.abspath("server/data/scripts.db")

try:
    from database import SQLALCHEMY_DATABASE_URL
    print(f"Connecting to {SQLALCHEMY_DATABASE_URL}")
    
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    with engine.connect() as conn:
        print("Checking scripts table columns...")
        result = conn.execute(text("PRAGMA table_info(scripts)"))
        columns = [row.name for row in result]
        print(f"Columns: {columns}")
        
        missing = []
        for col in ['organizationId', 'personaId', 'ownerId']:
            if col not in columns:
                missing.append(col)
        
        if missing:
            print(f"MISSING COLUMNS: {missing}")
            # Try to add them
            for col in missing:
                print(f"Adding column {col}...")
                conn.execute(text(f"ALTER TABLE scripts ADD COLUMN {col} VARCHAR"))
                conn.commit()
            print("Migration applied.")
        else:
            print("All expected columns present.")
            
        # Check User columns for personas
        print("Checking users table columns...")
        result = conn.execute(text("PRAGMA table_info(users)"))
        user_cols = [row.name for row in result]
        if 'organizationId' not in user_cols:
             print("Adding organizationId to users...")
             conn.execute(text("ALTER TABLE users ADD COLUMN organizationId VARCHAR"))
             conn.commit()
             
        # Check if tables exist
        print("Checking tables...")
        result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
        tables = [row[0] for row in result]
        print(f"Tables: {tables}")
        
        if 'personas' not in tables:
            print("Creating personas table...")
            # We can use models.Base.metadata.create_all(engine)
            import models
            from database import Base
            Base.metadata.create_all(engine)
            print("Tables created.")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
