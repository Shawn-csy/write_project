#!/usr/bin/env python3
"""Durable orchestration of this repository's production release commands."""
import argparse
import datetime
from contextlib import ExitStack
import fcntl
import json
import os
import re
import signal
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STOP_GRACE = 10
REQUIRED = ('Public read and security contracts', 'Submission workflows')


class ReleaseError(RuntimeError):
    pass


class Pending(ReleaseError):
    pass


def ci_gate(runs, sha):
    for name in REQUIRED:
        relevant = [r for r in runs if r.get('workflowName') == name and r.get('event') == 'push' and r.get('headSha') == sha and r.get('headBranch') == 'main']
        if not relevant:
            raise Pending(f'Required CI missing for {sha}: {name}; wait for Actions to enqueue it')
        latest = max(relevant, key=lambda r: (int(r['databaseId']), int(r.get('attempt', 1))))
        if latest['status'] != 'completed':
            raise Pending(f'Required CI pending: {name}')
        if latest['conclusion'] != 'success':
            raise ReleaseError(f'Required CI failed: {name}')


class Commands:
    def output(self, args):
        return subprocess.run(args, cwd=ROOT, check=True, capture_output=True, text=True, timeout=90).stdout.strip()

    def guard(self):
        if self.output(['git', 'status', '--porcelain', '--untracked-files=all']):
            raise ReleaseError('Working tree has uncommitted changes')
        self.output(['git', 'fetch', '-q', 'origin', 'main'])
        sha = self.output(['git', 'rev-parse', 'HEAD'])
        if sha != self.output(['git', 'rev-parse', 'origin/main']):
            raise ReleaseError('HEAD is not origin/main; check out the pushed main commit')
        runs = json.loads(self.output(['gh', 'run', 'list', '--branch', 'main', '--commit', sha, '--limit', '100', '--json', 'workflowName,status,conclusion,event,headSha,headBranch,databaseId,attempt']))
        ci_gate(runs, sha)
        return sha

    def live(self):
        return json.loads(self.output(['python3', 'scripts/site-release.py', 'current-ingress']))

    def step(self, phase, tag, apply_schema=False):
        args = ['bash', 'scripts/release.sh', phase]
        if phase in ('build', 'prepare', 'cutover', 'converge'):
            args.append(tag)
        if phase == 'schema-check' and apply_schema:
            args.append('--apply-schema')
        child = subprocess.Popen(args, cwd=ROOT, start_new_session=True, close_fds=True)
        try:
            code = child.wait()
            if code:
                raise subprocess.CalledProcessError(code, args)
        except BaseException:
            # A shell leader can exit while npm/wrangler descendants survive.
            # Always kill the group after the grace period/leader wait, even
            # when poll() says the leader has already gone.
            try:
                os.killpg(child.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
            try:
                child.wait(timeout=STOP_GRACE)
            except subprocess.TimeoutExpired:
                pass
            finally:
                try:
                    os.killpg(child.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                child.wait()
            raise


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def atomic_json(path, value):
    fd, temp = tempfile.mkstemp(prefix='.journal-', dir=path.parent)
    try:
        with os.fdopen(fd, 'w') as handle:
            json.dump(value, handle, indent=2)
            handle.write('\n')
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp, path)
        directory = os.open(path.parent, os.O_RDONLY)
        try:
            os.fsync(directory)
        finally:
            os.close(directory)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)


