#!/bin/bash
set -euo pipefail

report_dir=/Users/shanti/Library/Logs/write-project-audio-discovery
mkdir -p "$report_dir"

temporary_report=$(mktemp "$report_dir/report.XXXXXX")
trap 'rm -f "$temporary_report"' EXIT

# The scan only reads the Dev catalog. --apply saves alert deduplication state.
database_url=$(docker inspect write-project-dev-api-8891-dev-api-8891-1 \
  --format '{{range .Config.Env}}{{println .}}{{end}}' | sed -n 's/^DATABASE_URL=//p')
if [[ "$database_url" != *write_project_dev* ]]; then
  echo 'Dev database URL is unavailable' >&2
  exit 1
fi
set +e
docker run --rm --network write-project-dev-api-8891_default \
  --volume write-project-dev-api-8891-media:/data \
  --env DATABASE_URL="$database_url" \
  write-project-dev-api-8891-dev-api-8891:latest \
  python -m scripts.check_audio_work_releases --state /data/audio-discovery/state.json --apply \
  > "$temporary_report"
scan_status=$?
set -e

python3 - "$temporary_report" "$report_dir/latest.json" "$scan_status" <<'PY'
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone

temporary, latest, status = sys.argv[1], sys.argv[2], int(sys.argv[3])
try:
    with open(temporary, encoding="utf-8") as stream:
        report = json.load(stream)
except (OSError, ValueError) as exc:
    raise SystemExit(f"Audio discovery produced no valid report (exit {status}): {exc}")

os.replace(temporary, latest)
new_count = len(report.get("newCandidates", []))
error_count = len(report.get("errors", []))
print(f"Audio discovery: {new_count} new candidate(s), {error_count} source error(s); report: {latest}")
if new_count or error_count:
    archive_dir = os.path.join(os.path.dirname(latest), "history")
    os.makedirs(archive_dir, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    shutil.copy2(latest, os.path.join(archive_dir, f"{stamp}.json"))
    message = f"{new_count} 部新作候選、{error_count} 個來源錯誤。請查看掃描報告。"
    subprocess.run([
        "/usr/bin/osascript", "-e",
        f'display notification "{message}" with title "音聲作品掃描"',
    ], check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
sys.exit(status)
PY
