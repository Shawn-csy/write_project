import json
import time
import uuid
from sqlalchemy import text
from database import engine

VALID_COMMERCIAL = {"allow", "disallow"}
VALID_DERIVATIVE = {"allow", "disallow", "limited"}
VALID_NOTIFY = {"required", "not_required"}


def _norm_key(key: str) -> str:
    return str(key or "").strip().lower().replace(" ", "")


def _extract_top_meta(content: str):
    lines = str(content or "").split("\n")
    meta = {}
    for raw in lines:
        line = raw.strip()
        if line == "":
            continue
        if ":" not in line:
            break
        k, v = line.split(":", 1)
        meta[_norm_key(k)] = v.strip()
    return meta


def _norm_choice(value, allowed):
    raw = str(value or "").strip().lower()
    return raw if raw in allowed else ""


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

            if 'seriesId' not in columns:
                print("Migrating: Adding 'seriesId' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN seriesId TEXT DEFAULT NULL"))

            if 'seriesOrder' not in columns:
                print("Migrating: Adding 'seriesOrder' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN seriesOrder INTEGER DEFAULT NULL"))

            if 'licenseCommercial' not in columns:
                print("Migrating: Adding 'licenseCommercial' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN licenseCommercial TEXT DEFAULT ''"))

            if 'licenseDerivative' not in columns:
                print("Migrating: Adding 'licenseDerivative' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN licenseDerivative TEXT DEFAULT ''"))

            if 'licenseNotify' not in columns:
                print("Migrating: Adding 'licenseNotify' column")
                conn.execute(text("ALTER TABLE scripts ADD COLUMN licenseNotify TEXT DEFAULT ''"))
            
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

            # Backfill script license fields from metadata header.
            script_rows = conn.execute(
                text(
                    "SELECT id, content, licenseCommercial, licenseDerivative, licenseNotify FROM scripts"
                )
            ).fetchall()
            for row in script_rows:
                current_commercial = _norm_choice(getattr(row, "licenseCommercial", ""), VALID_COMMERCIAL)
                current_derivative = _norm_choice(getattr(row, "licenseDerivative", ""), VALID_DERIVATIVE)
                current_notify = _norm_choice(getattr(row, "licenseNotify", ""), VALID_NOTIFY)

                if current_commercial and current_derivative and current_notify:
                    continue

                meta = _extract_top_meta(getattr(row, "content", "") or "")
                next_commercial = current_commercial or _norm_choice(meta.get("licensecommercial"), VALID_COMMERCIAL)
                next_derivative = current_derivative or _norm_choice(meta.get("licensederivative"), VALID_DERIVATIVE)
                next_notify = current_notify or _norm_choice(meta.get("licensenotify"), VALID_NOTIFY)
                if (
                    next_commercial == current_commercial
                    and next_derivative == current_derivative
                    and next_notify == current_notify
                ):
                    continue
                conn.execute(
                    text(
                        """
                        UPDATE scripts
                        SET licenseCommercial = :commercial,
                            licenseDerivative = :derivative,
                            licenseNotify = :notify
                        WHERE id = :id
                        """
                    ),
                    {
                        "id": row.id,
                        "commercial": next_commercial,
                        "derivative": next_derivative,
                        "notify": next_notify,
                    },
                )
            
            conn.commit()
    except Exception as e:
        print(f"Migration failed: {e}")
