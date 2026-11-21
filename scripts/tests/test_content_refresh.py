"""Offline public capture and orchestration contracts."""
import copy
from contextlib import ExitStack
import importlib.util
import json
import io
from pathlib import Path
import sys
import tempfile
import threading
import time
from unittest.mock import Mock, patch
import unittest
from urllib.error import HTTPError
from urllib.request import urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "release"))
import content_snapshot as snap
import importlib
fixture_spec = importlib.util.spec_from_file_location('fixture', Path(__file__).with_name('public-build-fixture.py'))
fixture = importlib.util.module_from_spec(fixture_spec)
fixture_spec.loader.exec_module(fixture)
spec = importlib.util.spec_from_file_location('refresh', Path(__file__).resolve().parents[1] / 'release/content-refresh.py')
refresh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(refresh)


def snapshot():
    def reader(path):
        if path == '/api/public-bundle': return dict(fixture.BUNDLE, scripts=[fixture.SCRIPT])
        if path == '/api/themes/public': return []
        if path.startswith('/api/public-scripts/'): return fixture.SCRIPT
        if path.startswith('/api/public-scripts'): return [fixture.SCRIPT]
        if path == '/api/public-personas': return [fixture.PERSONA]
        if path.startswith('/api/public-personas/'): return fixture.PERSONA
        if path == '/api/public-organizations': return [fixture.ORGANIZATION]
        if path.startswith('/api/public-organizations/'): return fixture.ORGANIZATION
        raise AssertionError(path)
    return snap.capture(reader)


class SnapshotTests(unittest.TestCase):
    def test_capture_bounds_parallel_reads_and_keeps_identity_order(self):
        data = snapshot()
        personas = [dict(fixture.PERSONA, id=f'person-{index}') for index in range(20)]
        data['/api/public-bundle']['personas'] = personas
        data['/api/public-personas'] = personas
        for person in personas:
            ident = person['id']
            data['/api/public-personas/' + ident] = person
            data['/api/public-scripts?personaId=' + ident] = []
        active = peak = 0
        guard = threading.Lock()
        def reader(path):
            nonlocal active, peak
            with guard:
                active += 1
                peak = max(peak, active)
            try:
                time.sleep(0.01)
                return data[path]
            finally:
                with guard:
                    active -= 1
        result = snap.capture(reader)
        self.assertGreater(peak, 1)
        self.assertLessEqual(peak, snap.CAPTURE_WORKERS)
        self.assertEqual([key for key in result if key.startswith('/api/public-personas/')],
                         ['/api/public-personas/' + person['id'] for person in personas])

    def test_tag_relation_order_is_not_content_skew(self):
        tags = [{'id': 'a', 'name': 'A'}, {'id': 'b', 'name': 'B'}]
        snap.require_common_fields({'tags': tags}, {'tags': list(reversed(tags))})
        with self.assertRaises(snap.ContentError):
            snap.require_common_fields({'tags': tags}, {'tags': [{'id': 'a', 'name': 'Changed'}, tags[1]]})

    def test_public_json_uses_identified_publisher_request(self):
        handle = io.BytesIO(b'{"ok": true}')
        handle.status = 200
        with patch.object(snap, 'urlopen', return_value=handle) as fetch:
            self.assertEqual(snap.read_json(snap.API + '/api/public-bundle'), {'ok': True})
        request = fetch.call_args.args[0]
        self.assertEqual(request.get_header('User-agent'), snap.USER_AGENT)
        self.assertEqual(request.get_header('Accept'), 'application/json')

    def test_content_counter_order_and_nested_order(self):
        data = snapshot(); before = snap.fingerprint(data)
        data['/api/public-scripts'][0]['views'] = 123
        data['/api/public-bundle']['topTags'] = [{'name': 'ranking'}]
        self.assertEqual(before, snap.fingerprint(data))
        data['/api/public-scripts/fixture-script']['content'] += ' edited'
        self.assertNotEqual(before, snap.fingerprint(data))
        data = snapshot()
        data['/api/public-bundle']['banner']['items'] = [{'id':'1'}, {'id':'2'}]
        before = snap.fingerprint(data)
        data['/api/public-bundle']['banner']['items'].reverse()
        self.assertNotEqual(before, snap.fingerprint(data))
        data['/api/public-scripts'].append(dict(fixture.SCRIPT, id='second'))
        before = snap.fingerprint(data)
        data['/api/public-scripts'].reverse()
        self.assertEqual(before, snap.fingerprint(data))
        del data['/api/public-scripts/fixture-script']
        self.assertNotEqual(before, snap.fingerprint(data))

    def test_capture_requires_details_and_full_bundle(self):
        with self.assertRaises(snap.ContentError): snap.capture(lambda path: {})
        data = snapshot()
        data['/api/public-scripts/fixture-script'].pop('content')
        with self.assertRaises(snap.ContentError): snap.capture(lambda path: data[path])

    def test_cached_projection_skew_fails_and_empty_route_manifest(self):
        data = snapshot()
        data['/api/public-bundle']['scripts'][0]['title'] = 'old cached title'
        with self.assertRaises(snap.ContentError): snap.capture(lambda path: data[path])
        data = snapshot()
        self.assertNotIn('read/[id]', snap.empty_routes(data))
        data['/api/public-bundle']['scripts'] = []
        data['/api/public-scripts'] = []
        self.assertIn('read/[id]', snap.empty_routes(data))
        self.assertTrue(set(snap.empty_routes(data)).issubset({'read/[id]', 'author/[id]', 'org/[id]', 'author/external/[name]', 'org/external/[name]', 'series/[name]', 'tag/[name]', 'resources/[id]'}))

    def test_frozen_adapter_projection_and_poison(self):
        data = snapshot()
        with snap.frozen_server(data) as (origin, failures):
            data['/api/public-bundle']['scripts'] = []
            with urlopen(origin + '/api/public-bundle?sections=scripts,banner') as response:
                self.assertEqual(len(json.load(response)['scripts']), 1)
            with self.assertRaises(HTTPError): urlopen(origin + '/api/private')
            self.assertEqual(failures, ['/api/private'])


