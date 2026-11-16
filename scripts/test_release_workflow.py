"""Exercise the real release state machine without production executables."""
import fcntl
import importlib.util
import json
import io
import os
import subprocess
import sys
import time
from types import SimpleNamespace
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location('release_workflow', Path(__file__).with_name('release-workflow.py'))
release = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(release)
SHA = 'a' * 40
TAG = 'auto-aaaaaaa'


class FakeCommands:
    def __init__(self, root):
        self.root = Path(root).resolve()
        self.sha = SHA
        self.calls = []
        self.fail = None
        self.live_value = {'edge': 'previous', 'id': 'previous', 'api': 'previous', 'public': 'previous', 'static': '/previous'}
        self.guards = 0
        self.after = None

    def guard(self):
        self.guards += 1
        return self.sha

    def live(self):
        return dict(self.live_value)

    def activate(self, tag):
        self.live_value = dict(edge=f'wp-site-{tag}-edge', id='exact-container-id', api=f'wp-site-{tag}-api', public=f'wp-site-{tag}-public', static=str(self.root / tag))

    def step(self, phase, tag, apply_schema=False):
        self.calls.append(phase)
        if phase == 'cutover':
            self.activate(tag)
        if self.fail == phase:
            raise subprocess.CalledProcessError(7, ['mock', 'SECRET'])
        if self.after:
            self.after(phase)


class WorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.commands = FakeCommands(self.root)
        self.flow = release.Workflow(self.root, self.commands)

    def run_release(self, action='auto', tag=None):
        self.flow.run(action, tag)

    def journal(self):
        return json.loads((self.flow.control / f'{TAG}.json').read_text())

    def test_failures_resume_without_reactivation_or_duplicate_completed_jobs(self):
        for failed, expected, phase in (
            ('converge', ['converge', 'pages', 'verify', 'retire', 'prune'], 'activated'),
            ('pages', ['pages', 'verify', 'retire', 'prune'], 'converged'),
            ('verify', ['verify', 'retire', 'prune'], 'pages'),
        ):
            with self.subTest(failed=failed), tempfile.TemporaryDirectory() as root:
                commands = FakeCommands(root)
                flow = release.Workflow(root, commands)
                commands.fail = failed
                with self.assertRaises(subprocess.CalledProcessError):
                    flow.run('auto')
                journal = json.loads((flow.control / f'{TAG}.json').read_text())
                self.assertEqual(journal['phase'], phase)
                self.assertEqual(journal['failure']['exit_code'], 7)
                self.assertNotIn('SECRET', json.dumps(journal))
                self.assertNotIn('prune', commands.calls)
                commands.calls.clear()
                commands.fail = None
                flow.run('auto')
                self.assertEqual(commands.calls, expected)
                self.assertEqual(json.loads((flow.control / f'{TAG}.json').read_text())['phase'], 'complete')

    def test_crash_after_cutover_reconciles_durable_intent(self):
        self.commands.fail = 'cutover'
        with self.assertRaises(subprocess.CalledProcessError):
            self.run_release()
        self.assertEqual(self.journal()['phase'], 'activation-intent')
        self.commands.fail = None
        self.commands.calls.clear()
        self.run_release('resume', TAG)
        self.assertEqual(self.commands.calls, ['converge', 'pages', 'verify'])

    def test_completed_matching_release_is_noop_but_still_guards(self):
        self.run_release()
        self.commands.calls.clear()
        self.run_release()
        self.assertEqual(self.commands.calls, [])
        self.assertEqual(self.commands.guards, 3)
        self.assertEqual(self.journal()['commit'], SHA)
        self.assertIn('complete', self.journal()['timestamps'])

    def test_new_code_before_cutover_blocks_activation(self):
        def change(phase):
            if phase == 'prepare':
                def reject():
                    raise release.ReleaseError('new code on main')
                self.commands.guard = reject
        self.commands.after = change
        with self.assertRaisesRegex(release.ReleaseError, 'new code'):
            self.run_release()
        self.assertNotIn('cutover', self.commands.calls)
        self.assertEqual(self.journal()['phase'], 'preparing')
        self.assertEqual(self.journal()['failure']['phase'], 'pre-cutover-guard')

    def test_no_new_main_guard_after_cutover(self):
        def change(phase):
            if phase == 'cutover':
                def reject():
                    raise release.ReleaseError('main moved')
                self.commands.guard = reject
        self.commands.after = change
        self.run_release()
        self.assertEqual(self.journal()['phase'], 'complete')

    def test_wrong_sha_rejected(self):
        self.run_release()
        self.commands.sha = 'b' * 40
        with self.assertRaisesRegex(release.ReleaseError, 'differs'):
            self.run_release('resume', TAG)

    def test_superseded_or_rolledback_or_replaced_ingress_rejected(self):
        self.run_release()
        for key in ('edge', 'id', 'api', 'public', 'static'):
            with self.subTest(key=key):
                original = self.commands.live_value[key]
                self.commands.live_value[key] = 'unexpected'
                with self.assertRaisesRegex(release.ReleaseError, 'ingress changed'):
                    self.run_release('resume', TAG)
                self.commands.live_value[key] = original

    def test_live_legacy_without_journal_rejected(self):
        self.commands.activate(TAG)
        with self.assertRaisesRegex(release.ReleaseError, 'legacy'):
            self.run_release()
        self.assertEqual(self.commands.calls, [])

    def test_partial_legacy_match_never_rebuilds_live_api(self):
        self.commands.live_value['api'] = f'wp-site-{TAG}-api'
        with self.assertRaisesRegex(release.ReleaseError, 'legacy'):
            self.run_release()
        self.assertEqual(self.commands.calls, [])

    def test_pre_cutover_failure_fails_closed_on_retry(self):
        self.commands.fail = 'prepare'
        with self.assertRaises(subprocess.CalledProcessError):
            self.run_release()
        self.commands.fail = None
        self.commands.calls.clear()
        with self.assertRaisesRegex(release.ReleaseError, 'Pre-cutover'):
            self.run_release()
        self.assertEqual(self.commands.calls, [])

    def test_changed_ingress_after_phase_stops_before_next_phase_and_cleanup(self):
        def change(phase):
            if phase == 'pages':
                self.commands.live_value['id'] = 'new-ingress'
        self.commands.after = change
        with self.assertRaisesRegex(release.ReleaseError, 'ingress changed'):
            self.run_release()
        self.assertNotIn('verify', self.commands.calls)
        self.assertNotIn('prune', self.commands.calls)
        self.assertEqual(self.journal()['phase'], 'converged')

    def test_lock_blocks_second_process_and_is_not_inherited(self):
        self.flow.control.mkdir()
        with (self.flow.control / '.lock').open('a+') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with self.assertRaisesRegex(release.ReleaseError, 'Another release'):
                self.run_release()
        self.run_release()
        self.assertEqual(self.journal()['phase'], 'complete')

    def test_direct_rollback_lock_blocked_through_post_cutover(self):
        def inspect_lock(phase):
            if phase in ('converge', 'pages', 'verify'):
                with (self.root / '.site-release/.lock').open('a+') as lock:
                    with self.assertRaises(BlockingIOError):
                        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        self.commands.after = inspect_lock
        self.run_release()
        with (self.root / '.site-release/.lock').open('a+') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)

    def test_resume_blocked_by_direct_site_mutation(self):
        self.commands.fail = 'pages'
        with self.assertRaises(subprocess.CalledProcessError):
            self.run_release()
        self.commands.calls.clear()
        with (self.root / '.site-release/.lock').open('a+') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            with self.assertRaisesRegex(release.ReleaseError, 'site release mutation'):
                self.run_release('resume', TAG)
        self.assertEqual(self.commands.calls, [])

    def test_guard_failure_prevents_resumed_commands(self):
        self.commands.fail = 'pages'
        with self.assertRaises(subprocess.CalledProcessError):
            self.run_release()
        def reject():
            raise release.ReleaseError('dirty')
        self.commands.guard = reject
        self.commands.calls.clear()
        with self.assertRaisesRegex(release.ReleaseError, 'dirty'):
            self.run_release('resume', TAG)
        self.assertEqual(self.commands.calls, [])


