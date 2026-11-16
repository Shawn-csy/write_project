"""Bounded public listing discovery. Never writes the application catalog."""
from __future__ import annotations

import fcntl
import json
import re
import sqlite3
import time
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, urljoin, urlsplit, urlunsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

from services.external_public_script_metadata import _PinnedHTTPSHandler, _public_addresses

BUNDLE_URL = 'https://api-open-scripts.shawnup.com/api/public-bundle?sections=externalPublicScripts'
HOSTS = {'bedtimestoryasmr.com', 'www.bedtimestoryasmr.com', 'ci-en.dlsite.com'}


def identity(url):
    """Stable provider identity; Google Docs and Drive aliases share file ids."""
    try:
        p = urlsplit(url)
        host = (p.hostname or '').lower()
        if host in {'docs.google.com', 'www.docs.google.com', 'drive.google.com', 'www.drive.google.com'}:
            match = re.search(r'/(?:document/(?:u/\d+/)?d|file/d)/([\w-]+)', p.path)
            file_id = match.group(1) if match else parse_qs(p.query).get('id', [''])[0]
            if file_id and re.fullmatch(r'[\w-]+', file_id) and '/folders/' not in p.path:
                return 'google:' + file_id
        if host in {'x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com'}:
            match = re.search(r'/status/(\d+)', p.path)
            if match:
                return 'x:' + match.group(1)
        if host == 'cxc.today':
            match = re.search(r'/(work|item)/(\d+)(?:/reader/(\d+))?', p.path)
            if match:
                return 'cxc:' + ':'.join(x for x in match.groups() if x)
        if host == 'ci-en.dlsite.com':
            match = re.search(r'/creator/(\d+)/article/(\d+)', p.path)
            if match:
                return 'cien:' + ':'.join(match.groups())
        return urlunsplit((p.scheme.lower(), host, p.path.rstrip('/'), '', ''))
    except ValueError:
        return ''


def validate_url(url, *, bundle=False):
    p = urlsplit(url)
    hosts = HOSTS | ({'api-open-scripts.shawnup.com'} if bundle else set())
    if p.scheme != 'https' or p.hostname not in hosts or p.username or p.password or p.port not in (None, 443):
        raise ValueError('URL rejected: HTTPS supported host required')
    if p.hostname == 'api-open-scripts.shawnup.com' and url != BUNDLE_URL:
        raise ValueError('Only the fixed public seed bundle endpoint is allowed')
    _public_addresses(p.hostname)
    return url


@dataclass
class Limits:
    pages: int = 40
    seconds: float = 120
    timeout: float = 8
    max_bytes: int = 2 * 1024 * 1024
    spacing: float = 0.5
    depth: int = 3
    redirects: int = 4


class Truncated(Exception):
    pass