class SmokeTests(unittest.TestCase):
    def test_names_follow_trimmed_static_params_semantics(self):
        data = snapshot()
        bundle = data['/api/public-bundle']
        bundle['scripts'][0]['series'] = {'name': '   '}
        bundle['scripts'][0]['tags'] = [{'name': '  '}, ' ']
        bundle['externalPublicScripts'][0]['seriesName'] = ' '
        bundle['externalPublicScripts'][0]['categories'] = ['  ']
        self.assertTrue({'series/[name]', 'tag/[name]'}.issubset(set(snap.empty_routes(data))))
        bundle['scripts'][0]['series']['name'] = ' Valid series '
        bundle['scripts'][0]['tags'] = [{'name': ' Valid tag '}]
        self.assertNotIn('series/[name]', snap.empty_routes(data))
        self.assertNotIn('tag/[name]', snap.empty_routes(data))

    def test_smoke_checks_identity_environment_sitemap_and_quoted_url(self):
        data = snapshot()
        script = data['/api/public-scripts'][0]
        detail = data.pop('/api/public-scripts/fixture-script')
        script['id'] = detail['id'] = 'fixture script'
        data['/api/public-scripts/fixture%20script'] = detail
        homepage = '<html data-deploy-environment="production"><title>Home</title></html>'
        reader = '<html data-deploy-environment="production"><title>Fixture Script | Brand</title><link rel="canonical" href="https://open-scripts.shawnup.com/read/fixture%20script"></html>'
        sitemap = '<urlset><url><loc>https://open-scripts.shawnup.com/read/fixture%20script</loc></url></urlset>'
        receipt = {'digest': 'digest', 'commit': 'a' * 40}
        responses = {'/': homepage, '/authors': homepage, '/sitemap.xml': sitemap, '/read/fixture%20script': reader}
        requested = []
        def response(request, timeout):
            from urllib.parse import urlsplit
            self.assertEqual(request.get_header('User-agent'), snap.USER_AGENT)
            path = urlsplit(request.full_url).path
            requested.append(path)
            handle = io.BytesIO(responses[path].encode())
            handle.status = 200
            return handle
        with patch.object(refresh, 'read_json', return_value=receipt), patch('urllib.request.urlopen', side_effect=response):
            refresh.Commands().verify(receipt, data)
            self.assertIn('/read/fixture%20script', requested)
            responses['/read/fixture%20script'] = homepage
            with self.assertRaises(snap.ContentError): refresh.Commands().verify(receipt, data)
            responses['/read/fixture%20script'] = reader.replace('/read/fixture%20script', '/read/wrong')
            with self.assertRaises(snap.ContentError): refresh.Commands().verify(receipt, data)
            responses['/read/fixture%20script'] = reader
            responses['/'] = homepage.replace('production', 'development')
            with self.assertRaises(snap.ContentError): refresh.Commands().verify(receipt, data)
            responses['/'] = homepage
            responses['/sitemap.xml'] = sitemap.replace('fixture%20script', 'withdrawn')
            with self.assertRaises(snap.ContentError): refresh.Commands().verify(receipt, data)

    def test_receipt_mismatch_and_network_failure_are_distinct(self):
        commands = refresh.Commands()
        with patch.object(refresh, 'read_json', return_value={'other': True}):
            self.assertFalse(commands.receipt_matches({'digest': 'expected'}))
        with patch.object(refresh, 'read_json', return_value={'digest': 'expected'}) as read:
            self.assertTrue(commands.receipt_matches({'digest': 'expected'}))
            read.assert_called_once_with(snap.PUBLIC + '/content-version.json', revalidate=True)
        with patch.object(refresh, 'read_json', side_effect=TimeoutError('network unavailable')):
            with self.assertRaises(TimeoutError): commands.receipt_matches({'digest': 'expected'})



