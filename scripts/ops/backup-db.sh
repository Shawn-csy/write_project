#!/usr/bin/env bash
# Compatibility entry point. New backups are private DB+media bundle directories.
# See docs/engineering/backup-restore.md; legacy .sql.gz dumps remain untouched.
set -Eeuo pipefail
exec python3 "$(cd "$(dirname "$0")" && pwd)/backup-bundle.py" backup
