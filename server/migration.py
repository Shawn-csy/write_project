import json
import time
import uuid
from sqlalchemy import text
from database import engine
from media_crop import parse_crop_from_url


def _backfill_crop_refs(conn, table: str, url_col: str, crop_col: str):
    rows = conn.execute(text(f'SELECT id, "{url_col}", "{crop_col}" FROM {table}')).fetchall()
    migrated = 0
    for row in rows:
        raw_url = row[1]
        existing_crop = row[2]
        cleaned_url, parsed_crop = parse_crop_from_url(raw_url)
        url_changed = cleaned_url != (raw_url or "")
        if not parsed_crop and not url_changed:
            continue
        if isinstance(existing_crop, str):
            try:
                existing_crop = json.loads(existing_crop)
            except Exception:
                existing_crop = None
        next_crop = existing_crop or parsed_crop
        if cleaned_url == (raw_url or "") and next_crop == existing_crop:
            continue
        if engine.dialect.name == "postgresql":
            conn.execute(text(
                f'UPDATE {table} SET "{url_col}" = :url, "{crop_col}" = CAST(:crop AS JSONB) WHERE id = :id'
            ), {"url": cleaned_url, "crop": json.dumps(next_crop), "id": row[0]})
        else:
            conn.execute(text(
                f'UPDATE {table} SET "{url_col}" = :url, "{crop_col}" = :crop WHERE id = :id'
            ), {"url": cleaned_url, "crop": json.dumps(next_crop), "id": row[0]})
        migrated += 1
    if migrated:
        print(f"Migrating: backfilled {migrated} crop refs for {table}.{url_col}")

def _backfill_content_fields(conn):
    """Backfill synopsis/outline/activityName/activityBannerUrl from customMetadata.

    Only fills the new column when it is NULL (never overwrites existing data).
    Idempotent — safe to re-run.
    """
    FIELDS = [
        ("synopsis",          ["synopsis", "summary", "description", "notes"]),
        ("outline",           ["outline"]),
        ("activityName",      ["activityname", "eventname"]),
        ("activityBannerUrl", ["activitybanner", "eventbanner"]),
    ]
    rows = conn.execute(text(
        "SELECT id, customMetadata, synopsis, outline, activityName, activityBannerUrl FROM scripts"
    )).fetchall()
    migrated = 0
    for row in rows:
        raw_custom = row[1]
        if not raw_custom:
            continue
        if isinstance(raw_custom, str):
            try:
                raw_custom = json.loads(raw_custom)
            except Exception:
                continue
        if not isinstance(raw_custom, list):
            continue
        meta_map = {
            str(item.get("key") or "").strip().lower().replace(" ", ""): str(item.get("value") or "")
            for item in raw_custom if isinstance(item, dict)
        }
        updates = {}
        current_values = {"synopsis": row[2], "outline": row[3], "activityName": row[4], "activityBannerUrl": row[5]}
        for col, keys in FIELDS:
            if current_values[col]:
                continue  # already populated — never overwrite
            for k in keys:
                val = meta_map.get(k, "").strip()
                if val:
                    updates[col] = val
                    break
        if not updates:
            continue
        set_clause = ", ".join(f'"{k}" = :{k}' for k in updates)
        updates["_id"] = row[0]
        conn.execute(text(f"UPDATE scripts SET {set_clause} WHERE id = :_id"), updates)
        migrated += 1
    if migrated:
        print(f"Migrating: backfilled synopsis/outline/activity fields for {migrated} scripts")


