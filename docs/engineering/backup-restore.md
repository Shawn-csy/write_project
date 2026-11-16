# Private backup and restore drill

## Actual readiness (2026-11-16)

Read-only inspection of the installed LaunchAgent found `BACKUP_MIRROR_DIR` and `PATH`, with no offsite destination. Off-machine backup is **unconfigured**, not complete. The external disk is a mirror, not remote delivery. No production dump, upload, schedule installation or production restore was performed for this change.

## Backup format and compatibility

`bash scripts/backup-db.sh` remains the CLI entry point. It now delegates to adjacent `backup-bundle.py` (Python 3.9+, standard library, Docker CLI) and creates a private `write_project_<timestamp>_<random>/` directory containing `database.dump` (PostgreSQL custom format), `media.tar.gz` and `manifest.json`. Existing `.sql.gz` backups remain untouched; consumers expecting that filename must migrate. The former `backup.log` is replaced by stdout/stderr; launchd still captures these. Old heap/index log checks are replaced by the explicit restore drill's `pg_amcheck` validation.

`PG_CONTAINER`, `DB_USER`, `DB_NAME`, `BACKUP_DIR`, `KEEP_DAYS` (14), `BACKUP_MIRROR_DIR`, `MIRROR_KEEP_DAYS` (180) remain supported. New-format complete bundles alone participate in retention. A configured external mirror is required and failures exit nonzero. Local completion may precede a mirror failure; it never means external delivery succeeded. Partial mirror directories are left for operator inspection, never reported complete. Atomic rename finalizes each copy only after checksum verification. An advisory lock prevents overlapping backup/retention in the same local directory.

`MEDIA_STORAGE_ROOT` must point only to the application media directory (repository default `server/data/media`, matching container `/data/media`). Missing directory, symlinks, special files or unexpected extensions fail explicitly. Hidden paths and `secrets`/`credentials` paths fail explicitly for review; no eligible media is silently omitted. Only image/audio/video/PDF extensions are eligible; current uploader accepts PNG/JPEG/WebP/GIF. Never point this at `server/data`, a home directory, secrets directory or database volume. Backups contain private data: restrict filesystem access and use encrypted storage at rest according to the selected destination's controls.

Database dump uses pg_dump's consistent DB snapshot. Source table counts before/after must agree and are checked on restore. **DB + mutable media are sequential, not a joint snapshot**; counts do not detect updates/deletes+inserts preserving counts. Quiesce application writes/uploads for a recovery point requiring cross-resource consistency. Otherwise treat the result as a best-effort combined recovery point. pg_restore header validation is not a full restore; run the drill regularly.

## Existing Horcrux external disk

The user selected `/Volumes/Horcrux/write_project_backups`. Read-only inspection confirmed `/Volumes/Horcrux` is mounted on a different device from the home filesystem. Configure `BACKUP_MIRROR_DIR` to that directory. A configured external mirror is required: absence, permissions, copy or checksum failure exits nonzero. The script verifies a real mounted ancestor on a distinct filesystem, rejects symlink paths and checks the parent exists before creating anything. This prevents creating a fake directory under `/Volumes` when the disk is absent. A complete copy is atomically renamed only after hash validation. The external mirror keeps 180 days (`MIRROR_KEEP_DAYS`); local storage keeps 14 days. Neither copy protects against loss of both disks in the same location. There is no offsite delivery feature or destination.

## Installation (manual; not performed)

Install both helpers together into `~/bin`, retain executable permissions, set an absolute `MEDIA_STORAGE_ROOT` and ensure launchd's Python/Docker PATH works. Review `scripts/com.shawnup.write-project-backup.plist` before installing it. Desktop/media access may require macOS privacy authorization for the scheduled interpreter. Do not copy just the shell wrapper. The template retains the existing Horcrux destination. Verify a manual run and restore drill after merge and before activating the updated schedule.

## Verify and disposable restore drill

```bash
python3 scripts/backup-bundle.py verify /absolute/path/to/bundle
python3 scripts/backup-bundle.py drill /absolute/path/to/bundle
python3 -m unittest discover -s scripts -p test_backup_bundle.py -v
```

Only use trusted locally acquired bundles. The drill accepts no destination/container override: it creates a random `wp-restore-drill-*` container and internal network, tmpfs database, temporary media directory, no host ports and no production mounts. It verifies hashes and safe archive members before provisioning, restores with errors fatal, compares all public-table counts to source evidence, requires populated records, and runs `pg_amcheck --heapallindexed`. Media extraction occurs only into a disposable temporary directory. Container/network/temp media cleanup runs on success and exceptions. SIGKILL or machine loss can leave resources; inspect only resources with the generated `wp-restore-drill-*` name before manual cleanup. Never substitute a production container into a restore command.

Synthetic validation used an isolated network-none PostgreSQL 16 fixture with two script records and one fake image, then backup + isolated drill. No production data was read. Unit tests cover truncated artifacts, checksums, archive traversal, symlinks/credential exclusion, same-device/missing mounts and symlink mirror destinations. Offsite delivery remains unconfigured. Parent acceptance also copied the synthetic bundle to a temporary directory on Horcrux, verified checksums, and restored two records plus one media file from that copy. The temporary external-disk fixture and disposable containers were removed; no production data was copied.
