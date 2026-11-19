import datetime as dt
import importlib.util
import json
from pathlib import Path
import tempfile
import types
import unittest

spec = importlib.util.spec_from_file_location('monitor', Path(__file__).resolve().parents[1] / 'ops/monitor-production.py')
monitor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(monitor)


class MonitorTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.now = dt.datetime(2026, 11, 16, tzinfo=dt.timezone.utc)
        self.stamp = self.now.isoformat()
        self.config = dict(timeout=1, latency_ms=100, freshness_seconds=3600, min_free_bytes=100,
                           disk_path='/', api_url='https://example.test/api', media_url='https://example.test/media',
                           pages_url='https://example.test/content-version.json',
                           pages_state=str(self.root / 'pages.json'), sync_state=str(self.root / 'sync.json'),
                           media_stats=str(self.root / 'media.json'))
        self.receipt = {'digest': 'a' * 64, 'commit': 'b' * 40, 'built_at': '2020-01-01T00:00:00Z'}
        self.write('pages.json', dict(phase='complete', checked_at=self.stamp, receipt=self.receipt, completed_key=self.receipt['commit'] + ':' + self.receipt['digest']))
        self.write('sync.json', dict(schema_version=1, status='success', outcome='published', checked_at=self.stamp, skipped_objects=0))
        self.write('media.json', dict(requests=100, errors=0, window_ended_at=self.stamp))

    def write(self, name, value):
        (self.root / name).write_text(json.dumps(value))

    def fetch(self, url, timeout, receipt=False):
        return {'state': 'healthy', 'latency_ms': 5}, self.receipt if receipt else b'x'

    def run_monitor(self, fetch=None):
        return monitor.evaluate(self.config, self.now, fetch or self.fetch, lambda _: types.SimpleNamespace(free=1000))

    def test_healthy_with_old_build_but_recent_verification(self):
        result, code = self.run_monitor()
        self.assertEqual(code, 0)
        self.assertEqual(result['status'], 'healthy')

    def test_stale_sync(self):
        self.write('sync.json', dict(schema_version=1, status='success', outcome='unchanged', checked_at='2020-01-01T00:00:00Z', skipped_objects=0))
        result, code = self.run_monitor()
        self.assertEqual(code, 1)
        self.assertEqual(result['checks']['d1_r2_sync']['reason'], 'stale')

    def test_failure_does_not_print_credentials_or_exception(self):
        def failed(*args, **kwargs):
            return {'state': 'failed', 'reason': 'probe_failed'}, None
        result, code = self.run_monitor(failed)
        self.assertEqual(code, 1)
        self.assertNotIn('https', json.dumps(result))

    def test_malformed_partial_missing(self):
        (self.root / 'sync.json').write_text('{')
        self.config.pop('media_stats')
        result, code = self.run_monitor()
        self.assertEqual(code, 2)
        self.assertEqual(result['checks']['d1_r2_sync']['reason'], 'invalid_receipt')
        self.assertEqual(result['checks']['media_error_rate']['state'], 'unknown')

    def test_skipped_media_and_receipt_mismatch(self):
        self.write('sync.json', dict(schema_version=1, status='success', outcome='unchanged', checked_at=self.stamp, skipped_objects=2))
        self.write('pages.json', dict(phase='complete', checked_at=self.stamp, receipt={'digest': 'c' * 64, 'commit': 'b' * 40}, completed_key='b' * 40 + ':' + 'c' * 64))
        result, code = self.run_monitor()
        self.assertEqual(code, 1)
        self.assertEqual(result['checks']['pages']['reason'], 'receipt_mismatch')
        self.assertEqual(result['checks']['d1_r2_sync']['reason'], 'media_objects_skipped')

    def test_invalid_counters_and_future_timestamp_are_unknown(self):
        self.write('media.json', dict(requests=0, errors=0, window_ended_at=self.stamp))
        self.write('sync.json', dict(schema_version=1, status='success', outcome='unchanged', checked_at='2099-01-01T00:00:00Z', skipped_objects=0))
        result, code = self.run_monitor()
        self.assertEqual(code, 2)
        self.assertEqual(result['checks']['media_error_rate']['state'], 'unknown')
        self.assertEqual(result['checks']['d1_r2_sync']['state'], 'unknown')
    def test_running_pending_stale_and_failure(self):
        base = dict(phase='complete', checked_at=self.stamp, receipt=self.receipt,
                    completed_key=self.receipt['commit'] + ':' + self.receipt['digest'],
                    running=True, started_at=self.stamp)
        self.write('pages.json', base)
        self.assertEqual(self.run_monitor()[0]['checks']['pages']['reason'], 'refresh_running')
        base['started_at'] = '2020-01-01T00:00:00Z'
        self.write('pages.json', base)
        self.assertEqual(self.run_monitor()[0]['checks']['pages']['state'], 'failed')
        base.update(started_at=self.stamp, failure={'stage': 'build'})
        self.write('pages.json', base)
        self.assertEqual(self.run_monitor()[0]['checks']['pages']['reason'], 'refresh_failed')
        base.update(running=False, failure=None, phase='deferred', updated_at=self.stamp)
        self.write('pages.json', base)
        self.assertEqual(self.run_monitor()[0]['checks']['pages']['reason'], 'refresh_pending')

    def test_missing_configuration_never_hides_measured_failure(self):
        self.config.pop('pages_url')
        self.write('pages.json', dict(phase='complete', checked_at=self.stamp, failure={'stage': 'build'}))
        self.write('sync.json', dict(schema_version=1, status='success', outcome='unchanged', checked_at='2020-01-01T00:00:00Z', skipped_objects=None))
        result, code = self.run_monitor()
        self.assertEqual(code, 1)
        self.assertEqual(result['checks']['pages']['reason'], 'refresh_failed')
        self.assertEqual(result['checks']['d1_r2_sync']['reason'], 'stale')


