# Production monitoring

正式服務拓樸、發布流程與維運總覽見 [正式架構](../architecture/production-architecture.md)。

`scripts/monitor-production.py --config /absolute/private/monitor.json` prints one sanitized JSON object. Exit 0 means all configured checks healthy, 1 means a measured failure (including stale data), and 2 means incomplete/unknown coverage with no measured failure. Failed checks take precedence over unknown checks. The command itself installs no schedules or notifications. Production now has an installed `com.shawnup.write-project-monitor` LaunchAgent every 300 seconds, independent of the repository template; the genuine scheduled run observed on 2026-11-16 was all healthy. No new email or Slack alert service is installed.

Example configuration (replace the media token with a known published local image token; the installed job probes the primary FastAPI thumbnail, not only its R2 fallback):

```json
{
  "api_url": "https://api-open-scripts.shawnup.com/api/health/ready",
  "media_url": "https://api-open-scripts.shawnup.com/api/public-media/KNOWN-PUBLISHED-MEDIA-TOKEN.webp?w=240",
  "pages_url": "https://open-scripts.shawnup.com/content-version.json",
  "media_access_log": "/absolute/readable/nginx-access.log",
  "timeout": 5,
  "latency_ms": 2000,
  "freshness_seconds": 3600,
  "media_window_seconds": 900,
  "max_media_error_rate": 0.01,
  "min_free_bytes": 5368709120
}
```

Use trusted operator-controlled URLs and files. URLs, credentials, filesystem paths, raw log lines, and exception text are never copied into monitor output. Every HTTP body read is bounded (receipt 64 KiB; synthetic probe one byte), and socket timeout is configurable up to 30 seconds. urllib socket timeout bounds individual operations, not a strict total wall-clock deadline across DNS/redirects/slow streaming. There are at most three synthetic probes; no catalog crawl or object scan. API availability checks HTTP success and latency; media also requires image Content-Type. A single image probe is explicitly **not an error rate**.

The default Nginx combined access-log parser reads only the final 64 KiB, discards an initial truncated record, and counts `/media/` and `/api/public-media/` HTTP statuses >=400 within the configured window. It emits sample counts/rate and whether the tail was truncated; this is a bounded sample, not a guarantee of complete traffic coverage. Missing, empty, stale-only, malformed, or partially written logs are unknown. The installed collector resolves the active Docker Nginx publishing loopback 1090 and exports a bounded recent combined-log sample after probing a thumbnail through that ingress. It includes synthetic traffic and is not the complete request population. The standalone monitor command does not start collection. A high measured error rate remains failed even if other sampled lines are malformed.

Alternatively, a trusted existing aggregator can supply `media_stats` pointing at a <=64 KiB JSON object `{ "requests": 100, "errors": 0, "window_ended_at": "2026-11-16T00:00:00Z" }`. Counters must describe the same completed media-only window and be nonnegative integers with requests >0 and errors <=requests. The monitor validates age and counters but cannot attest to the producer's completeness. `media_access_log` takes precedence if both are configured. No aggregate source means unknown, even if the synthetic media probe succeeds.

`WP_RELEASE_ROOT` defaults to `<checkout>/releases`. Override `pages_state`, `sync_state`, and `disk_path` explicitly when necessary. Pages freshness uses `.content-refresh/state.json` `checked_at`, updated after successful unchanged verification as well as publication, rather than receipt `built_at`. Healthy requires phase `complete`, no running job/failure, a fresh timestamp, and public receipt digest/commit matching the local receipt. A recent running/deferred/pending job is unknown; it becomes failed after one hour, while recorded failures fail immediately. Legacy receipts without `checked_at` are unknown until verified again. This checks known publication, not whether every source change has been captured.

The sync script atomically writes `.public-sync/production.json` (preview uses `preview.json`) under the same durable root, with schema:

```json
{"schema_version":1,"status":"success","checked_at":"...","last_success_at":"...","outcome":"published","media_objects_checked":12,"skipped_objects":0}
```

Failure emits a fixed `error_code: sync_failed` and preserves `last_success_at` and prior skipped-media count; status is failed regardless of a previous success. Unchanged sync refreshes the successful check timestamp and preserves prior skipped-media count. Missing prior media health stays null/unknown. Nonzero skipped objects remain failed until a publication with verified media clears them; scheduled sync retries all referenced media rather than taking the unchanged/delta shortcut when the prior receipt records skipped objects. This receipt proves the sync job completed (or source snapshots matched D1), **not independent D1/R2 availability, object completeness, or repair**. Unchanged runs skip R2. Invalid command-line/origin configuration occurs before the sync job and does not produce a new receipt; freshness eventually exposes a stalled job. Existing sync stderr is separate and may contain operational error details; do not publish it.

Verification: `python3 -m unittest discover -s scripts -p test_monitor_production.py` , `node --test scripts/test_sync_status.mjs`, and `node --check scripts/sync-public-cloudflare.mjs` require no production access.

## Installed runtime and operator commands

The immutable runtime lives at `$HOME/Library/Application Support/write-project-ops/<runtime-source-sha>/`, outside both the development checkout and runner checkout. Current runtime provenance is `8c78355bc64429a3b220cfa5bdb0234338491236`; monitor and sync scripts were verified byte-identical at deployed `6b32f07`. Its manifest records hashes, README documents installation/rollback, and isolated dependencies pin Wrangler 4.153.0. The collector atomically writes `last-result.json`, overwrites its private raw sample each run, and rotates sanitized history at 256 KiB with one prior copy. Keep config and raw logs private.

```bash
launchctl print gui/$(id -u)/com.shawnup.write-project-monitor
launchctl print gui/$(id -u)/com.shawnup.write-project-public-sync-prod
# Request an immediate monitor run, then inspect its sanitized last-result.json.
launchctl kickstart gui/$(id -u)/com.shawnup.write-project-monitor
```

For runtime updates, verify manifest hashes, wait for any active sync to finish, bootout only the relevant labels, preserve their previous plists, copy the prepared plists, then bootstrap each file under `~/Library/LaunchAgents/`. Confirm sync is idle and unload its label before any forced manual sync; do not overlap runs or interrupt an active write. Rollback restores the previous plist and bootstraps it after bootout; do not repoint scheduled production jobs at a dirty checkout. Sync runs every 900 seconds and uses the same durable `WP_RELEASE_ROOT` as releases. The successful scheduled retry checked 153 media objects with zero skipped objects after the publisher-user-agent fix; this is a dated observation, not independent proof of every R2 object.
