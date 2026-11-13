#!/usr/bin/env python3
"""Serialize frozen manual/release Pages build and upload with content refresh."""
from contextlib import ExitStack
import importlib.util
import os
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
        snapshot = collector()
        digest = module.fingerprint(snapshot)
        with tempfile.TemporaryDirectory(prefix='release-pages-') as directory:
            output = Path(directory) / 'out'
            commands.build(output, snapshot)
            if module.fingerprint(collector()) != digest:
                raise module.ContentError('Public content changed during Pages build; retry Pages publication')
            commands.upload(output)


def main():
    def interrupted(signum, _frame):
        raise module.ContentError('Pages publication interrupted')
    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)
    root = Path(os.environ.get('WP_RELEASE_ROOT') or module.ROOT / 'releases').resolve()
    publish(root)


if __name__ == '__main__':
    main()