class LogTests(unittest.TestCase):
    def sample(self, content):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'access.log'
            path.write_text(content)
            return monitor.media_log_sample(path, dt.datetime(2026, 11, 16, tzinfo=dt.timezone.utc), 900, 0.1)

    def test_healthy_and_error_rate(self):
        line = '127.0.0.1 - - [16/Nov/2026:00:00:00 +0000] "GET /media/a.png HTTP/1.1" 200 5 "-" "agent"\n'
        self.assertEqual(self.sample(line)['state'], 'healthy')
        self.assertEqual(self.sample(line.replace('/media/a.png', '/api/public-media?token=secret'))['requests'], 1)
        self.assertEqual(self.sample(line.replace('200 5', '404 5'))['state'], 'failed')

    def test_partial_malformed_no_recent_requests(self):
        self.assertEqual(self.sample('partial')['reason'], 'partial_log_record')
        self.assertEqual(self.sample('malformed\n')['reason'], 'malformed_log_records')
        self.assertEqual(self.sample('')['reason'], 'no_recent_media_requests')

class ProbeTests(unittest.TestCase):
    def test_media_rejects_empty_and_html_responses(self):
        from unittest.mock import patch
        class Response:
            headers = {'Content-Type': 'image/png'}
            def __enter__(self):
                return self
            def __exit__(self, *args):
                pass
            def read(self, limit):
                return b''
        with patch.object(monitor.urllib.request, 'urlopen', return_value=Response()):
            self.assertEqual(monitor.probe('https://example.test/media', 1, media=True)[0]['state'], 'failed')
        Response.read = lambda self, limit: b'x'
        Response.headers = {'Content-Type': 'text/html'}
        with patch.object(monitor.urllib.request, 'urlopen', return_value=Response()):
            self.assertEqual(monitor.probe('https://example.test/media', 1, media=True)[0]['state'], 'failed')


if __name__ == '__main__':
    unittest.main()