class Workflow:
    def __init__(self, root, commands=None):
        self.root = Path(root).resolve()
        self.control = self.root / '.release-workflow'
        self.commands = commands or Commands()

    def matches(self, live, tag):
        return (live.get('edge') == f'wp-site-{tag}-edge' and live.get('api') == f'wp-site-{tag}-api'
                and live.get('public') in (None, f'wp-site-{tag}-public') and live.get('static') == str(self.root / tag))

    def require_live(self, journal):
        live = self.commands.live()
        if not self.matches(live, journal['tag']) or live['id'] != journal['ingress']['id']:
            raise ReleaseError('Release ingress changed, rolled back or was superseded; inspect site-release.py status; do not resume this tag')

    def lock_site(self, stack):
        control = self.root / '.site-release'
        control.mkdir(parents=True, exist_ok=True)
        lock = stack.enter_context((control / '.lock').open('a+'))
        os.set_inheritable(lock.fileno(), False)
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise ReleaseError('Another site release mutation is running; retry resume after it finishes') from error

    def run(self, action, tag=None, apply_schema=False):
        self.control.mkdir(parents=True, exist_ok=True)
        with (self.control / '.lock').open('a+') as lock, ExitStack() as site_stack:
            os.set_inheritable(lock.fileno(), False)
            try:
                fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError as error:
                raise ReleaseError('Another release orchestration is running; retry when it finishes') from error
            sha = self.commands.guard()  # Also required for resume and complete no-op.
            if not re.fullmatch(r'[0-9a-f]{40}', sha):
                raise ReleaseError('Expected full Git commit SHA')
            if action == 'auto':
                tag = f'auto-{sha[:7]}'
            if not tag or not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,39}', tag):
                raise ReleaseError('Invalid release tag')
            path = self.control / f'{tag}.json'
            journal = json.loads(path.read_text()) if path.exists() else None
            if journal:
                self.lock_site(site_stack)
            live = self.commands.live()
            if journal:
                if journal['commit'] != sha or journal['tag'] != tag:
                    raise ReleaseError('Journal commit/tag differs from HEAD; return to the exact pushed commit or use a new tag')
                if journal['phase'] == 'activation-intent' and self.matches(live, tag):
                    journal.update(phase='activated', ingress=live, updated_at=now(), failure=None)
                    journal['timestamps']['activated'] = now()
                    atomic_json(path, journal)
                elif journal['phase'] in ('preparing', 'activation-intent'):
                    raise ReleaseError('Pre-cutover attempt is incomplete; inspect candidate and ingress, stop-prepared if safe, then use a fresh tag; do not delete journal to force retry')
                self.require_live(journal)
                if journal['phase'] == 'complete':
                    print(f'{tag} already complete')
                    return
            else:
                if action == 'resume' or any(live.get(role) == f'wp-site-{tag}-{suffix}' for role, suffix in (('edge', 'edge'), ('api', 'api'), ('public', 'public'))) or live.get('static') == str(self.root / tag):
                    raise ReleaseError('No journal for this release; legacy live state is ambiguous. Inspect ingress and release metadata; use a fresh commit/tag for a new release')
                if (self.root / tag).exists() or (ROOT / 'dist/releases' / tag).exists():
                    raise ReleaseError('Existing release artifacts without journal; inspect/stop prepared candidate and use a fresh tag')
                journal = dict(version=1, tag=tag, commit=sha, phase='preparing', created_at=now(), updated_at=now(), failure=None, timestamps={})
                atomic_json(path, journal)
                try:
                    for phase in ('build', 'schema-check', 'prepare'):
                        self.commands.step(phase, tag, apply_schema)
                    journal.update(phase='activation-intent', updated_at=now())
                    atomic_json(path, journal)  # Persist ownership before traffic moves.
                    self.commands.step('cutover', tag)
                    self.lock_site(site_stack)
                    live = self.commands.live()
                    if not self.matches(live, tag):
                        raise ReleaseError('Cutover did not leave the exact expected release ingress')
                    journal.update(phase='activated', ingress=live, updated_at=now())
                    journal['timestamps']['activated'] = now()
                    atomic_json(path, journal)
                except (subprocess.SubprocessError, OSError, ReleaseError) as error:
                    self.failure(path, journal, 'cutover' if journal['phase'] == 'activation-intent' else phase, error)
                    raise
            phases = [('activated', 'converge', 'converged'), ('converged', 'pages', 'pages'), ('pages', 'verify', 'verified')]
            for before, command, after in phases:
                if journal['phase'] != before:
                    continue
                try:
                    self.require_live(journal)
                    self.commands.step(command, tag)
                    self.require_live(journal)
                    journal.update(phase=after, failure=None, updated_at=now())
                    journal['timestamps'][after] = now()
                    atomic_json(path, journal)
                except (subprocess.SubprocessError, OSError, ReleaseError) as error:
                    self.failure(path, journal, command, error)
                    raise
            if journal['phase'] != 'verified':
                raise ReleaseError('Unknown journal phase; inspect journal before recovery')
            self.require_live(journal)
            journal.update(phase='complete', failure=None, updated_at=now())
            journal['timestamps']['complete'] = now()
            atomic_json(path, journal)
            site_stack.close()  # retire/prune take the same site lock themselves.
            if action == 'auto':
                self.require_live(journal)
                self.commands.step('retire', tag)
                self.require_live(journal)
                self.commands.step('prune', tag)

    def failure(self, path, journal, phase, error):
        journal.update(updated_at=now(), failure={'phase': phase, 'at': now(), 'exit_code': getattr(error, 'returncode', 1)})
        atomic_json(path, journal)


def main():
    def interrupted(signum, _frame):
        raise ReleaseError(f'Release interrupted by signal {signum}; inspect status before retry')
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('guard', 'all', 'auto', 'resume', 'status'))
    parser.add_argument('tag', nargs='?')
    parser.add_argument('--apply-schema', action='store_true')
    args = parser.parse_args()
    if args.action == 'guard':
        Commands().guard()
        return
    root = Path(os.environ.get('WP_RELEASE_ROOT') or ROOT / 'releases').resolve()
    if args.action == 'status':
        if not args.tag or not re.fullmatch(r'[a-z0-9][a-z0-9-]{0,39}', args.tag):
            raise ReleaseError('status requires a valid tag')
        print((root / '.release-workflow' / f'{args.tag}.json').read_text())
        return
    Workflow(root).run(args.action, args.tag, args.apply_schema or args.action == 'auto')


if __name__ == '__main__':
    try:
        main()
    except Pending as error:
        print(f'[release] {error}', file=sys.stderr)
        sys.exit(3)
    except (ReleaseError, OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
        # Avoid printing subprocess output/arguments which can contain credentials.
        print(f'[release] {error if isinstance(error, ReleaseError) else type(error).__name__ + "; inspect command logs and release status"}', file=sys.stderr)
        sys.exit(1)