class Fetcher:
    def __init__(self, limits=None):
        self.limits = limits or Limits()
        self.started = time.monotonic()
        self.pages = 0
        self.last = {}
        outer = self

        class Redirects(HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                count = getattr(req, '_crawler_redirects', 0) + 1
                if count > outer.limits.redirects:
                    raise ValueError('redirect limit exceeded')
                outer.prepare(newurl)
                redirected = super().redirect_request(req, fp, code, msg, headers, newurl)
                redirected._crawler_redirects = count
                return redirected

        self.opener = build_opener(ProxyHandler({}), Redirects(), _PinnedHTTPSHandler())

    def prepare(self, url, bundle=False):
        validate_url(url, bundle=bundle)
        if self.pages >= self.limits.pages or time.monotonic() - self.started >= self.limits.seconds:
            raise Truncated('run page/time budget exhausted')
        host = urlsplit(url).hostname
        delay = self.limits.spacing - (time.monotonic() - self.last.get(host, 0))
        if delay > 0:
            time.sleep(delay)
        if time.monotonic() - self.started >= self.limits.seconds:
            raise Truncated('run time budget exhausted')
        self.last[host] = time.monotonic()
        self.pages += 1

    def fetch(self, url, *, bundle=False):
        self.prepare(url, bundle)
        remaining = self.limits.seconds - (time.monotonic() - self.started)
        with self.opener.open(Request(url, headers={'User-Agent': 'OpenScriptsDiscovery/1.0', 'Accept': 'application/json' if bundle else 'text/html'}), timeout=min(self.limits.timeout, remaining)) as response:
            validate_url(response.geturl(), bundle=bundle)
            content_type = response.headers.get('Content-Type', '').lower()
            if not any(t in content_type for t in (('application/json',) if bundle else ('text/html', 'application/xhtml+xml'))):
                raise ValueError('unexpected content type')
            body = response.read(self.limits.max_bytes + 1)
        if len(body) > self.limits.max_bytes:
            raise ValueError('response byte limit exceeded')
        return body.decode('utf-8', errors='replace')


class ListingParser(HTMLParser):
    """Keep only bounded anchor/heading metadata, never a page body."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links = []
        self.heading = ''
        self.heading_tag = ''
        self.anchor = None
        self.title = ''
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ('h1', 'h2', 'h3', 'h4'):
            self.heading = ''
            self.heading_tag = tag
        if tag == 'title':
            self.in_title = True
        if tag == 'a':
            self.anchor = [attrs.get('href', ''), '', self.heading]

    def handle_data(self, data):
        if self.heading_tag:
            self.heading = (self.heading + data)[:500]
        if self.in_title:
            self.title = (self.title + data)[:500]
        if self.anchor:
            self.anchor[1] = (self.anchor[1] + data)[:500]

    def handle_endtag(self, tag):
        if tag == self.heading_tag:
            self.heading_tag = ''
        if tag == 'title':
            self.in_title = False
        if tag == 'a' and self.anchor:
            self.links.append(tuple(self.anchor))
            self.anchor = None


def parse(html):
    parser = ListingParser()
    parser.feed(html)
    return parser


def sources_from_rows(rows):
    sources = {}
    for row in rows:
        if row.get('status', 'published') != 'published':
            continue
        for field in ('sourceUrl', 'canonicalUrl', 'authorUrl', 'organizationUrl'):
            raw = row.get(field) or ''
            if not raw:
                continue
            p = urlsplit(raw)
            url = urlunsplit((p.scheme, p.netloc, p.path.rstrip('/'), '', ''))
            match = re.match(r'/creator/(\d+)', p.path)
            if p.hostname == 'ci-en.dlsite.com' and match:
                url = 'https://ci-en.dlsite.com/creator/' + match.group(1)
            elif p.hostname in {'bedtimestoryasmr.com', 'www.bedtimestoryasmr.com'}:
                url = 'https://bedtimestoryasmr.com'
            sources.setdefault(url, []).append({key: row.get(key, '') for key in ('id', 'authorName', 'authorUrl', 'organizationName', 'organizationUrl')})
    return sources


class State:
    def __init__(self, path):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(path)
        self.db.row_factory = sqlite3.Row
        if self.db.execute("SELECT name FROM sqlite_master WHERE name IN ('external_public_scripts','users','scripts')").fetchone():
            self.db.close()
            raise ValueError('state file contains application tables')
        self.db.executescript('''
        CREATE TABLE IF NOT EXISTS runs(id INTEGER PRIMARY KEY,started TEXT,finished TEXT,status TEXT,error TEXT);
        CREATE TABLE IF NOT EXISTS sources(url TEXT PRIMARY KEY,status TEXT,error TEXT,last_run INTEGER,first_seen TEXT,last_seen TEXT,provenance TEXT);
        CREATE TABLE IF NOT EXISTS candidates(identity TEXT PRIMARY KEY,url TEXT,kind TEXT,title TEXT,known INTEGER,first_seen TEXT,last_seen TEXT,last_run INTEGER);
        CREATE TABLE IF NOT EXISTS evidence(identity TEXT,source_url TEXT,page_url TEXT,provenance TEXT,PRIMARY KEY(identity,source_url,page_url));
        ''')
        self.db.commit()

    def rows(self, table):
        if table not in ('runs', 'sources', 'candidates', 'evidence'):
            raise ValueError('invalid table')
        rows = [dict(row) for row in self.db.execute('SELECT * FROM ' + table)]
        if table == 'candidates':
            for row in rows:
                row['verification_status'] = 'unverified_external_link'
                row['title_source'] = 'listing_anchor_or_nearby_heading'
                row['publication_status'] = 'unknown'
        return rows

    def close(self):
        self.db.close()


@contextmanager
def run_lock(path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(str(path) + '.lock', 'a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise ValueError('another crawler run holds the state lock') from exc
        yield


def now():
    return datetime.now(timezone.utc).isoformat()


def crawl(rows, state, fetcher=None):
    fetcher = fetcher or Fetcher()
    known = {identity(row.get(field, '')) for row in rows for field in ('sourceUrl', 'canonicalUrl') if row.get(field)}
    db = state.db
    stamp = now()
    run = db.execute('INSERT INTO runs(started,status,error) VALUES(?,?,?)', (stamp, 'running', '')).lastrowid
    db.commit()
    before = db.execute('SELECT count(*) FROM candidates').fetchone()[0]
    statuses = []
    try:
        sources = sources_from_rows(rows)
        previous = {row['url']: row['last_run'] for row in state.rows('sources')}
        ordered = sorted(sources, key=lambda url: (previous.get(url, 0), url))
        for source in ordered:
            provenance = sources[source]
            status, error = 'success', ''
            host = urlsplit(source).hostname
            if host not in HOSTS:
                status, error = 'unsupported', 'Discovery needs a listing adapter; individual Google files, X timelines and CXC JS shells cannot enumerate works'
            else:
                queue, seen = [(source, 0)], set()
                recognized = False
                terminal_listing_works = False
                source_pages = 0
                try:
                    while queue:
                        page, depth = queue.pop(0)
                        if page in seen:
                            continue
                        if depth > fetcher.limits.depth:
                            raise Truncated('discovery depth limit exceeded')
                        source_pages += 1
                        if source_pages > 12:
                            raise Truncated('per-source page budget exhausted')
                        parsed = parse(fetcher.fetch(page))
                        seen.add(page)
                        for href, label, heading in parsed.links:
                            url = urljoin(page, href)
                            p = urlsplit(url)
                            try:
                                if p.scheme != 'https' or p.username or p.password or p.port not in (None, 443):
                                    continue
                            except ValueError:
                                continue
                            key = identity(url)
                            kind = 'collection' if p.hostname == 'drive.google.com' and '/folders/' in p.path else 'work' if key.startswith('google:') else 'article' if key.startswith('cien:') else ''
                            if kind == 'article' and (host != 'ci-en.dlsite.com' or not p.path.startswith(urlsplit(source).path + '/article/')):
                                kind = ''
                            if kind:
                                recognized = True
                                if urlsplit(page).path.rstrip('/') == '/page/freedownload' and kind in ('work', 'collection'):
                                    terminal_listing_works = True
                                title = ' '.join((heading if label.strip() in ('點此下載', '下載', 'Download', '台本連結', '台本連結：') else label).split())[:500]
                                db.execute('INSERT INTO candidates VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(identity) DO UPDATE SET last_seen=excluded.last_seen,last_run=excluded.last_run,known=excluded.known,url=excluded.url,kind=excluded.kind,title=CASE WHEN length(excluded.title) > 0 THEN excluded.title ELSE candidates.title END', (key, url, kind, title, int(key in known), stamp, stamp, run))
                                db.execute('INSERT OR REPLACE INTO evidence VALUES(?,?,?,?)', (key, source, page, json.dumps(provenance, ensure_ascii=False)))
                            follow = False
                            if host in {'bedtimestoryasmr.com', 'www.bedtimestoryasmr.com'}:
                                follow = p.hostname in {'bedtimestoryasmr.com', 'www.bedtimestoryasmr.com'} and p.path.rstrip('/') == '/page/freedownload'
                            elif host == 'ci-en.dlsite.com':
                                creator_path = urlsplit(source).path
                                follow = p.hostname == host and (re.fullmatch(re.escape(creator_path) + r'/article/\d+', p.path) is not None or p.path.rstrip('/') in (creator_path, creator_path + '/article'))
                                if follow:
                                    # Only known pagination parameters; never follow login or arbitrary outbound links.
                                    query = parse_qs(p.query)
                                    query = {k: v for k, v in query.items() if k in ('page',)}
                                    from urllib.parse import urlencode
                                    url = urlunsplit(('https', host, p.path.rstrip('/'), urlencode(query, doseq=True), ''))
                            if follow:
                                recognized = True
                            if follow and url not in seen and all(url != item[0] for item in queue):
                                queue.append((url, depth + 1))
                        if not parsed.links:
                            raise ValueError('listing contains no anchors; inaccessible or unsupported shell')
                    if host in {'bedtimestoryasmr.com', 'www.bedtimestoryasmr.com'} and not terminal_listing_works:
                        raise ValueError('free-download listing has no recognizable work links')
                    if not recognized:
                        raise ValueError('expected listing/work links missing; possible challenge or changed layout')
                except Truncated as exc:
                    status, error = 'truncated', str(exc)
                except Exception as exc:
                    status, error = 'error', type(exc).__name__ + ': ' + str(exc)[:300]
            db.execute('INSERT INTO sources VALUES(?,?,?,?,?,?,?) ON CONFLICT(url) DO UPDATE SET status=excluded.status,error=excluded.error,last_run=excluded.last_run,last_seen=excluded.last_seen,provenance=excluded.provenance', (source, status, error, run if status not in ('truncated',) or seen else previous.get(source, 0), stamp, stamp, json.dumps(provenance, ensure_ascii=False)))
            db.commit()
            statuses.append(status)
        status = 'partial' if any(s in ('error', 'truncated') for s in statuses) else 'completed'
        db.execute('UPDATE runs SET finished=?,status=? WHERE id=?', (now(), status, run))
        db.commit()
    except BaseException as exc:
        db.execute('UPDATE runs SET finished=?,status=?,error=? WHERE id=?', (now(), 'failed', type(exc).__name__, run))
        db.commit()
        raise
    return {'run_id': run, 'status': status, 'new_candidates': db.execute('SELECT count(*) FROM candidates').fetchone()[0] - before, 'source_statuses': {s: statuses.count(s) for s in set(statuses)}, 'observed_by_kind': {kind: db.execute('SELECT count(*) FROM candidates WHERE last_run=? AND kind=?', (run, kind)).fetchone()[0] for kind in ('work', 'article', 'collection')}, 'unindexed_work_candidates': db.execute("SELECT count(*) FROM candidates WHERE last_run=? AND kind='work' AND known=0", (run,)).fetchone()[0], 'known_matches': db.execute('SELECT count(*) FROM candidates WHERE last_run=? AND known=1', (run,)).fetchone()[0]}


def database_seeds():
    """SELECT only; transaction read-only is enforced on the application connection."""
    from database import SessionLocal
    from sqlalchemy import text
    import models
    with SessionLocal() as session:
        if session.bind.dialect.name == 'sqlite':
            session.execute(text('PRAGMA query_only=ON'))
        elif session.bind.dialect.name == 'postgresql':
            session.execute(text('SET TRANSACTION READ ONLY'))
        try:
            columns = ('id', 'sourceUrl', 'canonicalUrl', 'authorName', 'authorUrl', 'organizationName', 'organizationUrl', 'status')
            return [dict(zip(columns, row)) for row in session.query(*(getattr(models.ExternalPublicScript, key) for key in columns)).all()]
        finally:
            session.rollback()
            if session.bind.dialect.name == 'sqlite':
                session.execute(text('PRAGMA query_only=OFF'))
