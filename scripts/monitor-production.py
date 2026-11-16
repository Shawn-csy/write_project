#!/usr/bin/env python3
"""Read-only bounded production checks; stdout is sanitized JSON, exit 0/1/2."""
import argparse
import datetime as dt
import json
import math
import os
import re
from pathlib import Path
import shutil
import time
import urllib.request

LIMIT = 65536


def read_json(path):
    with open(path, 'rb') as stream:
        data = stream.read(LIMIT + 1)
    if len(data) > LIMIT:
        raise ValueError('oversize')
    result = json.loads(data)
    if not isinstance(result, dict):
        raise ValueError('object required')
    return result


def age(value, now):
    parsed = dt.datetime.fromisoformat(value.replace('Z', '+00:00'))
    seconds = (now - parsed).total_seconds()
    if seconds < -60:
        raise ValueError('future timestamp')
    return max(0, seconds)


def probe(url, timeout, receipt=False, media=False):
    started = time.monotonic()
    try:
        request = urllib.request.Request(url, headers={'User-Agent': 'write-project-monitor/1', 'Cache-Control': 'no-cache'})
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = response.read(LIMIT + 1) if receipt else response.read(1)
            if receipt:
                if len(payload) > LIMIT:
                    raise ValueError('oversize')
                payload = json.loads(payload)
                if not isinstance(payload, dict):
                    raise ValueError('object required')
            if not payload:
                raise ValueError('empty response')
            if not receipt and media and not response.headers.get('Content-Type', '').lower().startswith('image/'):
                raise ValueError('media content type')
            return {'state': 'healthy', 'latency_ms': round((time.monotonic() - started) * 1000)}, payload
    except Exception:
        return {'state': 'failed', 'reason': 'probe_failed'}, None


def freshness(path, now, maximum, timestamp):
    try:
        data = read_json(path)
        seconds = age(data[timestamp], now)
        result = {'state': 'healthy' if seconds <= maximum else 'failed', 'age_seconds': round(seconds)}
        if seconds > maximum:
            result['reason'] = 'stale'
        return result, data
    except FileNotFoundError:
        return {'state': 'unknown', 'reason': 'missing_receipt'}, {}
    except Exception:
        return {'state': 'unknown', 'reason': 'invalid_receipt'}, {}


def media_log_sample(path, now, window, threshold):
    """Nginx default combined format, bounded tail; never return raw records."""
    pattern = re.compile(r'^\S+ \S+ \S+ \[([^]]+)\] "[A-Z]+ ([^ ]+) HTTP/[^" ]+" ([0-9]{3}) ')
    try:
        with open(path, 'rb') as stream:
            stream.seek(0, 2)
            size = stream.tell()
            stream.seek(max(0, size - LIMIT))
            raw = stream.read(LIMIT)
        lines = raw.splitlines()
        truncated = size > LIMIT
        if truncated and lines:
            lines = lines[1:]
        if raw and not raw.endswith(b"\n"):
            return {'state': 'unknown', 'reason': 'partial_log_record'}
        requests = errors = malformed = 0
        for line in lines:
            match = pattern.match(line.decode('utf-8', errors='replace'))
            if not match:
                malformed += 1
                continue
            try:
                stamp = dt.datetime.strptime(match[1], '%d/%b/%Y:%H:%M:%S %z')
                seconds = (now - stamp).total_seconds()
                if seconds < -60:
                    malformed += 1
                    continue
            except ValueError:
                malformed += 1
                continue
            path = match[2].split('?', 1)[0]
            if 0 <= seconds <= window and (path.startswith('/media/') or path.startswith('/api/public-media/') or path == '/api/public-media'):
                requests += 1
                errors += int(match[3]) >= 400
        result = {'state': 'healthy', 'requests': requests, 'errors': errors,
                  'measurement': 'bounded_recent_nginx_log_sample', 'tail_truncated': truncated}
        if requests and errors / requests > threshold:
            result.update(state='failed', reason='media_error_rate')
        elif malformed or not requests:
            result.update(state='unknown', reason='malformed_log_records' if malformed else 'no_recent_media_requests')
        if requests:
            result['error_rate'] = errors / requests
        return result
    except OSError:
        return {'state': 'unknown', 'reason': 'media_log_unavailable'}


