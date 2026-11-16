#!/usr/bin/env python3
"""Publish changed public content using exactly the currently deployed code."""
import argparse
from contextlib import ExitStack
import fcntl
import importlib.util
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import sys
import tempfile
import time
from urllib.parse import quote

from content_snapshot import API, PUBLIC, ContentError, capture, empty_routes, fingerprint, frozen_server, public_request, read_json, validate_export, validate_html, validate_sitemap

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('release_workflow', ROOT / 'scripts/release-workflow.py')
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)
BOOTSTRAP = 'Deploy a normal complete release containing content-refresh.py first; inspect ingress and its complete release journal. Never infer a live SHA from main.'


def resolve_source(root, commands):
    live = commands.live()
    match = re.fullmatch(r'wp-site-([a-z0-9][a-z0-9-]{0,39})-edge', live.get('edge', ''))
    if not match:
        raise ContentError(BOOTSTRAP)
    tag = match[1]
    path = root / '.release-workflow' / (tag + '.json')
    if not path.is_file():
        raise ContentError(BOOTSTRAP)
    journal = json.loads(path.read_text())
    workflow = release.Workflow(root, commands)
    if journal.get('phase') != 'complete' or journal.get('tag') != tag or not workflow.matches(live, tag) or journal.get('ingress') != live or not re.fullmatch(r'[0-9a-f]{40}', journal.get('commit', '')):
        raise ContentError(BOOTSTRAP)
    return journal['commit']


class Commands(release.Commands):
    def execute(self, args, env=None):
        child = subprocess.Popen(args, cwd=ROOT, env=env, start_new_session=True, close_fds=True)
        try:
            code = child.wait()
            if code:
                raise subprocess.CalledProcessError(code, args)
        except BaseException:
            for sig in (signal.SIGTERM, signal.SIGKILL):
                try:
                    os.killpg(child.pid, sig)
                except ProcessLookupError:
                    pass
                if sig == signal.SIGTERM:
                    try:
                        child.wait(timeout=release.STOP_GRACE)
                    except subprocess.TimeoutExpired:
                        pass
            child.wait()
            raise

    def build(self, output, snapshot):
        with frozen_server(snapshot) as (origin, failures):
            env = dict(os.environ, BACKEND_API_URL=origin, PUBLIC_PAGES_OUTPUT_DIR=str(output), ALLOW_EMPTY_PUBLIC_BUILD='1', PUBLIC_PAGES_EMPTY_ROUTES=json.dumps(empty_routes(snapshot)))
            self.execute(['bash', 'scripts/release.sh', 'pages-build'], env)
            if failures:
                raise ContentError('Build requested uncaptured endpoints; refuse publication')
        validate_export(output, snapshot)

    def upload(self, output):
        self.execute(['bash', 'scripts/release.sh', 'pages-upload', str(output)])

    def receipt_matches(self, receipt):
        from urllib.error import HTTPError
        try:
            return read_json(PUBLIC + '/content-version.json?refresh=' + str(time.time_ns())) == receipt
        except HTTPError as error:
            if error.code == 404:
                return False
            raise

    def verify(self, receipt, snapshot):
        nonce = str(time.time_ns())
        actual = read_json(PUBLIC + '/content-version.json?refresh=' + nonce)
        if actual != receipt:
            raise ContentError('Public content receipt does not match; retry verification')
        # Bounded smoke reads; do not accept an HTTP error page or absent SSR shell.
        from urllib.request import urlopen
        paths = [('/', None), ('/authors', None), ('/sitemap.xml', None)]
        paths += [('/read/' + quote(item['id'], safe=''), snapshot['/api/public-scripts/' + quote(item['id'], safe='')]) for item in snapshot['/api/public-scripts'][:3]]
        for path, script in paths:
            with urlopen(public_request(PUBLIC + path + '?refresh=' + nonce, '*/*'), timeout=30) as response:
                payload = response.read(32 * 1024 * 1024 + 1)
                if response.status != 200 or not payload or len(payload) > 32 * 1024 * 1024:
                    raise ContentError('Public smoke failed')
                source = payload.decode('utf-8')
                if path == '/sitemap.xml':
                    validate_sitemap(source, snapshot)
                else:
                    validate_html(source, script)