class CIGateTests(unittest.TestCase):
    def row(self, name, **changes):
        row = dict(workflowName=name, headSha=SHA, headBranch='main', event='push', databaseId=1, attempt=1, status='completed', conclusion='success')
        row.update(changes)
        return row

    def green(self):
        return [self.row(name) for name in release.REQUIRED]

    def test_required_green_ignore_deploy_unrelated_and_nonpush(self):
        rows = self.green() + [self.row('Deploy production', status='in_progress'), self.row('Other', conclusion='failure'), self.row(release.REQUIRED[0], databaseId=999, event='pull_request', conclusion='failure')]
        release.ci_gate(rows, SHA)

    def test_missing_and_pending_required_return_pending(self):
        with self.assertRaises(release.Pending):
            release.ci_gate([], SHA)
        with self.assertRaises(release.Pending):
            release.ci_gate(self.green()[:1], SHA)
        with self.assertRaises(release.Pending):
            release.ci_gate(self.green() + [self.row(release.REQUIRED[0], databaseId=2, status='in_progress')], SHA)

    def test_latest_run_and_rerun_only(self):
        rows = self.green() + [self.row(release.REQUIRED[0], databaseId=2, conclusion='failure')]
        with self.assertRaises(release.ReleaseError):
            release.ci_gate(rows, SHA)
        rows.append(self.row(release.REQUIRED[0], databaseId=2, attempt=2))
        release.ci_gate(rows, SHA)

    def test_wrong_commit_or_branch_cannot_satisfy_ci(self):
        for field, value in [('headSha', 'b' * 40), ('headBranch', 'other')]:
            rows = self.green()
            rows[0][field] = value
            with self.assertRaises(release.Pending):
                release.ci_gate(rows, SHA)


