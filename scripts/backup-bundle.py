#!/usr/bin/env python3
"""Private DB/media bundles. Never restores into an existing database."""
import argparse
import hashlib
import fcntl
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import time
import uuid


def run(args, **kw):
    return subprocess.run(args, check=True, timeout=3600, **kw)


def output(args, **kw):
    return subprocess.check_output(args, timeout=3600, **kw)


def digest(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def archive_media(source, target):
    source = Path(source)
    if not source.is_dir() or source.is_symlink():
        raise ValueError('MEDIA_STORAGE_ROOT must be an existing real media directory')
    with tarfile.open(target, 'w:gz') as archive:
        for p in sorted(source.rglob('*')):
            # Only regular media: no secrets, symlinks, devices, sockets or traversal.
            if p.is_symlink():
                raise ValueError('Symlink in media source; resolve before backup')
            if p.is_dir():
                continue
            if not p.is_file():
                raise ValueError('Non-regular file in media source')
            if any(x.startswith('.') or x.lower() in ('secrets', 'credentials') for x in p.relative_to(source).parts):
                raise ValueError('Hidden or credential-named media path; review before backup')
            if p.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.svg', '.mp3', '.wav', '.ogg', '.m4a', '.mp4', '.pdf'):
                raise ValueError('Unexpected non-media file; review source directory before backup')
            archive.add(p, arcname=p.relative_to(source).as_posix(), recursive=False)


def verify(bundle):
    bundle = Path(bundle)
    if bundle.is_symlink() or (bundle / 'manifest.json').is_symlink():
        raise ValueError('Symlink bundle/manifest refused')
    manifest = json.loads((bundle / 'manifest.json').read_text())
    if manifest.get('version') != 1 or set(manifest.get('files', {})) != {'database.dump', 'media.tar.gz'}:
        raise ValueError('Invalid manifest')
    for name, expected in manifest['files'].items():
        p = bundle / name
        if p.is_symlink() or not p.is_file() or p.stat().st_size != expected['bytes'] or digest(p) != expected['sha256']:
            raise ValueError('Checksum/size mismatch: ' + name)
    with tarfile.open(bundle / 'media.tar.gz', 'r:gz') as archive:
        names = set()
        for member in archive:
            if not member.isfile() or member.name.startswith('/') or '..' in Path(member.name).parts or member.name in names:
                raise ValueError('Unsafe media archive')
            names.add(member.name)
    return manifest


def validate_mirror(destination, local):
    dest = Path(destination).absolute()
    if dest.is_symlink() or any(p.is_symlink() for p in dest.parents):
        raise ValueError('Mirror destination must not contain symlinks')
    # Require a real mounted ancestor, never just an existing /Volumes directory.
    mount = next((p for p in [dest, *dest.parents] if p.exists() and os.path.ismount(p)), None)
    if mount is None or mount == Path('/') or mount.stat().st_dev == Path(local).stat().st_dev:
        raise ValueError('Mirror requires a mounted filesystem distinct from local backup storage')
    if not dest.parent.is_dir():
        raise ValueError('Mirror parent is not mounted/present')
    return dest


def backup():
    days = int(os.getenv('KEEP_DAYS', '14'))
    mirror_days = int(os.getenv('MIRROR_KEEP_DAYS', '180'))
    if days < 1 or mirror_days < 1:
        raise ValueError('Retention days must be positive')
    root = Path(os.getenv('BACKUP_DIR', str(Path.home() / 'write_project_backups'))).resolve()
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    mirror = os.getenv('BACKUP_MIRROR_DIR')
    name = 'write_project_' + time.strftime('%Y%m%d_%H%M%S') + '_' + uuid.uuid4().hex[:8]
    lock = open(root / '.backup.lock', 'a')
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BaseException:
        lock.close()
        raise
    stage = Path(tempfile.mkdtemp(prefix='.partial-', dir=root))
    container = os.getenv('PG_CONTAINER', 'write_project-write_project-postgres-1')
    user = os.getenv('DB_USER', 'write_project')
    db = os.getenv('DB_NAME', 'write_project')
    def counts():
        query = "SELECT format('SELECT %L || count(*) FROM %I.%I;', schemaname || '.' || tablename || ':', schemaname, tablename) FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"
        statements = output(['docker', 'exec', container, 'psql', '-U', user, '-d', db, '-At', '-v', 'ON_ERROR_STOP=1', '-c', query])
        return output(['docker', 'exec', '-i', container, 'psql', '-U', user, '-d', db, '-At', '-v', 'ON_ERROR_STOP=1'], input=statements).decode().splitlines()
    try:
        before_counts = counts()
        with open(stage / 'database.dump', 'wb') as out:
            run(['docker', 'exec', container, 'pg_dump', '-U', user, '-d', db, '-Fc', '--no-owner', '--no-acl'], stdout=out)
        # pg_restore list detects malformed/truncated custom-format headers.
        with open(stage / 'database.dump', 'rb') as src:
            run(['docker', 'exec', '-i', container, 'pg_restore', '--list'], stdin=src, stdout=subprocess.DEVNULL)
        media = os.getenv('MEDIA_STORAGE_ROOT', str(Path(__file__).resolve().parent.parent / 'server/data/media'))
        archive_media(media, stage / 'media.tar.gz')
        if counts() != before_counts:
            raise ValueError('Database changed during backup; quiesce writes and retry')
        files = {p.name: {'bytes': p.stat().st_size, 'sha256': digest(p)} for p in stage.iterdir()}
        (stage / 'manifest.json').write_text(json.dumps({'version': 1, 'table_counts': before_counts, 'created_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'files': files}, indent=2) + '\n')
        verify(stage)
        final = root / name
        stage.rename(final)
        print('LOCAL_COMPLETE ' + str(final), flush=True)
        if mirror:
            try:
                dest = validate_mirror(mirror, root)
                dest.mkdir(exist_ok=True, mode=0o700)
                tmp = dest / ('.partial-' + name)
                shutil.copytree(final, tmp)
                verify(tmp)
                tmp.rename(dest / name)
                for old in dest.glob('write_project_*'):
                    if old.is_dir() and not old.is_symlink() and old.name != name and old.stat().st_mtime < time.time() - mirror_days * 86400:
                        verify(old)
                        shutil.rmtree(old)
                print('EXTERNAL_MIRROR_COMPLETE (distinct mounted filesystem; not offsite)')
            except Exception as error:
                raise RuntimeError('Required external mirror failed: ' + str(error))
        else:
            print('EXTERNAL_MIRROR_UNCONFIGURED')
        print('OFFSITE_UNCONFIGURED (local/external disk only)')
        # Only complete new-format bundles are retained/removed; legacy dumps stay intact.
        days = int(os.getenv('KEEP_DAYS', '14'))
        if days < 1:
            raise ValueError('KEEP_DAYS must be positive')
        for p in root.glob('write_project_*'):
            if p.is_dir() and not p.is_symlink() and p != final and p.stat().st_mtime < time.time() - days * 86400:
                verify(p)
                shutil.rmtree(p)
        return final
    finally:
        try:
            if stage.exists():
                shutil.rmtree(stage)
        finally:
            lock.close()


def drill(bundle):
    manifest = verify(bundle)
    bundle = Path(bundle).resolve()
    token = 'wp-restore-drill-' + uuid.uuid4().hex[:12]
    network, container = token + '-net', token + '-db'
    created_network = created_container = False
    with tempfile.TemporaryDirectory(prefix=token) as tmp:
        try:
            run(['docker', 'network', 'create', '--internal', network], stdout=subprocess.DEVNULL)
            created_network = True
            run(['docker', 'run', '-d', '--name', container, '--network', network, '--tmpfs', '/var/lib/postgresql/data', '-e', 'POSTGRES_PASSWORD=' + uuid.uuid4().hex, 'postgres:16-alpine'], stdout=subprocess.DEVNULL)
            created_container = True
            for _ in range(60):
                if subprocess.run(['docker', 'exec', container, 'pg_isready', '-U', 'postgres'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10).returncode == 0:
                    break
                time.sleep(1)
            else:
                raise RuntimeError('Disposable database did not become ready')
            with open(bundle / 'database.dump', 'rb') as src:
                run(['docker', 'exec', '-i', container, 'pg_restore', '-U', 'postgres', '-d', 'postgres', '--exit-on-error', '--no-owner', '--no-acl'], stdin=src)
            expected = manifest.get('table_counts')
            if not expected:
                raise ValueError('Missing source row-count evidence')
            count_query = "SELECT format('SELECT %L || count(*) FROM %I.%I;', schemaname || '.' || tablename || ':', schemaname, tablename) FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"
            statements = output(['docker', 'exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-c', count_query])
            actual = output(['docker', 'exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1'], input=statements).decode().splitlines()
            if actual != expected:
                raise ValueError('Restored table counts differ from backup evidence')
            # amcheck exercises heap/index consistency, including every restored btree.
            run(['docker', 'exec', container, 'pg_amcheck', '-U', 'postgres', '-d', 'postgres', '--install-missing', '--heapallindexed'], stdout=subprocess.DEVNULL)
            sql = "SELECT format('SELECT count(*) FROM %I.%I;', schemaname, tablename) FROM pg_tables WHERE schemaname='public' ORDER BY tablename;"
            queries = output(['docker', 'exec', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-c', sql])
            if not queries.strip():
                raise ValueError('Restored database has no public tables')
            counts = output(['docker', 'exec', '-i', container, 'psql', '-U', 'postgres', '-d', 'postgres', '-At', '-v', 'ON_ERROR_STOP=1'], input=queries)
            if not any(int(n) > 0 for n in counts.splitlines()):
                raise ValueError('Restored database has no records')
            with tarfile.open(bundle / 'media.tar.gz') as archive:
                for member in archive:
                    target = Path(tmp) / member.name
                    target.parent.mkdir(parents=True, exist_ok=True)
                    with archive.extractfile(member) as source, open(target, 'xb') as destination:
                        shutil.copyfileobj(source, destination)
            print(json.dumps({'status': 'RESTORE_DRILL_COMPLETE', 'public_tables': len(counts.splitlines()), 'records': sum(map(int, counts.splitlines())), 'media_files': sum(p.is_file() for p in Path(tmp).rglob('*'))}))
        finally:
            try:
                if created_container:
                    run(['docker', 'rm', '-f', container], stdout=subprocess.DEVNULL)
            finally:
                if created_network:
                    run(['docker', 'network', 'rm', network], stdout=subprocess.DEVNULL)


if __name__ == '__main__':
    os.umask(0o077)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['backup', 'verify', 'drill'])
    parser.add_argument('bundle', nargs='?')
    args = parser.parse_args()
    try:
        if args.command == 'backup':
            backup()
        elif not args.bundle:
            parser.error('bundle is required')
        elif args.command == 'verify':
            verify(args.bundle)
            print('CHECKSUMS_VALID')
        else:
            drill(args.bundle)
    except Exception as error:
        raise SystemExit('ERROR: ' + str(error))