def lock(stack, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    handle = stack.enter_context(path.open('a+'))
    os.set_inheritable(handle.fileno(), False)
    try:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError as error:
        raise ContentError('Another production/Pages publication is running; retry later') from error


class Refresh:
    def __init__(self, root, commands=None, collector=capture):
        self.root = Path(root).resolve()
        self.commands = commands or Commands()
        self.collector = collector
        self.path = self.root / '.content-refresh' / 'state.json'

    def guard(self):
        sha = resolve_source(self.root, self.commands)
        if self.commands.output(['git', 'status', '--porcelain', '--untracked-files=all']):
            raise ContentError('Content refresh requires a completely clean checkout')
        if self.commands.output(['git', 'rev-parse', 'HEAD']) != sha:
            raise ContentError('HEAD differs from current complete live release; resolve-source and checkout its exact SHA')
        return sha

    def run(self):
        with ExitStack() as stack:
            for name in ('.release-workflow', '.site-release', '.pages-publish'):
                lock(stack, self.root / name / '.lock')
            sha = self.guard()
            self.path.parent.mkdir(parents=True, exist_ok=True)
            state = json.loads(self.path.read_text()) if self.path.exists() else {}
            stage = 'capture'
            state.update(running=True, started_at=release.now(), updated_at=release.now(), failure=None)
            release.atomic_json(self.path, state)
            try:
                snapshot = self.collector()
                digest = fingerprint(snapshot)
                key = sha + ':' + digest
                if state.get('phase') == 'complete' and state.get('completed_key') == key and self.commands.receipt_matches(state.get('receipt')):
                    state.update(running=False, checked_at=release.now(), updated_at=release.now())
                    release.atomic_json(self.path, state)
                    print('Published content unchanged')
                    return
                retry_verify = state.get('pending_key') == key and state.get('phase') == 'uploaded' and isinstance(state.get('receipt'), dict) and state['receipt'].get('digest') == digest and state['receipt'].get('commit') == sha
                if retry_verify and not self.commands.receipt_matches(state['receipt']):
                    retry_verify = False
                if not retry_verify:
                    state.update(pending_key=key, digest=digest, commit=sha, phase='pending', updated_at=release.now(), failure=None)
                    release.atomic_json(self.path, state)
                    with tempfile.TemporaryDirectory(prefix='content-pages-') as directory:
                        output = Path(directory) / 'out'
                        stage = 'build'
                        self.commands.build(output, snapshot)
                        stage = 'recapture'
                        if fingerprint(self.collector()) != digest:
                            state.update(phase='deferred', running=False, updated_at=release.now())
                            release.atomic_json(self.path, state)
                            print('Content changed during build; deferred to next run')
                            return
                        self.guard()
                        receipt = dict(digest=digest, commit=sha, built_at=release.now())
                        (output / 'content-version.json').write_text(json.dumps(receipt) + '\n')
                        state.update(phase='uploading', receipt=receipt, updated_at=release.now())
                        release.atomic_json(self.path, state)
                        stage = 'upload'
                        self.commands.upload(output)
                        state.update(phase='uploaded', updated_at=release.now())
                        release.atomic_json(self.path, state)
                stage = 'verify'
                self.guard()
                self.commands.verify(state['receipt'], snapshot)
                self.guard()
                state.update(completed_key=key, phase='complete', running=False, failure=None, completed_at=release.now(), checked_at=release.now(), updated_at=release.now())
                release.atomic_json(self.path, state)
                print('Public content refresh complete')
            except BaseException:
                state.update(running=False, failure={'stage': stage, 'at': release.now()}, updated_at=release.now())
                release.atomic_json(self.path, state)
                raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('resolve-source', 'run', 'status'))
    args = parser.parse_args()
    root = Path(os.environ.get('WP_RELEASE_ROOT') or ROOT / 'releases').resolve()
    if args.action == 'resolve-source':
        print(resolve_source(root, Commands()))
    elif args.action == 'status':
        path = root / '.content-refresh/state.json'
        print(path.read_text() if path.exists() else '{"phase":"not-started"}')
    else:
        def interrupted(signum, _frame):
            raise ContentError('Content refresh interrupted; retry run')
        signal.signal(signal.SIGTERM, interrupted)
        signal.signal(signal.SIGINT, interrupted)
        Refresh(root).run()


if __name__ == '__main__':
    try:
        main()
    except (ContentError, release.ReleaseError, OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
        print('[content-refresh] ' + (str(error) if isinstance(error, ContentError) else type(error).__name__ + '; inspect logs/status'), file=sys.stderr)
        sys.exit(1)