def _run_postgres_migrations():
    """Migrate PostgreSQL schema changes (ALTER COLUMN type changes, etc.)."""
    timestamp_columns = [
        ("scripts", "createdAt"),
        ("scripts", "lastModified"),
        ("users", "createdAt"),
        ("users", "lastLogin"),
        ("marker_themes", "createdAt"),
        ("marker_themes", "updatedAt"),
        ("organizations", "createdAt"),
        ("organizations", "updatedAt"),
        ("organization_invites", "createdAt"),
        ("organization_memberships", "createdAt"),
        ("organization_memberships", "updatedAt"),
        ("persona_organization_memberships", "createdAt"),
        ("persona_organization_memberships", "updatedAt"),
        ("organization_requests", "createdAt"),
        ("script_likes", "createdAt"),
        ("series", "createdAt"),
        ("series", "updatedAt"),
        ("personas", "createdAt"),
        ("personas", "updatedAt"),
        ("public_terms_acceptances", "acceptedAt"),
        ("admin_users", "createdAt"),
        ("site_settings", "updatedAt"),
    ]
    with engine.connect() as conn:
        for table, col in timestamp_columns:
            result = conn.execute(text(
                "SELECT data_type FROM information_schema.columns "
                "WHERE table_name = :t AND column_name = :c"
            ), {"t": table, "c": col}).fetchone()
            if result and result[0].lower() == "integer":
                print(f"Migrating: ALTER {table}.{col} INTEGER -> BIGINT")
                conn.execute(text(
                    f'ALTER TABLE "{table}" ALTER COLUMN "{col}" TYPE BIGINT'
                ))

        # Backfill persona_organization_memberships from personas.organizationIds JSON.
        # Required after making PersonaOrganizationMembership the single source of truth.
        # Safe to re-run: INSERT ... ON CONFLICT DO NOTHING.
        now_ms = int(time.time() * 1000)
        persona_rows = conn.execute(text(
            'SELECT id, "organizationIds" FROM personas WHERE "organizationIds" IS NOT NULL'
        )).fetchall()
        inserted = 0
        for row in persona_rows:
            raw = row[1]
            try:
                org_ids = json.loads(raw) if isinstance(raw, str) else (raw or [])
            except Exception:
                org_ids = []
            if not isinstance(org_ids, list):
                org_ids = []
            for org_id in org_ids:
                if not org_id:
                    continue
                conn.execute(text("""
                    INSERT INTO persona_organization_memberships
                        (id, "orgId", "personaId", role, "createdAt", "updatedAt")
                    VALUES (:id, :orgId, :personaId, 'member', :createdAt, :updatedAt)
                    ON CONFLICT ("orgId", "personaId") DO NOTHING
                """), {
                    "id": str(uuid.uuid4()),
                    "orgId": org_id,
                    "personaId": row[0],
                    "createdAt": now_ms,
                    "updatedAt": now_ms,
                })
                inserted += 1
        if inserted:
            print(f"Migrating: backfilled {inserted} persona_organization_membership rows from organizationIds JSON")

        # Migrate script_likes: add id/visitorId columns, drop old composite PK
        likes_cols = {
            row[0] for row in conn.execute(text(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'script_likes'"
            )).fetchall()
        }
        if "id" not in likes_cols:
            print("Migrating: Restructuring script_likes table (add id, visitorId, drop composite PK)")
            # Rename old table
            conn.execute(text('ALTER TABLE script_likes RENAME TO script_likes_old'))
            # Create new table
            conn.execute(text("""
                CREATE TABLE script_likes (
                    id TEXT PRIMARY KEY,
                    "scriptId" TEXT NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
                    "userId" TEXT REFERENCES users(id) ON DELETE CASCADE,
                    "visitorId" TEXT,
                    "createdAt" BIGINT NOT NULL DEFAULT 0,
                    CONSTRAINT uq_script_likes_script_actor UNIQUE ("scriptId", "userId", "visitorId")
                )
            """))
            conn.execute(text('CREATE INDEX ix_script_likes_scriptId ON script_likes ("scriptId")'))
            conn.execute(text('CREATE INDEX ix_script_likes_userId ON script_likes ("userId")'))
            conn.execute(text('CREATE INDEX ix_script_likes_visitorId ON script_likes ("visitorId")'))
            # Migrate existing data
            conn.execute(text("""
                INSERT INTO script_likes (id, "scriptId", "userId", "createdAt")
                SELECT gen_random_uuid()::text, "scriptId", "userId", "createdAt"
                FROM script_likes_old
            """))
            conn.execute(text('DROP TABLE script_likes_old'))

        # Add coverIsAiGenerated column to scripts if missing
        result = conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'scripts' AND column_name = 'coverIsAiGenerated'"
        )).fetchone()
        if not result:
            print("Migrating: Adding 'coverIsAiGenerated' column to scripts (PostgreSQL)")
            conn.execute(text('ALTER TABLE scripts ADD COLUMN "coverIsAiGenerated" BOOLEAN DEFAULT FALSE'))

        # Fix script_likes.scriptId FK: add ON DELETE CASCADE
        fk_rows = conn.execute(text("""
            SELECT tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'script_likes'
              AND tc.constraint_type = 'FOREIGN KEY'
              AND kcu.column_name = 'scriptId'
        """)).fetchall()
        for row in fk_rows:
            cname = row[0]
            # Check if it already has CASCADE
            rule = conn.execute(text("""
                SELECT delete_rule FROM information_schema.referential_constraints
                WHERE constraint_name = :cname
            """), {"cname": cname}).fetchone()
            if rule and rule[0].upper() != "CASCADE":
                print(f"Migrating: script_likes.scriptId FK -> ON DELETE CASCADE")
                # Delete dangling likes before adding FK constraint
                conn.execute(text("""
                    DELETE FROM script_likes
                    WHERE "scriptId" IS NOT NULL
                      AND "scriptId" NOT IN (SELECT id FROM scripts)
                """))
                conn.execute(text(f'ALTER TABLE script_likes DROP CONSTRAINT "{cname}"'))
                conn.execute(text(
                    'ALTER TABLE script_likes ADD CONSTRAINT "script_likes_scriptId_fkey" '
                    'FOREIGN KEY ("scriptId") REFERENCES scripts(id) ON DELETE CASCADE'
                ))

        # Fix public_terms_acceptances.scriptId FK: add ON DELETE SET NULL
        fk_rows = conn.execute(text("""
            SELECT tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'public_terms_acceptances'
              AND tc.constraint_type = 'FOREIGN KEY'
              AND kcu.column_name = 'scriptId'
        """)).fetchall()
        for row in fk_rows:
            cname = row[0]
            rule = conn.execute(text("""
                SELECT delete_rule FROM information_schema.referential_constraints
                WHERE constraint_name = :cname
            """), {"cname": cname}).fetchone()
            if rule and rule[0].upper() != "SET NULL":
                print(f"Migrating: public_terms_acceptances.scriptId FK -> ON DELETE SET NULL")
                # Nullify dangling scriptId references before adding FK constraint
                conn.execute(text("""
                    UPDATE public_terms_acceptances
                    SET "scriptId" = NULL
                    WHERE "scriptId" IS NOT NULL
                      AND "scriptId" NOT IN (SELECT id FROM scripts)
                """))
                conn.execute(text(f'ALTER TABLE public_terms_acceptances DROP CONSTRAINT "{cname}"'))
                conn.execute(text(
                    'ALTER TABLE public_terms_acceptances ADD CONSTRAINT "public_terms_acceptances_scriptId_fkey" '
                    'FOREIGN KEY ("scriptId") REFERENCES scripts(id) ON DELETE SET NULL'
                ))

        # Add layoutConfig column to marker_themes if missing
        result = conn.execute(text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = 'marker_themes' AND column_name = 'layoutConfig'"
        )).fetchone()
        if not result:
            print("Migrating: Adding 'layoutConfig' column to marker_themes (PostgreSQL)")
            conn.execute(text('ALTER TABLE marker_themes ADD COLUMN "layoutConfig" TEXT DEFAULT NULL'))

        crop_columns = [
            ("users", "avatarCrop"),
            ("organizations", "logoCrop"),
            ("organizations", "bannerCrop"),
            ("personas", "avatarCrop"),
            ("personas", "bannerCrop"),
            ("series", "coverCrop"),
            ("scripts", "coverCrop"),
        ]
        for table, col in crop_columns:
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = :t AND column_name = :c"
            ), {"t": table, "c": col}).fetchone()
            if not result:
                print(f"Migrating: Adding '{col}' column to {table} (PostgreSQL)")
                conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{col}" JSONB'))

        _backfill_crop_refs(conn, "users", "avatar", "avatarCrop")
        _backfill_crop_refs(conn, "organizations", "logoUrl", "logoCrop")
        _backfill_crop_refs(conn, "organizations", "bannerUrl", "bannerCrop")
        _backfill_crop_refs(conn, "personas", "avatar", "avatarCrop")
        _backfill_crop_refs(conn, "personas", "bannerUrl", "bannerCrop")
        _backfill_crop_refs(conn, "series", "coverUrl", "coverCrop")
        _backfill_crop_refs(conn, "scripts", "coverUrl", "coverCrop")

        content_columns = [
            ("scripts", "synopsis",          "TEXT"),
            ("scripts", "outline",           "TEXT"),
            ("scripts", "activityName",      "TEXT"),
            ("scripts", "activityBannerUrl", "TEXT"),
        ]
        for table, col, col_type in content_columns:
            result = conn.execute(text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = :t AND column_name = :c"
            ), {"t": table, "c": col}).fetchone()
            if not result:
                print(f"Migrating: Adding '{col}' column to {table} (PostgreSQL)")
                conn.execute(text(f'ALTER TABLE "{table}" ADD COLUMN "{col}" {col_type}'))
        _backfill_content_fields(conn)

        conn.commit()