class FakeCommands:
    def __init__(self, root):
        self.root = root; self.built = 0; self.uploads = 0; self.verified = 0; self.fail_verify = False
    def output(self, args): return '' if args[1] == 'status' else 'a' * 40
    def live(self): return dict(edge='wp-site-test-edge', api='wp-site-test-api', public='wp-site-test-public', static=str(self.root / 'test'), id='container-id')
    def build(self, output, data): self.built += 1; output.mkdir()
    def upload(self, output): self.uploads += 1; self.receipt = json.loads((output / 'content-version.json').read_text())
    def receipt_matches(self, receipt): return receipt == getattr(self, "receipt", None)
    def verify(self, receipt, data):
        self.verified += 1
        if self.fail_verify: raise snap.ContentError('verify failed')
        assert receipt == self.receipt


class RefreshTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve(); self.commands = FakeCommands(self.root)
        control = self.root / '.release-workflow'; control.mkdir()
        (control / 'test.json').write_text(json.dumps(dict(phase='complete', tag='test', commit='a'*40, ingress=self.commands.live())))

    def test_source_resolution_exact_and_read_only(self):
        before = sorted(self.root.rglob('*'))
        self.assertEqual(refresh.resolve_source(self.root, self.commands), 'a'*40)
        self.assertEqual(before, sorted(self.root.rglob('*')))
        self.commands.live = lambda: dict(edge='wp-site-test-edge')
        with self.assertRaises(snap.ContentError): refresh.resolve_source(self.root, self.commands)

    def test_retry_verify_without_rebuild_then_noop(self):
        job = refresh.Refresh(self.root, self.commands, snapshot)
        self.commands.fail_verify = True
        with self.assertRaises(snap.ContentError): job.run()
        self.assertEqual(json.loads(job.path.read_text())['phase'], 'uploaded')
        self.commands.fail_verify = False
        job.run(); job.run()
        self.assertEqual((self.commands.built, self.commands.uploads, self.commands.verified), (1,1,2))
        self.assertEqual(json.loads(job.path.read_text())['phase'], 'complete')

    def test_status_timestamps_and_capture_failure(self):
        job = refresh.Refresh(self.root, self.commands, snapshot)
        job.run()
        first = json.loads(job.path.read_text())
        self.assertFalse(first['running'])
        self.assertIsNotNone(first['completed_at'])
        with patch.object(refresh.release, 'now', return_value='2099-01-01T00:00:00Z'):
            job.run()
        checked = json.loads(job.path.read_text())
        self.assertEqual(checked['completed_at'], first['completed_at'])
        self.assertEqual(checked['checked_at'], '2099-01-01T00:00:00Z')
        def fail_capture():
            self.assertTrue(json.loads(job.path.read_text())['running'])
            raise snap.ContentError('capture failed')
        job.collector = fail_capture
        with self.assertRaises(snap.ContentError): job.run()
        failed = json.loads(job.path.read_text())
        self.assertFalse(failed['running'])
        self.assertEqual(failed['failure']['stage'], 'capture')
        self.assertEqual(failed['completed_at'], first['completed_at'])

    def test_superseded_receipt_rebuilds_and_reverted_pending_does_not_noop(self):
        data = snapshot()
        job = refresh.Refresh(self.root, self.commands, lambda: copy.deepcopy(data))
        job.run()
        self.commands.receipt = {'superseded': True}
        job.run()
        self.assertEqual(self.commands.built, 2)
        original = copy.deepcopy(data)
        data['/api/public-scripts/fixture-script']['content'] += ' new'
        self.commands.fail_verify = True
        with self.assertRaises(snap.ContentError): job.run()
        data = original
        self.commands.fail_verify = False
        job.run()
        self.assertEqual(self.commands.built, 4)

    def test_changed_during_build_defers(self):
        data = snapshot(); changed = copy.deepcopy(data)
        changed['/api/public-scripts/fixture-script']['content'] += 'changed'
        captures = iter([data, changed])
        job = refresh.Refresh(self.root, self.commands, lambda: next(captures))
        job.run()
        self.assertEqual(self.commands.uploads, 0)
        self.assertEqual(json.loads(job.path.read_text())['phase'], 'deferred')

    def test_lock_exclusion(self):
        with ExitStack() as stack:
            refresh.lock(stack, self.root / '.pages-publish/.lock')
            with self.assertRaises(snap.ContentError):
                with ExitStack() as second: refresh.lock(second, self.root / '.pages-publish/.lock')

    def test_actual_build_and_upload_command_arguments(self):
        commands = refresh.Commands()
        with patch.object(commands, 'execute') as execute, patch.object(refresh, 'validate_export'):
            commands.build(self.root / 'new-output', snapshot())
            args, env = execute.call_args.args
            self.assertEqual(args, ['bash', 'scripts/release/release.sh', 'pages-build'])
            self.assertTrue(env['BACKEND_API_URL'].startswith('http://127.0.0.1:'))
            self.assertEqual(env['PUBLIC_PAGES_OUTPUT_DIR'], str(self.root / 'new-output'))
            self.assertEqual(env['ALLOW_EMPTY_PUBLIC_BUILD'], '1')
            commands.upload(self.root / 'new-output')
            self.assertEqual(execute.call_args.args[0], ['bash', 'scripts/release/release.sh', 'pages-upload', str(self.root / 'new-output')])

    def test_common_pages_wrapper_uses_frozen_build_and_same_fresh_output(self):
        spec = importlib.util.spec_from_file_location('pages_lock', Path(__file__).resolve().parents[1] / 'release/content-pages-lock.py')
        wrapper = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(wrapper)
        data = snapshot()
        commands = Mock()
        commands.output.side_effect = lambda args: 'a' * 40 if args[1] == 'rev-parse' else ''
        commands.build.side_effect = lambda output, _snapshot: output.mkdir()
        uploaded = []
        commands.upload.side_effect = lambda output: uploaded.append(json.loads((output / 'content-version.json').read_text()))
        wrapper.publish(self.root, commands, lambda: copy.deepcopy(data))
        output, captured = commands.build.call_args.args
        self.assertEqual(captured, data)
        self.assertEqual(commands.upload.call_args.args, (output,))
        self.assertEqual(output.name, 'out')
        self.assertNotEqual(output, refresh.ROOT / 'apps/public/out')
        self.assertFalse(output.parent.exists())
        receipt = uploaded[0]
        self.assertEqual(receipt['commit'], 'a' * 40)
        self.assertEqual(receipt['digest'], snap.fingerprint(data))
        commands.verify.assert_called_once_with(receipt, data)
        self.assertEqual(json.loads((self.root / '.content-refresh/state.json').read_text())['receipt'], receipt)
        commands.reset_mock()
        changed = copy.deepcopy(data)
        changed['/api/public-scripts/fixture-script']['content'] += 'changed'
        captures = iter([data, changed])
        with self.assertRaises(snap.ContentError):
            wrapper.publish(self.root, commands, lambda: next(captures))
        commands.build.assert_called_once()
        commands.upload.assert_not_called()

    def test_workflow_trusted_and_pinned(self):
        text = (refresh.ROOT / '.github/workflows/content-refresh.yml').read_text()
        self.assertIn('group: production-deploy', text)
        self.assertIn('cancel-in-progress: false', text)
        self.assertIn('ref: ${{ steps.live.outputs.sha }}', text)
        self.assertNotIn('pull_request', text)
        self.assertNotIn('release.sh auto', text)
        self.assertLess(text.index('resolve-source'), text.index('ref: ${{ steps.live.outputs.sha }}'))


if __name__ == '__main__': unittest.main()
