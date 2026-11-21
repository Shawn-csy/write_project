#!/usr/bin/env python3
"""Serialize frozen manual/release Pages build and upload with content refresh."""
from contextlib import ExitStack
import importlib.util
import os
import re
import signal
import tempfile
from pathlib import Path

spec = importlib.util.spec_from_file_location('content_refresh', Path(__file__).with_name('content-refresh.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def publish(root, commands=None, collector=None):
    commands = commands or module.Commands()
    collector = collector or module.capture
    with ExitStack() as stack:
        module.lock(stack, Path(root) / '.pages-publish/.lock')
        sha = commands.output(['git', 'rev-parse', 'HEAD'])
        if not re.fullmatch(r'[0-9a-f]{40}', sha) or commands.output(['git', 'status', '--porcelain', '--untracked-files=all']):
            raise module.ContentError('Pages publication requires a clean checkout at a valid commit')
        snapshot = collector()
        digest = module.fingerprint(snapshot)
        with tempfile.TemporaryDirectory(prefix='release-pages-') as directory:
            output = Path(directory) / 'out'
            commands.build(output, snapshot)
            if module.fingerprint(collector()) != digest:
                raise module.ContentError('Public content changed during Pages build; retry Pages publication')
            if commands.output(['git', 'rev-parse', 'HEAD']) != sha or commands.output(['git', 'status', '--porcelain', '--untracked-files=all']):
                raise module.ContentError('Pages source changed during build; retry Pages publication')
            receipt = module.write_receipt(output, sha, digest)
            commands.upload(output)
            commands.verify(receipt, snapshot)
            state_path = Path(root) / '.content-refresh/state.json'
            state_path.parent.mkdir(parents=True, exist_ok=True)
            module.record_verified(state_path, {}, receipt)


def main():
    def interrupted(signum, _frame):
        raise module.ContentError('Pages publication interrupted')
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    root = Path(os.environ.get('WP_RELEASE_ROOT') or module.ROOT / 'releases').resolve()
    publish(root)


if __name__ == '__main__':
    main()
