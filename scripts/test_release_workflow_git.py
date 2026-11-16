"""Guard regression tests using real local git history and a local bare origin."""
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from test_release_workflow import release


class GitGuardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / 'checkout'
        self.root.mkdir()
        self.git('init', '-b', 'main')
        self.git('config', 'user.email', 'test@example.invalid')
        self.git('config', 'user.name', 'Test')
        self.commit('app.py')
        self.sha = self.git('rev-parse', 'HEAD')
        origin = Path(self.temp.name) / 'origin.git'
        subprocess.run(['git', 'init', '--bare', str(origin)], check=True, capture_output=True)
        self.git('remote', 'add', 'origin', str(origin))
        self.git('push', 'origin', 'main')
        self.commands = release.Commands()
        self.rows = [dict(workflowName=name, headSha=self.sha, headBranch='main', event='push', databaseId=1, attempt=1, status='completed', conclusion='success') for name in release.REQUIRED]
        original = self.commands.output
        def output(args):
            return json.dumps(self.rows) if args[0] == 'gh' else original(args)
        self.patch = patch.object(release, 'ROOT', self.root)
        self.patch.start()
        self.addCleanup(self.patch.stop)
        self.output_patch = patch.object(self.commands, 'output', side_effect=output)
        self.output_patch.start()
        self.addCleanup(self.output_patch.stop)

    def git(self, *args):
        return subprocess.run(['git', *args], cwd=self.root, check=True, capture_output=True, text=True).stdout.strip()

    def commit(self, path, content='changed'):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content)
        self.git('add', '-A')
        self.git('commit', '-m', 'test')

    def guard(self):
        self.git('push', '--force', 'origin', 'main')
        self.git('checkout', '--detach', self.sha)
        return self.commands.guard()

    def test_exact_and_multiple_markdown_successors_keep_candidate_sha(self):
        self.assertEqual(self.commands.guard(), self.sha)
        for path in ('README.md', 'apps/public/a.md', 'packages/x/odd\nname.md'):
            self.commit(path)
        self.assertEqual(self.guard(), self.sha)

    def test_docs_merge_from_old_branch_uses_main_first_parent(self):
        self.git('checkout', '-b', 'docs')
        self.commit('docs/guide.md')
        self.git('checkout', 'main')
        self.commit('main.md')
        self.git('merge', '--no-ff', 'docs', '-m', 'docs merge')
        self.assertEqual(self.guard(), self.sha)

    def test_non_markdown_successors_block(self):
        for path in ('app.py', '.github/workflows/test.yml', 'docs/example.py'):
            with self.subTest(path=path):
                self.git('checkout', 'main')
                self.git('reset', '--hard', self.sha)
                self.commit(path, 'new code')
                with self.assertRaises(release.ReleaseError):
                    self.guard()

    def test_code_then_revert_blocks_even_with_identical_endpoint(self):
        self.commit('app.py', 'new code')
        self.git('revert', '--no-edit', 'HEAD')
        with self.assertRaises(release.ReleaseError):
            self.guard()

    def test_code_to_markdown_rename_blocks(self):
        self.git('mv', 'app.py', 'README.md')
        self.git('commit', '-m', 'rename')
        with self.assertRaises(release.ReleaseError):
            self.guard()

    def test_special_markdown_mode_blocks(self):
        self.commit('guide.md')
        (self.root / 'guide.md').chmod(0o755)
        self.git('add', 'guide.md')
        self.git('commit', '-m', 'mode')
        with self.assertRaises(release.ReleaseError):
            self.guard()

    def test_markdown_symlink_blocks(self):
        (self.root / 'guide.md').symlink_to('app.py')
        self.git('add', 'guide.md')
        self.git('commit', '-m', 'symlink')
        with self.assertRaises(release.ReleaseError):
            self.guard()

    def test_forcepush_and_side_parent_candidate_block(self):
        self.git('checkout', '-b', 'side')
        self.commit('side.md')
        side = self.git('rev-parse', 'HEAD')
        self.git('checkout', 'main')
        self.commit('main.md')
        self.git('merge', '--no-ff', 'side', '-m', 'merge')
        self.sha = side
        with self.assertRaises(release.ReleaseError):
            self.guard()
        self.git('checkout', 'main')
        self.git('reset', '--hard', 'HEAD~1')
        with self.assertRaises(release.ReleaseError):
            self.guard()

    def test_dirty_and_untracked_block(self):
        for path in ('app.py', 'untracked.md'):
            with self.subTest(path=path):
                (self.root / path).write_text('dirty')
                with self.assertRaisesRegex(release.ReleaseError, 'uncommitted'):
                    self.commands.guard()
                self.git('reset', '--hard', self.sha)
                self.git('clean', '-fd')

    def test_docs_ci_never_substitutes_candidate_ci(self):
        self.commit('guide.md')
        tip = self.git('rev-parse', 'HEAD')
        self.assertEqual(self.guard(), self.sha)
        for changes in ({'headSha': tip}, {'headBranch': 'other'}, {'event': 'pull_request'}, {'status': 'in_progress'}, {'conclusion': 'failure'}, {'conclusion': 'skipped'}):
            with self.subTest(changes=changes):
                original = dict(self.rows[0])
                self.rows[0].update(changes)
                with self.assertRaises(release.ReleaseError):
                    self.commands.guard()
                self.rows[0] = original
        self.rows.pop()
        with self.assertRaises(release.Pending):
            self.commands.guard()

    def test_git_error_fails_closed(self):
        self.git('remote', 'set-url', 'origin', str(self.root / 'missing'))
        with self.assertRaises(subprocess.SubprocessError):
            self.commands.guard()
