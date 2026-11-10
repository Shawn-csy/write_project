#!/usr/bin/env python3
"""Copy the reviewed Dev public catalog into a compatible production database.

Export a fixed snapshot first, rehearse it against a production clone, then apply
the same snapshot to production. Existing rows are never replaced.
"""

import argparse
import hashlib
import json
import os
import subprocess
import uuid
from pathlib import Path


DEV = ("write-project-dev-api-8891-dev-api-8891-postgres-1", "write_project_dev", "write_project_dev")
PROD = ("write_project-write_project-postgres-1", "write_project", "write_project")
TABLES = (
    ("organizations", "TRUE"),
    ("personas", "TRUE"),
    ("persona_roles", "TRUE"),
    ("public_audio_work_submissions", "status = 'approved'"),
    ("production_resources", "status = 'published'"),
    ("audio_work_credits", "TRUE"),
    ("production_resource_credits", "TRUE"),
    ("production_resource_external_works", "TRUE"),
    ("production_resource_enrichments", "TRUE"),
    ("production_resource_links", "TRUE"),
    ("production_resource_profile_overrides", "TRUE"),
)


def query(container, user, database, sql):
    result = subprocess.run(
        ["docker", "exec", container, "psql", "-X", "-U", user, "-d", database, "-Atc", sql],
        capture_output=True, text=True, check=True,
    )
    return result.stdout.splitlines()


def export(path):
    payload = {}
    for table, condition in TABLES:
        sql = f"SELECT row_to_json(t) FROM (SELECT * FROM {table} WHERE {condition} ORDER BY id) t"
        payload[table] = [json.loads(line) for line in query(*DEV, sql)]
    audio = {row["id"] for row in payload["public_audio_work_submissions"]}
    resources = {row["id"] for row in payload["production_resources"]}
    orgs = {row["id"] for row in payload["organizations"]}
    personas = {row["id"] for row in payload["personas"]}
    assert all(row["organizationId"] in orgs for row in payload["public_audio_work_submissions"] if row["organizationId"])
    assert all(set(row["voiceActorIds"] or []) <= personas for row in payload["public_audio_work_submissions"])
    assert all(row["audioWorkId"] in audio for table in ("audio_work_credits", "production_resource_credits") for row in payload[table])
    assert all(row["resourceId"] in resources for row in payload["production_resource_credits"])
    assert all(row["personaId"] in personas for row in payload["persona_roles"])
    data = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode()
    with os.fdopen(os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "wb") as handle:
        handle.write(data)
    print(f"Snapshot SHA256 {hashlib.sha256(data).hexdigest()}")
    print("Source rows:", ", ".join(f"{table}={len(payload[table])}" for table, _ in TABLES))


def apply(path, target, user, database, commit):
    data = path.read_bytes()
    payload = json.loads(data)
    if set(payload) != {table for table, _ in TABLES}:
        raise SystemExit("Snapshot table set differs from the importer")
    if target == PROD[0] and commit and os.environ.get("CONFIRM_PROD_CATALOG_IMPORT") != "1":
        raise SystemExit("Set CONFIRM_PROD_CATALOG_IMPORT=1 after rehearsal and backup")
    tag = "catalog_" + uuid.uuid4().hex
    sql = ["BEGIN;", "SET LOCAL lock_timeout = '500ms';", "SET LOCAL statement_timeout = '30s';"]
    for table, _ in TABLES:
        rows = payload[table]
        if not rows:
            continue
        encoded = json.dumps(rows, ensure_ascii=False, separators=(",", ":"))
        if f"${tag}$" in encoded:
            raise SystemExit("Snapshot contains SQL delimiter")
        sql.append(
            f"INSERT INTO {table} SELECT * FROM jsonb_populate_recordset(NULL::{table}, "
            f"${tag}${encoded}${tag}$::jsonb) ON CONFLICT DO NOTHING;"
        )
    sql.append("COMMIT;" if commit else "ROLLBACK;")
    result = subprocess.run(
        ["docker", "exec", "-i", target, "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", user, "-d", database],
        input="\n".join(sql), capture_output=True, text=True,
    )
    if result.returncode:
        raise SystemExit(result.stderr or result.stdout)
    print(f"Snapshot SHA256 {hashlib.sha256(data).hexdigest()}; {'committed' if commit else 'rolled back'}")
    if commit:
        for table, _ in TABLES:
            if not payload[table]:
                continue
            if table == "persona_roles":
                source_keys = {(row["personaId"], row["role"]) for row in payload[table]}
                target_keys = {tuple(line.split("|", 1)) for line in query(target, user, database, 'SELECT "personaId", role FROM persona_roles')}
            else:
                source_keys = {row["id"] for row in payload[table]}
                target_keys = set(query(target, user, database, f"SELECT id FROM {table}"))
            missing = source_keys - target_keys
            if missing:
                raise SystemExit(f"Missing {len(missing)} rows after import in {table}")
        print("Verified all source IDs in the target database")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", type=Path, required=True)
    parser.add_argument("--export", action="store_true")
    parser.add_argument("--target-container", default=PROD[0])
    parser.add_argument("--target-user", default=PROD[1])
    parser.add_argument("--target-db", default=PROD[2])
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if args.export:
        export(args.snapshot)
    else:
        apply(args.snapshot, args.target_container, args.target_user, args.target_db, args.apply)


if __name__ == "__main__":
    main()
