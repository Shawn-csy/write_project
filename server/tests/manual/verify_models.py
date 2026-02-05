
import sys
import os

# Add server directory to path
sys.path.append(os.path.join(os.getcwd(), 'server'))

try:
    from database import Base, engine
    import models
    print("Import successful")
    
    # Try creating tables (will fail if schema invalid)
    # or just configure mapper
    from sqlalchemy.orm import configure_mappers
    configure_mappers()
    print("Mapper configuration successful")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