def evaluate(config, now=None, fetch=probe, disk=shutil.disk_usage):
    now = now or dt.datetime.now(dt.timezone.utc)
    checks = {}
    for name in ('api', 'media'):
        url = config.get(name + '_url')
        if not url:
            checks[name] = {'state': 'unknown', 'reason': 'unconfigured'}
            continue
        check, _ = fetch(url, config['timeout'], media=True) if name == 'media' and fetch is probe else fetch(url, config['timeout'])
        if check['state'] == 'healthy' and check['latency_ms'] > config['latency_ms']:
            check.update(state='failed', reason='slow')
        if name == 'media':
            check['measurement'] = 'single_synthetic_probe_not_error_rate'
        checks[name] = check
    checks['media_error_rate'] = {'state': 'unknown', 'reason': 'no_aggregate_source'}
    if config.get('media_stats'):
        rate, sample = freshness(config['media_stats'], now, config['freshness_seconds'], 'window_ended_at')
        try:
            total, errors = sample['requests'], sample['errors']
            if type(total) is not int or type(errors) is not int or total <= 0 or not 0 <= errors <= total:
                raise ValueError('invalid counters')
            rate['error_rate'] = errors / total
            if rate['error_rate'] > config.get('max_media_error_rate', 0.01):
                rate.update(state='failed', reason='media_error_rate')
        except (KeyError, ValueError, TypeError):
            rate = {'state': 'unknown', 'reason': 'invalid_aggregate_sample'}
        checks['media_error_rate'] = rate
    if config.get('media_access_log'):
        checks['media_error_rate'] = media_log_sample(config['media_access_log'], now, config.get('media_window_seconds', 900), config.get('max_media_error_rate', 0.01))
    pages, state = freshness(config['pages_state'], now, config['freshness_seconds'], 'checked_at')
    if state.get('failure'):
        pages.update(state='failed', reason='refresh_failed')
    elif state.get('running') or (state and state.get('phase') != 'complete'):
        try:
            elapsed = age(state.get('started_at') if state.get('running') else state.get('updated_at'), now)
            pages.update(state='failed' if elapsed > 3600 else 'unknown',
                         reason='refresh_stale' if elapsed > 3600 else 'refresh_running' if state.get('running') else 'refresh_pending')
        except Exception:
            pages.update(state='unknown', reason='invalid_refresh_timestamp')
    url = config.get('pages_url')
    if url:
        live, receipt = fetch(url, config['timeout'], receipt=True)
        expected = state.get('receipt')
        if live['state'] != 'healthy':
            pages.update(state='failed', reason='receipt_probe_failed')
        elif not isinstance(expected, dict) or not isinstance(expected.get('commit'), str) or not re.fullmatch(r'[0-9a-f]{40}', expected['commit']) or not isinstance(expected.get('digest'), str) or not re.fullmatch(r'[0-9a-f]{64}', expected['digest']) or state.get('completed_key') != expected['commit'] + ':' + expected['digest']:
            if pages['state'] != 'failed':
                pages.update(state='unknown', reason='invalid_local_receipt')
        elif pages['state'] == 'healthy' and not all(expected.get(k) and expected.get(k) == receipt.get(k) for k in ('digest', 'commit')):
            pages.update(state='failed', reason='receipt_mismatch')
    elif pages['state'] != 'failed':
        pages.update(state='unknown', reason='public_receipt_unconfigured')
    checks['pages'] = pages
    sync, state = freshness(config['sync_state'], now, config['freshness_seconds'], 'checked_at')
    if state:
        if state.get('schema_version') != 1 or state.get('status') not in ('success', 'failed') or state.get('outcome') not in ('published', 'unchanged') and state.get('status') != 'failed':
            sync.update(state='unknown', reason='invalid_receipt')
        elif state['status'] == 'failed':
            sync.update(state='failed', reason='sync_failed')
        elif type(state.get('skipped_objects')) is not int or state['skipped_objects'] < 0:
            if sync['state'] != 'failed':
                sync.update(state='unknown', reason='media_health_unverified')
        elif state['skipped_objects']:
            sync.update(state='failed', reason='media_objects_skipped')
    sync['measurement'] = 'sync_job_receipt_not_remote_object_audit'
    checks['d1_r2_sync'] = sync
    try:
        free = disk(config['disk_path']).free
        checks['disk'] = {'state': 'healthy' if free >= config['min_free_bytes'] else 'failed', 'free_bytes': free}
    except OSError:
        checks['disk'] = {'state': 'unknown', 'reason': 'disk_unavailable'}
    states = [c['state'] for c in checks.values()]
    code = 1 if 'failed' in states else 2 if 'unknown' in states else 0
    return {'schema_version': 1, 'checked_at': now.isoformat(), 'status': 'failed' if code == 1 else 'unknown' if code == 2 else 'healthy', 'checks': checks}, code


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, required=True, help='local JSON configuration (URLs never echoed)')
    args = parser.parse_args()
    root = Path(os.environ.get('WP_RELEASE_ROOT', Path(__file__).resolve().parents[1] / 'releases'))
    config = dict(timeout=5, latency_ms=2000, freshness_seconds=3600, min_free_bytes=5 * 1024**3, media_window_seconds=900,
                  disk_path=str(root), pages_state=str(root / '.content-refresh/state.json'),
                  sync_state=str(root / '.public-sync/production.json'))
    try:
        config.update(read_json(args.config))
        for key in ('timeout', 'latency_ms', 'freshness_seconds', 'min_free_bytes', 'media_window_seconds'):
            if not isinstance(config[key], (int, float)) or not math.isfinite(config[key]) or config[key] <= 0:
                raise ValueError('invalid threshold')
        if not 0 <= config.get('max_media_error_rate', 0.01) <= 1:
            raise ValueError('invalid rate threshold')
        if config['timeout'] > 30:
            raise ValueError('timeout exceeds bound')
        result, code = evaluate(config)
    except Exception:
        result, code = {'schema_version': 1, 'status': 'unknown', 'reason': 'invalid_configuration'}, 2
    print(json.dumps(result, separators=(',', ':')))
    return code


if __name__ == '__main__':
    raise SystemExit(main())