def run_migrations():
    if engine.dialect.name == "postgresql":
        _run_postgres_migrations()
        return
    if engine.dialect.name != "sqlite":
        print(f"Skipping legacy sqlite migrations for dialect: {engine.dialect.name}")
        return

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

            if 'seriesId' not in columns:
                print("Migrating: Adding 'seriesId' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN seriesId TEXT DEFAULT NULL"))

            if 'seriesOrder' not in columns:
                print("Migrating: Adding 'seriesOrder' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN seriesOrder INTEGER DEFAULT NULL"))

            if 'coverIsAiGenerated' not in columns:
                print("Migrating: Adding 'coverIsAiGenerated' column to scripts")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN coverIsAiGenerated BOOLEAN DEFAULT 0"))

            if 'licenseCommercial' not in columns:
                print("Migrating: Adding 'licenseCommercial' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN licenseCommercial TEXT DEFAULT ''"))

            if 'licenseDerivative' not in columns:
                print("Migrating: Adding 'licenseDerivative' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN licenseDerivative TEXT DEFAULT ''"))

            if 'licenseNotify' not in columns:
                print("Migrating: Adding 'licenseNotify' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN licenseNotify TEXT DEFAULT ''"))

            if 'customMetadata' not in columns:
                print("Migrating: Adding 'customMetadata' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN customMetadata TEXT DEFAULT '[]'"))
            conn.execute(text("UPDATE scripts SET customMetadata = '[]' WHERE customMetadata IS NULL OR TRIM(customMetadata) = ''"))
            
            # marker_themes columns
            result_themes = conn.execute(text("PRAGMA table_info(marker_themes)"))
            theme_columns = [row.name for row in result_themes.fetchall()]

            if 'layoutConfig' not in theme_columns:
                print("Migrating: Adding 'layoutConfig' column to marker_themes")
                conn.execute(text("ALTER TABLE marker_themes ADD COLUMN layoutConfig TEXT DEFAULT NULL"))

            # Check users columns
            result_users = conn.execute(text("PRAGMA table_info(users)"))
            user_columns = [row.name for row in result_users.fetchall()]

            if 'website' not in user_columns:
                print("Migrating: Adding 'website' column to users")
                conn.execute(text("ALTER TABLE users ADD COLUMN website TEXT DEFAULT ''"))
            
            if 'organizationId' not in user_columns:
                print("Migrating: Adding 'organizationId' column to users")
                conn.execute(text("ALTER TABLE users ADD COLUMN organizationId TEXT DEFAULT NULL"))
            
            if 'email' not in user_columns:
                print("Migrating: Adding 'email' column to users")
                conn.execute(text("ALTER TABLE users ADD COLUMN email TEXT DEFAULT NULL"))
            if 'avatarCrop' not in user_columns:
                print("Migrating: Adding 'avatarCrop' column to users")
                conn.execute(text("ALTER TABLE users ADD COLUMN avatarCrop TEXT DEFAULT NULL"))

            # Personas columns
            result_personas = conn.execute(text("PRAGMA table_info(personas)"))
            persona_columns = [row.name for row in result_personas.fetchall()]

            if 'website' not in persona_columns:
                print("Migrating: Adding 'website' column to personas")
                conn.execute(text("ALTER TABLE personas ADD COLUMN website TEXT DEFAULT ''"))

            if 'links' not in persona_columns:
                print("Migrating: Adding 'links' column to personas")
                conn.execute(text("ALTER TABLE personas ADD COLUMN links TEXT DEFAULT '[]'"))

            if 'organizationIds' not in persona_columns:
                print("Migrating: Adding 'organizationIds' column to personas")
                conn.execute(text("ALTER TABLE personas ADD COLUMN organizationIds TEXT DEFAULT '[]'"))

            if 'tags' not in persona_columns:
                print("Migrating: Adding 'tags' column to personas")
                conn.execute(text("ALTER TABLE personas ADD COLUMN tags TEXT DEFAULT '[]'"))

            if 'defaultLicenseCommercial' not in persona_columns:
                print("Migrating: Adding 'defaultLicenseCommercial' column to personas")
                conn.execute(text("ALTER TABLE personas ADD COLUMN defaultLicenseCommercial TEXT DEFAULT ''"))

            if 'defaultLicenseDerivative' not in persona_columns:
                print("Migrating: Adding 'defaultLicenseDerivative' column to personas")
                conn.execute(text("ALTER TABLE personas ADD COLUMN defaultLicenseDerivative TEXT DEFAULT ''"))

            if 'defaultLicenseNotify' not in persona_columns:
                print("Migrating: Adding 'defaultLicenseNotify' column to personas")
                conn.execute(text("ALTER TABLE personas ADD COLUMN defaultLicenseNotify TEXT DEFAULT ''"))

            if 'defaultLicenseSpecialTerms' not in persona_columns:
                print("Migrating: Adding 'defaultLicenseSpecialTerms' column to personas")
                conn.execute(text("ALTER TABLE personas ADD COLUMN defaultLicenseSpecialTerms TEXT DEFAULT '[]'"))
            if 'bannerUrl' not in persona_columns:
                print("Migrating: Adding 'bannerUrl' column to personas")
                conn.execute(text("ALTER TABLE personas ADD COLUMN bannerUrl TEXT DEFAULT ''"))
            if 'avatarCrop' not in persona_columns:
                print("Migrating: Adding 'avatarCrop' column to personas")
                conn.execute(text("ALTER TABLE personas ADD COLUMN avatarCrop TEXT DEFAULT NULL"))
            if 'bannerCrop' not in persona_columns:
                print("Migrating: Adding 'bannerCrop' column to personas")
                conn.execute(text("ALTER TABLE personas ADD COLUMN bannerCrop TEXT DEFAULT NULL"))

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
            if 'bannerUrl' not in org_columns:
                print("Migrating: Adding 'bannerUrl' column to organizations")
                conn.execute(text("ALTER TABLE organizations ADD COLUMN bannerUrl TEXT DEFAULT ''"))
            if 'logoCrop' not in org_columns:
                print("Migrating: Adding 'logoCrop' column to organizations")
                conn.execute(text("ALTER TABLE organizations ADD COLUMN logoCrop TEXT DEFAULT NULL"))
            if 'bannerCrop' not in org_columns:
                print("Migrating: Adding 'bannerCrop' column to organizations")
                conn.execute(text("ALTER TABLE organizations ADD COLUMN bannerCrop TEXT DEFAULT NULL"))

            # Series table
            result_tables = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='series'"))
            has_series_table = result_tables.fetchone() is not None
            if not has_series_table:
                print("Migrating: Creating 'series' table")
                conn.execute(text("""
                    CREATE TABLE series (
                        id TEXT PRIMARY KEY,
                        ownerId TEXT NOT NULL,
                        name TEXT NOT NULL,
                        slug TEXT NOT NULL,
                        summary TEXT DEFAULT '',
                        coverUrl TEXT DEFAULT '',
                        createdAt INTEGER NOT NULL,
                        updatedAt INTEGER NOT NULL
                    )
                """))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_series_ownerId ON series(ownerId)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_series_slug ON series(slug)"))
            else:
                result_series = conn.execute(text("PRAGMA table_info(series)"))
                series_columns = [row.name for row in result_series.fetchall()]
                if 'coverCrop' not in series_columns:
                    print("Migrating: Adding 'coverCrop' column to series")
                    conn.execute(text("ALTER TABLE series ADD COLUMN coverCrop TEXT DEFAULT NULL"))

            if 'coverCrop' not in columns:
                print("Migrating: Adding 'coverCrop' column to scripts")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN coverCrop TEXT DEFAULT NULL"))

            for col in ("synopsis", "outline", "activityName", "activityBannerUrl"):
                if col not in columns:
                    print(f"Migrating: Adding '{col}' column to scripts")
                    conn.execute(text(f"ALTER TABLE scripts ADD COLUMN {col} TEXT DEFAULT NULL"))

            # Organization memberships table (user <-> org many-to-many)
            result_tables = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='organization_memberships'"))
            has_org_memberships_table = result_tables.fetchone() is not None
            if not has_org_memberships_table:
                print("Migrating: Creating 'organization_memberships' table")
                conn.execute(text("""
                    CREATE TABLE organization_memberships (
                        id TEXT PRIMARY KEY,
                        orgId TEXT NOT NULL,
                        userId TEXT NOT NULL,
                        role TEXT DEFAULT 'member',
                        createdAt INTEGER NOT NULL,
                        updatedAt INTEGER NOT NULL,
                        FOREIGN KEY(orgId) REFERENCES organizations(id),
                        FOREIGN KEY(userId) REFERENCES users(id),
                        UNIQUE(orgId, userId)
                    )
                """))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_organization_memberships_orgId ON organization_memberships(orgId)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_organization_memberships_userId ON organization_memberships(userId)"))

            # Persona organization memberships table (persona <-> org many-to-many)
            result_tables = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='persona_organization_memberships'"))
            has_persona_org_memberships_table = result_tables.fetchone() is not None
            if not has_persona_org_memberships_table:
                print("Migrating: Creating 'persona_organization_memberships' table")
                conn.execute(text("""
                    CREATE TABLE persona_organization_memberships (
                        id TEXT PRIMARY KEY,
                        orgId TEXT NOT NULL,
                        personaId TEXT NOT NULL,
                        role TEXT DEFAULT 'member',
                        createdAt INTEGER NOT NULL,
                        updatedAt INTEGER NOT NULL,
                        FOREIGN KEY(orgId) REFERENCES organizations(id),
                        FOREIGN KEY(personaId) REFERENCES personas(id),
                        UNIQUE(orgId, personaId)
                    )
                """))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_persona_organization_memberships_orgId ON persona_organization_memberships(orgId)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_persona_organization_memberships_personaId ON persona_organization_memberships(personaId)"))

            # Public terms acceptances audit table
            result_tables = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='public_terms_acceptances'"))
            has_public_terms_acceptances_table = result_tables.fetchone() is not None
            if not has_public_terms_acceptances_table:
                print("Migrating: Creating 'public_terms_acceptances' table")
                conn.execute(text("""
                    CREATE TABLE public_terms_acceptances (
                        id TEXT PRIMARY KEY,
                        termsKey TEXT NOT NULL DEFAULT 'public_reader_terms',
                        termsVersion TEXT NOT NULL,
                        scriptId TEXT DEFAULT NULL,
                        userId TEXT DEFAULT NULL,
                        visitorId TEXT DEFAULT NULL,
                        acceptedAt INTEGER NOT NULL,
                        ipAddress TEXT DEFAULT '',
                        forwardedFor TEXT DEFAULT '',
                        userAgent TEXT DEFAULT '',
                        acceptLanguage TEXT DEFAULT '',
                        referer TEXT DEFAULT '',
                        origin TEXT DEFAULT '',
                        host TEXT DEFAULT '',
                        clientMeta TEXT DEFAULT '{}',
                        headerSnapshot TEXT DEFAULT '{}'
                    )
                """))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_public_terms_acceptances_termsKey ON public_terms_acceptances(termsKey)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_public_terms_acceptances_termsVersion ON public_terms_acceptances(termsVersion)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_public_terms_acceptances_scriptId ON public_terms_acceptances(scriptId)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_public_terms_acceptances_userId ON public_terms_acceptances(userId)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_public_terms_acceptances_visitorId ON public_terms_acceptances(visitorId)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_public_terms_acceptances_acceptedAt ON public_terms_acceptances(acceptedAt)"))

            # Admin users table (dynamic super-admin management)
            result_tables = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='admin_users'"))
            has_admin_users_table = result_tables.fetchone() is not None
            if not has_admin_users_table:
                print("Migrating: Creating 'admin_users' table")
                conn.execute(text("""
                    CREATE TABLE admin_users (
                        id TEXT PRIMARY KEY,
                        userId TEXT DEFAULT NULL,
                        email TEXT DEFAULT NULL,
                        createdBy TEXT DEFAULT NULL,
                        createdAt INTEGER NOT NULL
                    )
                """))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_admin_users_userId ON admin_users(userId)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_admin_users_email ON admin_users(email)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_admin_users_createdAt ON admin_users(createdAt)"))

            # Site settings table (global admin-managed config)
            result_tables = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name='site_settings'"))
            has_site_settings_table = result_tables.fetchone() is not None
            if not has_site_settings_table:
                print("Migrating: Creating 'site_settings' table")
                conn.execute(text("""
                    CREATE TABLE site_settings (
                        key TEXT PRIMARY KEY,
                        value TEXT DEFAULT '',
                        updatedBy TEXT DEFAULT NULL,
                        updatedAt INTEGER NOT NULL
                    )
                """))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_site_settings_updatedAt ON site_settings(updatedAt)"))

            # Backfill user -> org memberships from legacy users.organizationId
            now_ms = int(time.time() * 1000)
            user_rows = conn.execute(text("SELECT id, organizationId FROM users WHERE organizationId IS NOT NULL AND organizationId != ''")).fetchall()
            for row in user_rows:
                exists = conn.execute(
                    text("SELECT 1 FROM organization_memberships WHERE orgId = :orgId AND userId = :userId LIMIT 1"),
                    {"orgId": row.organizationId, "userId": row.id},
                ).fetchone()
                if exists:
                    continue
                conn.execute(
                    text("""
                        INSERT INTO organization_memberships (id, orgId, userId, role, createdAt, updatedAt)
                        VALUES (:id, :orgId, :userId, 'member', :createdAt, :updatedAt)
                    """),
                    {
                        "id": str(uuid.uuid4()),
                        "orgId": row.organizationId,
                        "userId": row.id,
                        "createdAt": now_ms,
                        "updatedAt": now_ms,
                    },
                )

            # Backfill persona -> org memberships from legacy personas.organizationIds JSON text
            persona_rows = conn.execute(text("SELECT id, organizationIds FROM personas")).fetchall()
            for row in persona_rows:
                raw_ids = row.organizationIds
                try:
                    org_ids = json.loads(raw_ids) if isinstance(raw_ids, str) else (raw_ids or [])
                except Exception:
                    org_ids = []
                if not isinstance(org_ids, list):
                    org_ids = []
                for org_id in org_ids:
                    if not org_id:
                        continue
                    exists = conn.execute(
                        text("SELECT 1 FROM persona_organization_memberships WHERE orgId = :orgId AND personaId = :personaId LIMIT 1"),
                        {"orgId": org_id, "personaId": row.id},
                    ).fetchone()
                    if exists:
                        continue
                    conn.execute(
                        text("""
                            INSERT INTO persona_organization_memberships (id, orgId, personaId, role, createdAt, updatedAt)
                            VALUES (:id, :orgId, :personaId, 'member', :createdAt, :updatedAt)
                        """),
                        {
                            "id": str(uuid.uuid4()),
                            "orgId": org_id,
                            "personaId": row.id,
                            "createdAt": now_ms,
                            "updatedAt": now_ms,
                        },
                    )

            _backfill_crop_refs(conn, "users", "avatar", "avatarCrop")
            _backfill_crop_refs(conn, "organizations", "logoUrl", "logoCrop")
            _backfill_crop_refs(conn, "organizations", "bannerUrl", "bannerCrop")
            _backfill_crop_refs(conn, "personas", "avatar", "avatarCrop")
            _backfill_crop_refs(conn, "personas", "bannerUrl", "bannerCrop")
            _backfill_crop_refs(conn, "series", "coverUrl", "coverCrop")
            _backfill_crop_refs(conn, "scripts", "coverUrl", "coverCrop")
            _backfill_content_fields(conn)

            conn.commit()
    except Exception as e:
        print(f"Migration failed: {e}")
