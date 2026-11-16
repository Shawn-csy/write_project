import json
import os
import sys
import tempfile
import unittest
from unittest.mock import patch
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from services.external_script_crawler import Fetcher, Limits, State, Truncated, crawl, identity, parse, validate_url


class FakeFetcher:
    limits = Limits()
    def __init__(self, pages):
        self.pages = pages
        self.calls = []
    def fetch(self, url):
        self.calls.append(url)
        page = self.pages[url]
        if isinstance(page, Exception):
            raise page
        return page


class CrawlerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.state = State(os.path.join(self.temp.name, 'state.sqlite'))
    def tearDown(self):
        self.state.close()
        self.temp.cleanup()
    def test_provider_aliases(self):
        self.assertEqual(identity('https://docs.google.com/document/u/0/d/abc/edit?q=1#x'), identity('https://drive.google.com/open?id=abc'))
        self.assertEqual(identity('https://cxc.today/en/@a/work/1/reader/2'), identity('https://cxc.today/zh/@a/work/1/reader/2?x=1'))
        self.assertEqual(identity('https://twitter.com/a/status/123'), identity('https://x.com/b/status/123?x=2'))
        self.assertEqual(identity('https://ci-en.dlsite.com/creator/2/article/3?x=1'), 'cien:2:3')
    def test_collection_and_repeat_and_known_canonical(self):
        rows = [{'id': '1', 'authorName': 'Stored Author', 'authorUrl': 'https://bedtimestoryasmr.com', 'sourceUrl': 'https://drive.google.com/open?id=abc', 'canonicalUrl': 'https://docs.google.com/document/d/xyz/edit'}]
        pages = {'https://bedtimestoryasmr.com': '<a href="/page/freedownload">台本</a>', 'https://bedtimestoryasmr.com/page/freedownload': '<h2>作品名</h2><a href="https://docs.google.com/document/d/abc/edit">點此下載</a><a href="https://docs.google.com/document/d/xyz/edit">別名</a><a href="https://drive.google.com/drive/folders/folder">作品集</a>'}
        self.assertEqual(crawl(rows, self.state, FakeFetcher(pages))['new_candidates'], 3)
        first = self.state.rows('candidates')
        self.assertEqual(crawl(rows, self.state, FakeFetcher(pages))['new_candidates'], 0)
        self.assertEqual([c['first_seen'] for c in first], [c['first_seen'] for c in self.state.rows('candidates')])
        self.assertEqual({c['kind'] for c in first}, {'collection', 'work'})
        self.assertTrue(all(c['known'] for c in first if c['kind'] == 'work'))
        self.assertEqual(next(c['title'] for c in first if c['identity'] == 'google:abc'), '作品名')
        self.assertEqual(json.loads(self.state.rows('evidence')[0]['provenance'])[0]['authorName'], 'Stored Author')
    def test_retry_failure_without_removal(self):
        rows = [{'sourceUrl': 'https://ci-en.dlsite.com/creator/2/article/3'}]
        profile = 'https://ci-en.dlsite.com/creator/2'
        pages = {profile: '<a href="/creator/2/article/3">collection</a><a href="/creator/999/article/123">recommended</a>', profile + '/article/3': '<a href="https://docs.google.com/document/d/new/edit">台本</a>'}
        crawl(rows, self.state, FakeFetcher(pages))
        self.assertEqual({c['kind'] for c in self.state.rows('candidates')}, {'article', 'work'})
        crawl(rows, self.state, FakeFetcher({profile: ValueError('HTTP 503')}))
        self.assertEqual(self.state.rows('sources')[0]['status'], 'error')
        self.assertEqual(len(self.state.rows('candidates')), 2)
        crawl(rows, self.state, FakeFetcher(pages))
        self.assertEqual(self.state.rows('sources')[0]['status'], 'success')
    def test_depth_and_page_limits(self):
        rows = [{'sourceUrl': 'https://bedtimestoryasmr.com'}]
        fetcher = FakeFetcher({'https://bedtimestoryasmr.com': '<a href="/page/freedownload">all</a>'})
        fetcher.limits = Limits(depth=0)
        self.assertEqual(crawl(rows, self.state, fetcher)['status'], 'partial')
        self.assertEqual(self.state.rows('sources')[0]['status'], 'truncated')
        fetcher = Fetcher(Limits(pages=0))
        with patch('services.external_script_crawler._public_addresses', return_value=('8.8.8.8',)):
            with self.assertRaises(Truncated):
                fetcher.prepare('https://bedtimestoryasmr.com')
    def test_unsupported_and_draft_known(self):
        rows = [{'sourceUrl': 'https://x.com/a'}, {'sourceUrl': 'https://cxc.today/zh/@a'}, {'sourceUrl': 'https://docs.google.com/document/d/a/edit'}]
        crawl(rows, self.state, FakeFetcher({}))
        self.assertTrue(all(s['status'] == 'unsupported' for s in self.state.rows('sources')))
    def test_draft_matches_and_terminal_challenge(self):
        source = 'https://bedtimestoryasmr.com'
        rows = [{'sourceUrl': source}, {'sourceUrl': 'https://docs.google.com/document/d/draft/edit', 'status': 'draft'}]
        pages = {source: '<a href="/page/freedownload">all</a>', source + '/page/freedownload': '<a href="https://docs.google.com/document/d/draft/edit">draft</a>'}
        crawl(rows, self.state, FakeFetcher(pages))
        self.assertEqual(self.state.rows('candidates')[0]['known'], 1)
        self.assertFalse(any('draft/edit' in row['url'] for row in self.state.rows('sources')))
        pages[source + '/page/freedownload'] = '<a href="/login">login</a>'
        crawl(rows, self.state, FakeFetcher(pages))
        self.assertEqual(self.state.rows('sources')[0]['status'], 'error')

    def test_refresh_and_state_guard(self):
        rows = [{'sourceUrl': 'https://ci-en.dlsite.com/creator/2/article/3'}]
        profile = 'https://ci-en.dlsite.com/creator/2'
        pages = {profile: '<a href="/creator/2/article/3">old</a>', profile + '/article/3': '<a href="https://docs.google.com/document/d/new/edit">old</a>'}
        crawl(rows, self.state, FakeFetcher(pages))
        pages[profile + '/article/3'] = '<a href="https://docs.google.com/document/d/new/edit?updated=1">updated</a>'
        crawl(rows, self.state, FakeFetcher(pages))
        row = next(c for c in self.state.rows('candidates') if c['kind'] == 'work')
        self.assertEqual(row['title'], 'updated')
        self.assertEqual(row['verification_status'], 'unverified_external_link')
        import sqlite3
        app = os.path.join(self.temp.name, 'app.sqlite')
        connection = sqlite3.connect(app)
        connection.execute('CREATE TABLE external_public_scripts(id TEXT)')
        connection.commit()
        connection.close()
        with self.assertRaises(ValueError):
            State(app)

    def test_new_article_and_document_discovered_on_next_run(self):
        profile = 'https://ci-en.dlsite.com/creator/2'
        rows = [{'sourceUrl': profile + '/article/3'}]
        pages = {profile: '<a href="/creator/2/article/3">First article</a>',
                 profile + '/article/3': '<a href="https://docs.google.com/document/d/first/edit">First work</a>'}
        crawl(rows, self.state, FakeFetcher(pages))
        original_seen = {c['identity']: c['first_seen'] for c in self.state.rows('candidates')}
        pages[profile] += '<a href="/creator/2/article/4">New article</a><a href="/creator/999/article/5">Recommendation</a>'
        pages[profile + '/article/4'] = '<a href="https://docs.google.com/document/d/second/edit">New work</a>'
        fetcher = FakeFetcher(pages)
        result = crawl(rows, self.state, fetcher)
        self.assertEqual(result['new_candidates'], 2)
        candidates = {c['identity']: c for c in self.state.rows('candidates')}
        self.assertEqual(candidates['google:second']['known'], 0)
        self.assertEqual(candidates['google:first']['first_seen'], original_seen['google:first'])
        self.assertNotIn('cien:999:5', candidates)
        self.assertFalse(any('/creator/999/' in url for url in fetcher.calls))
        self.assertEqual(crawl(rows, self.state, FakeFetcher(pages))['new_candidates'], 0)

    def test_ssrf_redirect_and_private_dns(self):
        for url in ('http://bedtimestoryasmr.com', 'https://bedtimestoryasmr.com:444', 'https://a:b@bedtimestoryasmr.com', 'https://127.0.0.1', 'https://evil.example'):
            with self.assertRaises(ValueError):
                validate_url(url)
        with patch('services.external_public_script_metadata.socket.getaddrinfo', return_value=[(2, 1, 6, '', ('127.0.0.1', 443))]):
            with self.assertRaises(ValueError):
                validate_url('https://bedtimestoryasmr.com')
        fetcher = Fetcher()
        redirect = next(h for h in fetcher.opener.handlers if hasattr(h, 'redirect_request'))
        from urllib.request import Request
        with self.assertRaises(ValueError):
            redirect.redirect_request(Request('https://bedtimestoryasmr.com'), None, 302, 'Found', {}, 'https://evil.example')
    def test_no_application_database_access(self):
        with patch('services.external_script_crawler.database_seeds', side_effect=AssertionError('catalog opened')):
            crawl([{'sourceUrl': 'https://x.com/a'}], self.state, FakeFetcher({}))
        self.assertEqual(set(r['name'] for r in self.state.db.execute('SELECT name FROM sqlite_master WHERE type="table"')), {'runs', 'sources', 'candidates', 'evidence'})


if __name__ == '__main__':
    unittest.main()
