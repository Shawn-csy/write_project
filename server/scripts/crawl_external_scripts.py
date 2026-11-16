#!/usr/bin/env python3
"""Single-process scheduled discovery entry point (JSON output)."""
import argparse
import json
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from services.external_script_crawler import BUNDLE_URL, Fetcher, Limits, State, crawl, database_seeds, run_lock, now


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=('run', 'status', 'results'))
    parser.add_argument('--state', default=os.getenv('EXTERNAL_SCRIPT_CRAWLER_STATE', str(Path(os.getenv('DB_PATH', str(Path(__file__).resolve().parents[1] / 'data/scripts.db'))).parent / 'external-script-crawler.sqlite')))
    parser.add_argument('--public-bundle-url', choices=(BUNDLE_URL,))
    parser.add_argument('--max-pages', type=int, default=40)
    parser.add_argument('--max-seconds', type=float, default=120)
    parser.add_argument('--max-depth', type=int, default=3)
    args = parser.parse_args(argv)
    state = None
    try:
        if min(args.max_pages, args.max_seconds) <= 0 or args.max_depth < 0:
            raise ValueError('positive run budgets and nonnegative depth required')
        app_db = Path(os.getenv('DB_PATH', str(Path(__file__).resolve().parents[1] / 'data/scripts.db'))).resolve()
        db_url = os.getenv('DATABASE_URL', '')
        if db_url.startswith(('sqlite:///', 'sqlite+pysqlite:///')):
            app_db = Path(db_url.split(':///', 1)[1].split('?', 1)[0]).resolve()
        if Path(args.state).resolve() == app_db or (Path(args.state).exists() and app_db.exists() and os.path.samefile(args.state, app_db)):
            raise ValueError('crawler state must not be the application database')
        with run_lock(args.state):
            state = State(args.state)
            if args.command == 'run':
                fetcher = Fetcher(Limits(pages=args.max_pages, seconds=args.max_seconds, depth=args.max_depth))
                try:
                    rows = json.loads(fetcher.fetch(args.public_bundle_url, bundle=True))['externalPublicScripts'] if args.public_bundle_url else database_seeds()
                except Exception as exc:
                    state.db.execute('INSERT INTO runs(started,finished,status,error) VALUES(?,?,?,?)', (now(), now(), 'failed', 'seed load: ' + type(exc).__name__ + ': ' + str(exc)[:300]))
                    state.db.commit()
                    raise
                result = crawl(rows, state, fetcher)
            elif args.command == 'status':
                result = {'runs': state.rows('runs'), 'sources': state.rows('sources')}
            else:
                result = {'candidates': state.rows('candidates'), 'evidence': state.rows('evidence')}
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except Exception as exc:
        print(json.dumps({'error': type(exc).__name__, 'message': str(exc)}, ensure_ascii=False))
        return 1
    finally:
        if state:
            state.close()


if __name__ == '__main__':
    raise SystemExit(main())
