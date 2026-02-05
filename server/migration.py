from sqlalchemy import text
from database import engine

def run_migrations():
    try:
        with engine.connect() as conn:
            # Check existing columns
            result = conn.execute(text("PRAGMA table_info(scripts)"))
            columns = [row.name for row in result.fetchall()]
            
            if 'type' not in columns:
                print("Migrating: Adding 'type' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN type TEXT DEFAULT 'script'"))
            
            if 'folder' not in columns:
                print("Migrating: Adding 'folder' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN folder TEXT DEFAULT '/'"))
                
            if 'sortOrder' not in columns:
                print("Migrating: Adding 'sortOrder' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN sortOrder REAL DEFAULT 0.0"))

            if 'markerThemeId' not in columns:
                print("Migrating: Adding 'markerThemeId' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN markerThemeId TEXT DEFAULT NULL"))

            if 'author' not in columns:
                print("Migrating: Adding 'author' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN author TEXT DEFAULT ''"))

            if 'draftDate' not in columns:
                print("Migrating: Adding 'draftDate' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN draftDate TEXT DEFAULT ''"))

            if 'status' not in columns:
                print("Migrating: Adding 'status' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN status TEXT DEFAULT 'Private'"))
            
            if 'coverUrl' not in columns:
                print("Migrating: Adding 'coverUrl' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN coverUrl TEXT DEFAULT ''"))
            
            if 'views' not in columns:
                print("Migrating: Adding 'views' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN views INTEGER DEFAULT 0"))

            if 'likes' not in columns:
                print("Migrating: Adding 'likes' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN likes INTEGER DEFAULT 0"))

            if 'organizationId' not in columns:
                print("Migrating: Adding 'organizationId' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN organizationId TEXT DEFAULT NULL"))

            if 'disableCopy' not in columns:
                print("Migrating: Adding 'disableCopy' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN disableCopy BOOLEAN DEFAULT 0"))
            
            # Check users columns
            result_users = conn.execute(text("PRAGMA table_info(users)"))
            user_columns = [row.name for row in result_users.fetchall()]

            if 'website' not in user_columns:
                print("Migrating: Adding 'website' column to users")
                conn.execute(text("ALTER TABLE users ADD COLUMN website TEXT DEFAULT ''"))
            
            if 'organizationId' not in user_columns:
                print("Migrating: Adding 'organizationId' column to users")
                conn.execute(text("ALTER TABLE users ADD COLUMN organizationId TEXT DEFAULT NULL"))

            # Personas columns
            result_personas = conn.execute(text("PRAGMA table_info(personas)"))
            persona_columns = [row.name for row in result_personas.fetchall()]

            if 'website' not in persona_columns:
                print("Migrating: Adding 'website' column to personas")
                conn.execute(text("ALTER TABLE personas ADD COLUMN website TEXT DEFAULT ''"))

            if 'organizationIds' not in persona_columns:
                print("Migrating: Adding 'organizationIds' column to personas")
                conn.execute(text("ALTER TABLE personas ADD COLUMN organizationIds TEXT DEFAULT '[]'"))

            if 'tags' not in persona_columns:
                print("Migrating: Adding 'tags' column to personas")
                conn.execute(text("ALTER TABLE personas ADD COLUMN tags TEXT DEFAULT '[]'"))

            if 'defaultLicense' not in persona_columns:
                print("Migrating: Adding 'defaultLicense' column to personas")
                conn.execute(text("ALTER TABLE personas ADD COLUMN defaultLicense TEXT DEFAULT ''"))

            if 'defaultLicenseUrl' not in persona_columns:
                print("Migrating: Adding 'defaultLicenseUrl' column to personas")
                conn.execute(text("ALTER TABLE personas ADD COLUMN defaultLicenseUrl TEXT DEFAULT ''"))

            if 'defaultLicenseTerms' not in persona_columns:
                print("Migrating: Adding 'defaultLicenseTerms' column to personas")
                conn.execute(text("ALTER TABLE personas ADD COLUMN defaultLicenseTerms TEXT DEFAULT '[]'"))

            # Organizations columns
            result_orgs = conn.execute(text("PRAGMA table_info(organizations)"))
            org_columns = [row.name for row in result_orgs.fetchall()]

            if 'website' not in org_columns:
                print("Migrating: Adding 'website' column to organizations")
                conn.execute(text("ALTER TABLE organizations ADD COLUMN website TEXT DEFAULT ''"))

            if 'logoUrl' not in org_columns:
                print("Migrating: Adding 'logoUrl' column to organizations")
                conn.execute(text("ALTER TABLE organizations ADD COLUMN logoUrl TEXT DEFAULT ''"))

            if 'tags' not in org_columns:
                print("Migrating: Adding 'tags' column to organizations")
                conn.execute(text("ALTER TABLE organizations ADD COLUMN tags TEXT DEFAULT '[]'"))
            
            conn.commit()
    except Exception as e:
        print(f"Migration failed: {e}")