class CommandBoundaryTests(unittest.TestCase):
    def test_real_shell_dispatch_routes_orchestrated_and_manual_phases(self):
        with tempfile.TemporaryDirectory() as temp:
            stub = Path(temp) / 'bin'
            stub.mkdir()
            log = Path(temp) / 'calls'
            for name in ('python3', 'docker'):
                tool = stub / name
                tool.write_text('#!/bin/bash\nprintf "%s\\n" "$0 $*" >> "$TEST_RELEASE_LOG"\n')
                tool.chmod(0o755)
            env = {**os.environ, 'PATH': str(stub) + os.pathsep + os.environ['PATH'], 'TEST_RELEASE_LOG': str(log)}
            for action in ('all', 'resume', 'status', 'cutover', 'converge'):
                subprocess.run(['bash', str(release.ROOT / 'scripts/release.sh'), action, TAG], env=env, check=True, capture_output=True)
            calls = log.read_text().splitlines()
            self.assertEqual(len(calls), 5)
            for line, action in zip(calls[:3], ('all', 'resume', 'status')):
                self.assertIn(f'scripts/release-workflow.py {action} {TAG}', line)
            self.assertIn(f'scripts/site-release.py activate --tag {TAG}', calls[3])
            self.assertIn(f'exec wp-site-{TAG}-api python -m services.identity_convergence', calls[4])

    def test_commands_construct_actual_bounded_guard_and_ingress_requests(self):
        commands = release.Commands()
        responses = ['', '', SHA, SHA, json.dumps(CIGateTests().green())]
        with patch.object(commands, 'markdown_successors'), patch.object(commands, 'output', side_effect=responses) as output:
            self.assertEqual(commands.guard(), SHA)
            self.assertIn('--commit', output.call_args.args[0])
            self.assertIn(SHA, output.call_args.args[0])
        with patch('subprocess.run') as run:
            run.return_value.stdout = '{}'
            commands.live()
            self.assertEqual(run.call_args.args[0][-1], 'current-ingress')
            self.assertEqual(run.call_args.kwargs['timeout'], 90)

    def test_real_guard_refuses_untracked_inputs_and_non_main(self):
        commands = release.Commands()
        with patch.object(commands, 'output', return_value='?? src/untracked.ts') as output:
            with self.assertRaisesRegex(release.ReleaseError, 'uncommitted'):
                commands.guard()
            self.assertIn('--untracked-files=all', output.call_args.args[0])
        with patch.object(commands, 'markdown_successors', side_effect=release.ReleaseError('origin/main')), patch.object(commands, 'output', side_effect=['', '', SHA, 'b' * 40]):
            with self.assertRaisesRegex(release.ReleaseError, 'origin/main'):
                commands.guard()

    def test_interrupt_kills_term_ignoring_descendant_after_shell_exits(self):
        real_popen = subprocess.Popen
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'scripts').mkdir()
            pidfile = root / 'child.pid'
            program = root / 'child.py'
            program.write_text('import os, signal, time\nfrom pathlib import Path\nsignal.signal(signal.SIGTERM, signal.SIG_IGN)\nPath(' + repr(str(pidfile)) + ').write_text(str(os.getpid()))\ntime.sleep(30)\n')
            script = root / 'scripts/release.sh'
            script.write_text('#!/bin/bash\n' + repr(sys.executable) + ' ' + repr(str(program)) + ' &\nwait\n')
            spawned = []
            def start(*args, **kwargs):
                child = real_popen(*args, **kwargs)
                spawned.append(child)
                first = True
                def wait(*wait_args, **wait_kwargs):
                    nonlocal first
                    if first:
                        first = False
                        until = time.monotonic() + 3
                        while not pidfile.exists() and time.monotonic() < until:
                            time.sleep(0.01)
                        self.assertTrue(pidfile.exists())
                        raise KeyboardInterrupt()
                    return child.wait(*wait_args, **wait_kwargs)
                return SimpleNamespace(pid=child.pid, wait=wait, poll=child.poll)
            try:
                with patch.object(release, 'ROOT', root), patch.object(release, 'STOP_GRACE', 0.1), patch('subprocess.Popen', side_effect=start):
                    with self.assertRaises(KeyboardInterrupt):
                        release.Commands().step('pages', TAG)
                pid = int(pidfile.read_text())
                # A killed orphan can briefly remain as a zombie awaiting init.
                result = subprocess.run(['ps', '-o', 'stat=', '-p', str(pid)], capture_output=True, text=True)
                self.assertTrue(not result.stdout.strip() or result.stdout.strip().startswith('Z'), result.stdout)
            finally:
                for child in spawned:
                    try:
                        os.killpg(child.pid, 9)
                    except ProcessLookupError:
                        pass
                    child.wait()

    def test_readonly_current_ingress_machine_output(self):
        spec = importlib.util.spec_from_file_location('site_release_contract', Path(__file__).with_name('site-release.py'))
        site = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(site)
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'default.conf').write_text('set $backend "candidate-api";\nset $public "candidate-public";\n')
            output = io.StringIO()
            with patch.object(site, 'ingress', return_value={'Name': '/candidate-edge', 'Id': 'full-container-id'}), patch.object(site, 'mount', return_value=root), patch('sys.argv', ['site-release.py', 'current-ingress']), patch('sys.stdout', output), patch.object(site, 'docker') as docker:
                site.main()
            self.assertEqual(json.loads(output.getvalue()), dict(edge='candidate-edge', id='full-container-id', api='candidate-api', public='candidate-public', static=str(root.resolve())))
            docker.assert_not_called()



class ApiOnlyWorkflowTests(WorkflowTests):
    """Run state-machine recovery contracts against API-only ingress metadata."""
    def setUp(self):
        super().setUp()
        activate = self.commands.activate
        def api_only_activate(tag):
            activate(tag)
            self.commands.live_value['public'] = None
        self.commands.activate = api_only_activate

    def test_api_only_matches_rejects_an_unrelated_public_service(self):
        self.commands.activate(TAG)
        self.assertTrue(self.flow.matches(self.commands.live(), TAG))
        self.commands.live_value['public'] = 'unrelated-public'
        self.assertFalse(self.flow.matches(self.commands.live(), TAG))

if __name__ == '__main__':
    unittest.main()
