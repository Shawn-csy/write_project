"""Independent offline regression tests for content publication failure recovery."""
from contextlib import ExitStack
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import Mock, patch
from urllib.error import HTTPError, URLError

from test_content_refresh import FakeCommands, refresh, snapshot


class FailureCommands(FakeCommands):
    def __init__(self, root):
        super().__init__(root)
        self.fail_build = False
        self.fail_upload = False
        self.dirty = False
        self.head = 'a' * 40

    def output(self, args):
        return (' M tracked-file' if self.dirty else '') if args[1] == 'status' else self.head

    def build(self, output, data):
        super().build(output, data)
        if self.fail_build:
            raise subprocess.CalledProcessError(1, ['offline-build'])

    def upload(self, output):
        if self.fail_upload:
            self.uploads += 1
            raise subprocess.CalledProcessError(1, ['offline-upload'])
        super().upload(output)


class FailureRecoveryTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.root = Path(directory.name).resolve()
        self.commands = FailureCommands(self.root)
        self.journal = self.root / '.release-workflow/test.json'
        self.journal.parent.mkdir()
        self.journal.write_text(json.dumps(dict(phase='complete', tag='test', commit='a'*40, ingress=self.commands.live())))
        self.collector = Mock(side_effect=snapshot)
        self.job = refresh.Refresh(self.root, self.commands, self.collector)

    def state(self):
        return json.loads(self.job.path.read_text())

    def test_failed_build_retries_same_content(self):
        self.commands.fail_build = True
        with self.assertRaises(subprocess.CalledProcessError):
            self.job.run()
        failed = self.state()
        self.assertEqual(failed['failure']['stage'], 'build')
        self.assertNotIn('completed_key', failed)
        self.assertEqual(self.commands.uploads, 0)
        self.commands.fail_build = False
        self.job.run()
        self.assertEqual((self.commands.built, self.commands.uploads), (2, 1))
        self.assertEqual(self.state()['completed_key'], failed['pending_key'])

    def test_failed_upload_retries_same_content(self):
        self.commands.fail_upload = True
        with self.assertRaises(subprocess.CalledProcessError):
            self.job.run()
        failed = self.state()
        self.assertEqual(failed['phase'], 'uploading')
        self.assertEqual(failed['failure']['stage'], 'upload')
        self.assertNotIn('completed_key', failed)
        self.assertEqual(self.commands.verified, 0)
        self.commands.fail_upload = False
        self.job.run()
        self.assertEqual((self.commands.built, self.commands.uploads, self.commands.verified), (2, 2, 1))
        self.assertEqual(self.state()['completed_key'], failed['pending_key'])

    def test_capture_failure_preserves_prior_completion(self):
        self.job.run()
        before = self.state()
        self.collector.side_effect = URLError('offline read failure')
        with self.assertRaises(URLError):
            self.job.run()
        after = self.state()
        for key in ('completed_key', 'receipt', 'phase', 'pending_key'):
            self.assertEqual(after[key], before[key])
        self.assertEqual(after['failure']['stage'], 'capture')
        self.assertEqual((self.commands.built, self.commands.uploads), (1, 1))

    def test_uploaded_receipt_network_failure_preserves_retry_then_mismatch_reuploads(self):
        self.commands.fail_verify = True
        with self.assertRaises(refresh.ContentError):
            self.job.run()
        pending = self.state()
        self.commands.fail_verify = False
        with patch.object(self.commands, 'receipt_matches', side_effect=URLError('offline')):
            with self.assertRaises(URLError):
                self.job.run()
        self.assertEqual(self.state()['phase'], 'uploaded')
        self.assertEqual(self.state()['receipt'], pending['receipt'])
        self.assertNotIn('completed_key', self.state())
        self.assertEqual((self.commands.built, self.commands.uploads), (1, 1))
        self.commands.receipt = {'replaced': True}
        self.job.run()
        self.assertEqual((self.commands.built, self.commands.uploads), (2, 2))
        self.assertEqual(self.state()['phase'], 'complete')

    def test_rejects_dirty_or_wrong_head_before_capture(self):
        for dirty, head in ((True, 'a'*40), (False, 'b'*40)):
            with self.subTest(dirty=dirty, head=head):
                self.commands.dirty, self.commands.head = dirty, head
                with self.assertRaises(refresh.ContentError):
                    self.job.run()
                self.collector.assert_not_called()
                self.assertFalse(self.job.path.exists())
                self.assertEqual((self.commands.built, self.commands.uploads), (0, 0))

    def test_rejects_missing_incomplete_or_invalid_commit_journal(self):
        original = json.loads(self.journal.read_text())
        for change in (None, {'phase': 'pages'}, {'commit': 'a'*7}, {'commit': 'b'*40}, {'ingress': {}}):
            with self.subTest(change=change):
                if change is None:
                    self.journal.unlink(missing_ok=True)
                else:
                    value = dict(original, **change)
                    self.journal.write_text(json.dumps(value))
                with self.assertRaises(refresh.ContentError):
                    self.job.run()
                self.collector.assert_not_called()
                self.assertFalse(self.job.path.exists())

    def test_each_orchestration_lock_blocks_before_reads_or_effects(self):
        for name in ('.release-workflow', '.site-release', '.pages-publish'):
            with self.subTest(lock=name), ExitStack() as held:
                refresh.lock(held, self.root / name / '.lock')
                with patch.object(self.commands, 'live', wraps=self.commands.live) as live:
                    with self.assertRaises(refresh.ContentError):
                        self.job.run()
                    live.assert_not_called()
                self.collector.assert_not_called()
                self.assertFalse(self.job.path.exists())
                self.assertEqual((self.commands.built, self.commands.uploads, self.commands.verified), (0, 0, 0))


class RealCommandBoundaryTests(unittest.TestCase):
    def test_receipt_network_errors_are_not_definite_mismatches(self):
        commands = refresh.Commands()
        receipt = {'digest': 'expected'}
        for error in (URLError('offline'), HTTPError('https://example.invalid', 503, 'down', {}, None)):
            with self.subTest(error=type(error).__name__), patch.object(refresh, 'read_json', side_effect=error):
                with self.assertRaises(type(error)):
                    commands.receipt_matches(receipt)
        with patch.object(refresh, 'read_json', side_effect=HTTPError('https://example.invalid', 404, 'gone', {}, None)):
            self.assertFalse(commands.receipt_matches(receipt))
        with patch.object(refresh, 'read_json', return_value={'digest': 'different'}):
            self.assertFalse(commands.receipt_matches(receipt))
        with patch.object(refresh, 'read_json', return_value=receipt):
            self.assertTrue(commands.receipt_matches(receipt))

    def test_actual_upload_is_only_pages_upload_and_keeps_path_single_argument(self):
        commands = refresh.Commands()
        output = Path('/tmp/output with spaces; schema --apply')
        with patch.object(commands, 'execute') as execute:
            commands.upload(output)
        execute.assert_called_once_with(['bash', 'scripts/release/release.sh', 'pages-upload', str(output)])
        script = (refresh.ROOT / 'scripts/release/release.sh').read_text()
        upload = script.split('cmd_pages_upload() {', 1)[1].split('\n}', 1)[0]
        self.assertIn('wrangler pages deploy', upload)
        for prohibited in ('cmd_schema', 'cmd_converge', 'cmd_activate', 'docker ', 'curl ', 'cmd_build'):
            self.assertNotIn(prohibited, upload)


if __name__ == '__main__':
    unittest.main()
