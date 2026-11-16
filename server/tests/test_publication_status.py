import json
from datetime import datetime, timezone
from services.publication_status import publication_status


def test_admin_only(client):
    assert client.get('/api/admin/publication-status').status_code == 401
    assert client.get('/api/admin/publication-status', headers={'X-User-ID': 'ordinary'}).status_code == 403
    response = client.get('/api/admin/publication-status', headers={'X-User-ID': 'admin-owner'})
    assert response.status_code == 200
    assert response.headers['cache-control'] == 'no-store'
    assert response.json()['itemInclusion'] == 'unknown'


def test_bounded_sanitized_failure_and_missing(monkeypatch, tmp_path):
    monkeypatch.setenv('WP_PUBLICATION_STATE_DIR', str(tmp_path))
    assert publication_status()['status'] == 'unknown'
    path = tmp_path / 'state.json'
    for payload in ('invalid secret /host/path', '[]', 'x' * 65537):
        path.write_text(payload)
        assert publication_status()['status'] == 'unknown'
    path.write_text(json.dumps({'phase': 'complete', 'failure': {'error': 'secret /host/path'}}))
    result = publication_status()
    assert result['status'] == 'failed'
    assert 'secret' not in json.dumps(result)


def test_receipt_and_stale_running(monkeypatch, tmp_path):
    monkeypatch.setenv('WP_PUBLICATION_STATE_DIR', str(tmp_path))
    path = tmp_path / 'state.json'
    state = {'phase': 'complete', 'receipt': {'commit': 'a' * 40, 'digest': 'b' * 64}}
    path.write_text(json.dumps(state))
    assert publication_status()['status'] == 'unknown'
    state['completed_key'] = 'a' * 40 + ':' + 'b' * 64
    path.write_text(json.dumps(state))
    assert publication_status()['status'] == 'complete'
    state.update(running=True, updated_at='2000-01-01T00:00:00+00:00')
    path.write_text(json.dumps(state))
    assert publication_status()['stale'] is True
    state['updated_at'] = datetime.now(timezone.utc).isoformat()
    path.write_text(json.dumps(state))
    assert publication_status()['status'] == 'running'
    assert publication_status()['stale'] is False


def test_unsafe_files_and_future_time(monkeypatch, tmp_path):
    monkeypatch.setenv('WP_PUBLICATION_STATE_DIR', str(tmp_path))
    path = tmp_path / 'state.json'
    path.symlink_to('/etc/passwd')
    assert publication_status()['status'] == 'unknown'
    path.unlink()
    import os
    os.mkfifo(path)
    assert publication_status()['status'] == 'unknown'
    path.unlink()
    path.write_text(json.dumps({'phase': 'complete', 'receipt': {'commit': None, 'digest': None}, 'completed_key': 'None:None'}))
    assert publication_status()['status'] == 'unknown'
    path.write_text(json.dumps({'running': True, 'updated_at': '2999-01-01T00:00:00Z'}))
    assert publication_status()['status'] == 'unknown'


def test_malformed_timestamp_and_phase_types(monkeypatch, tmp_path):
    monkeypatch.setenv('WP_PUBLICATION_STATE_DIR', str(tmp_path))
    path = tmp_path / 'state.json'
    path.write_text(json.dumps({'phase': [], 'updated_at': {}, 'completed_at': 1, 'checked_at': []}))
    assert publication_status()['status'] == 'unknown'
    path.write_text(json.dumps({'phase': 'complete', 'receipt': {'commit': 'a' * 40, 'digest': 'b' * 64}, 'completed_key': 'a' * 40 + ':' + 'b' * 64}))
    assert publication_status()['stale'] is True
