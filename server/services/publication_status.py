"""Bounded, sanitized view of the host's publication journal (no network or capture)."""
from datetime import datetime, timezone
import json
import os
import re
import stat
from pathlib import Path


def timestamp(value):
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
        return parsed.astimezone(timezone.utc).isoformat() if parsed.tzinfo else None
    except ValueError:
        return None


def publication_status():
    result = dict(scope='site', status='unknown', updatedAt=None, completedAt=None,
                  checkedAt=None, stale=False, itemInclusion='unknown')
    directory = os.environ.get('WP_PUBLICATION_STATE_DIR')
    if not directory:
        return result
    try:
        path = Path(directory) / 'state.json'
        descriptor = os.open(path, os.O_RDONLY | os.O_NONBLOCK | os.O_NOFOLLOW)
        with os.fdopen(descriptor, 'rb') as handle:
            if not stat.S_ISREG(os.fstat(handle.fileno()).st_mode):
                return result
            raw = handle.read(65537)
        if len(raw) > 65536:
            return result
        state = json.loads(raw)
        if not isinstance(state, dict):
            return result
    except (OSError, ValueError):
        return result
    updated = timestamp(state.get('updated_at'))
    if updated and datetime.fromisoformat(updated) > datetime.now(timezone.utc):
        return result
    phase = state.get('phase')
    status = 'unknown'
    stale = False
    if state.get('failure'):
        status = 'failed'
    elif state.get('running') or phase in ('pending', 'uploading', 'uploaded'):
        status = 'running'
        stale = updated is None or (datetime.now(timezone.utc) - datetime.fromisoformat(updated)).total_seconds() > 3600
    elif phase == 'deferred':
        status = 'pending'
    elif phase == 'complete':
        receipt = state.get('receipt')
        # Require verified journal evidence, not merely a previous global success label.
        if isinstance(receipt, dict) and isinstance(receipt.get('commit'), str) and re.fullmatch(r'[0-9a-f]{40}', receipt['commit']) and isinstance(receipt.get('digest'), str) and re.fullmatch(r'[0-9a-f]{64}', receipt['digest']) and state.get('completed_key') == receipt['commit'] + ':' + receipt['digest']:
            status = 'complete'
            checked = timestamp(state.get('checked_at'))
            stale = checked is None or not 0 <= (datetime.now(timezone.utc) - datetime.fromisoformat(checked)).total_seconds() <= 3600
    result.update(status=status, stale=stale, updatedAt=updated,
                  completedAt=timestamp(state.get('completed_at')), checkedAt=timestamp(state.get('checked_at')))
    return result
