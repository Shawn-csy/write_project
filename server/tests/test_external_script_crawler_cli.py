"""Exercise the deployable CLI without a production connection or network."""
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from services.external_script_crawler import run_lock

CLI = Path(__file__).resolve().parents[1] / 'scripts/crawl_external_scripts.py'


class CrawlerCLITests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.state = Path(self.temp.name) / 'state.sqlite'
        self.env = {**os.environ, 'DATABASE_URL': 'not-a-database-url',
                    'DB_PATH': str(Path(self.temp.name) / 'application.sqlite')}

    def tearDown(self):
        self.temp.cleanup()

    def command(self, command):
        result = subprocess.run([sys.executable, str(CLI), command, '--state', str(self.state)],
                                env=self.env, capture_output=True, text=True, timeout=10)
        return result.returncode, json.loads(result.stdout)

    def test_status_and_results_do_not_connect_to_application_database(self):
        self.assertEqual(self.command('status'), (0, {'runs': [], 'sources': []}))
        self.assertEqual(self.command('results'), (0, {'candidates': [], 'evidence': []}))
        self.assertFalse(Path(self.env['DB_PATH']).exists())

    def test_seed_failure_is_visible_in_status(self):
        code, failure = self.command('run')
        self.assertEqual(code, 1)
        self.assertIn('error', failure)
        code, status = self.command('status')
        self.assertEqual(code, 0)
        self.assertEqual(status['runs'][0]['status'], 'failed')
        self.assertTrue(status['runs'][0]['error'].startswith('seed load:'))

    def test_lock_blocks_a_second_process(self):
        with run_lock(self.state):
            code, failure = self.command('run')
            self.assertEqual(code, 1)
            self.assertIn('state lock', failure['message'])
        self.assertEqual(self.command('status')[0], 0)

    def test_application_tables_rejected_even_under_different_filename(self):
        with sqlite3.connect(self.state) as db:
            db.execute('CREATE TABLE external_public_scripts(id TEXT)')
        before = self.state.read_bytes()
        code, failure = self.command('status')
        self.assertEqual(code, 1)
        self.assertIn('application tables', failure['message'])
        self.assertEqual(self.state.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
