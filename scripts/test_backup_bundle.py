import importlib.util
import json
import os
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('backup', Path(__file__).parent / 'backup-bundle.py')
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)


class BackupTests(unittest.TestCase):
    def test_drill_queries_counts_and_extracts_media(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            media = root / 'media'
            media.mkdir()
            (media / 'fixture.png').write_bytes(b'image')
            bundle = root / 'bundle'
            bundle.mkdir()
            (bundle / 'database.dump').write_bytes(b'fixture-dump')
            b.archive_media(media, bundle / 'media.tar.gz')
            manifest = {'table_counts': ['public.scripts:2']}
            answers = [b'query', b'public.scripts:2\n', b'query', b'2\n']
            with patch.object(b, 'verify', return_value=manifest), patch.object(b, 'run') as run, patch.object(b, 'output', side_effect=answers) as output, patch.object(b.subprocess, 'run') as ready, patch.object(b.shutil, 'copyfileobj', wraps=b.shutil.copyfileobj) as copy:
                ready.return_value.returncode = 0
                b.drill(bundle)
            self.assertEqual(output.call_count, 4)
            self.assertEqual(copy.call_count, 1)
            self.assertTrue(copy.call_args.args[1].closed)
            self.assertTrue(any('pg_amcheck' in c.args[0] for c in run.call_args_list))
            self.assertTrue(any(c.args[0][:3] == ['docker', 'rm', '-f'] for c in run.call_args_list))

    def test_media_excludes_credentials_and_symlinks(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            media = root / 'media'
            media.mkdir()
            (media / 'valid.png').write_bytes(b'image')
            # Existing production media includes a legacy SVG; preserve it as opaque bytes.
            (media / 'legacy.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg"/>')
            (media / 'link.png').symlink_to(root / 'private')
            with self.assertRaisesRegex(ValueError, 'Symlink'):
                b.archive_media(media, root / 'media.tar.gz')
            (media / 'link.png').unlink()
            (media / '.credentials.png').write_bytes(b'secret')
            with self.assertRaisesRegex(ValueError, 'credential'):
                b.archive_media(media, root / 'media.tar.gz')
            (media / '.credentials.png').unlink()
            b.archive_media(media, root / 'media.tar.gz')
            with tarfile.open(root / 'media.tar.gz') as archive:
                self.assertEqual(archive.getnames(), ['legacy.svg', 'valid.png'])

    def test_truncation_and_unsafe_archives(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            (root / 'database.dump').write_bytes(b'fixture')
            with tarfile.open(root / 'media.tar.gz', 'w:gz') as a:
                a.addfile(tarfile.TarInfo('../escape'))
            def manifest():
                (root / 'manifest.json').write_text(json.dumps({'version': 1, 'files': {n: {'sha256': b.digest(root / n), 'bytes': (root / n).stat().st_size} for n in ['database.dump', 'media.tar.gz']}}))
            manifest()
            with self.assertRaisesRegex(ValueError, 'Unsafe'):
                b.verify(root)
            (root / 'database.dump').write_bytes(b'x')
            with self.assertRaisesRegex(ValueError, 'Checksum'):
                b.verify(root)

    def test_missing_mirror_preserves_complete_local_backup(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            media = root / 'media'
            media.mkdir()
            (media / 'fixture.png').write_bytes(b'image')
            def fake_run(args, **kwargs):
                if 'pg_dump' in args:
                    kwargs['stdout'].write(b'synthetic-dump')
            env = {'BACKUP_DIR': str(root / 'backups'), 'MEDIA_STORAGE_ROOT': str(media), 'BACKUP_MIRROR_DIR': str(root / 'missing' / 'copy')}
            with patch.dict(os.environ, env, clear=True), patch.object(b, 'run', side_effect=fake_run), patch.object(b.subprocess, 'check_output', return_value=b'scripts:2\n'):
                with self.assertRaisesRegex(RuntimeError, 'Required external mirror failed'):
                    b.backup()
            bundles = list((root / 'backups').glob('write_project_*'))
            self.assertEqual(len(bundles), 1)
            b.verify(bundles[0])

    def test_mirror_copy_failure_cannot_finalize(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            media = root / 'media'
            media.mkdir()
            def fake_run(args, **kwargs):
                if 'pg_dump' in args:
                    kwargs['stdout'].write(b'synthetic-dump')
            mirror = root / 'mirror'
            env = {'BACKUP_DIR': str(root / 'backups'), 'MEDIA_STORAGE_ROOT': str(media), 'BACKUP_MIRROR_DIR': str(mirror)}
            with patch.dict(os.environ, env, clear=True), patch.object(b, 'validate_mirror', return_value=mirror), patch.object(b, 'run', side_effect=fake_run), patch.object(b.subprocess, 'check_output', return_value=b'scripts:2\n'), patch.object(b.shutil, 'copytree', side_effect=OSError('disk full')):
                with self.assertRaisesRegex(RuntimeError, 'disk full'):
                    b.backup()
            self.assertEqual(list(mirror.glob('write_project_*')), [])
            self.assertEqual(len(list((root / 'backups').glob('write_project_*'))), 1)

    def test_same_disk_and_missing_mount_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            with self.assertRaisesRegex(ValueError, 'mounted filesystem'):
                b.validate_mirror(str(root / 'copy'), root)
            with patch.object(b.os.path, 'ismount', return_value=True):
                with self.assertRaisesRegex(ValueError, 'distinct'):
                    b.validate_mirror(str(root), root)

    def test_symlink_mirror_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp).resolve()
            (root / 'link').symlink_to(root, target_is_directory=True)
            with self.assertRaisesRegex(ValueError, 'symlink'):
                b.validate_mirror(str(root / 'link' / 'copy'), root)


if __name__ == '__main__':
    unittest.main()
