"""Bounded public build capture and fail-closed frozen HTTP adapter (stdlib only)."""
import copy
from concurrent.futures import ThreadPoolExecutor
import hashlib
import html
import json
import threading
import time
from contextlib import contextmanager
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from html.parser import HTMLParser
from pathlib import Path
import sys
from urllib.parse import parse_qs, quote, unquote, urlencode, urlsplit
from urllib.request import Request, urlopen

API = 'https://api-open-scripts.shawnup.com'
PUBLIC = 'https://open-scripts.shawnup.com'
MAX_BYTES = 32 * 1024 * 1024
MAX_REQUESTS = 20000
CAPTURE_WORKERS = 8
USER_AGENT = 'OpenScriptsPublisher/1.0'
LISTS = ('scripts', 'personas', 'organizations', 'topTags', 'externalPublicScripts', 'demoSubmissions', 'audioWorks', 'activityPages', 'productionResources')


class ContentError(RuntimeError):
    pass


def public_request(url, accept='application/json', *, revalidate=False):
    # Identify our publisher consistently at Cloudflare; the default urllib
    # user agent is rejected by the production edge before reaching the API.
    headers = {'Accept': accept, 'User-Agent': USER_AGENT}
    if revalidate:
        headers['Cache-Control'] = 'no-cache'
    return Request(url, headers=headers)


def read_json(url, *, revalidate=False):
    with urlopen(public_request(url, revalidate=revalidate), timeout=30) as response:
        if response.status != 200:
            raise ContentError('Public read did not return 200')
        payload = response.read(MAX_BYTES + 1)
        if len(payload) > MAX_BYTES:
            raise ContentError('Public response exceeds size limit')
        return json.loads(payload)


def entities(value):
    if not isinstance(value, list) or any(not isinstance(x, dict) or not isinstance(x.get('id'), str) or not x['id'] for x in value):
        raise ContentError('Expected complete entity array with IDs')
    ids = [x['id'] for x in value]
    if len(ids) != len(set(ids)):
        raise ContentError('Duplicate entity IDs')
    return ids


def capture(reader=None):
    started = time.monotonic()
    reader = reader or (lambda path: read_json(API + path))
    snapshot = {}
    def get(path, kind):
        if len(snapshot) >= MAX_REQUESTS:
            raise ContentError('Public capture request limit exceeded')
        value = reader(path)
        if not isinstance(value, kind):
            raise ContentError('Unexpected public response shape: ' + path)
        snapshot[path] = copy.deepcopy(value)
        return value
    def get_many(requests):
        if len(snapshot) + len(requests) > MAX_REQUESTS:
            raise ContentError('Public capture request limit exceeded')
        if not requests:
            return []
        # Keep the published snapshot deterministic while bounding the amount
        # of simultaneous read-only requests sent to the production API.
        with ThreadPoolExecutor(max_workers=CAPTURE_WORKERS) as pool:
            values = list(pool.map(lambda request: reader(request[0]), requests))
        for (path, kind), value in zip(requests, values):
            if not isinstance(value, kind):
                raise ContentError('Unexpected public response shape: ' + path)
            snapshot[path] = copy.deepcopy(value)
        return values
    bundle = get('/api/public-bundle', dict)
    for key in LISTS:
        if not isinstance(bundle.get(key), list):
            raise ContentError('Missing full bundle section: ' + key)
        if key != 'topTags':
            entities(bundle[key])
    for key in ('banner', 'demoBanner'):
        if not isinstance(bundle.get(key), dict) or not isinstance(bundle[key].get('items'), list):
            raise ContentError('Missing banner items: ' + key)
    bundle_ids = entities(bundle['scripts'])
    scripts = get('/api/public-scripts', list)
    if set(entities(scripts)) != set(bundle_ids):
        raise ContentError('Bundle and script catalog disagree; retry next schedule')
    bundle_by_id = {item['id']: item for item in bundle['scripts']}
    for record in scripts:
        require_common_fields(bundle_by_id[record['id']], record)
    script_ids = entities(scripts)
    script_details = get_many([('/api/public-scripts/' + quote(ident, safe=''), dict)
                               for ident in script_ids])
    scripts_by_id = {record['id']: record for record in scripts}
    for ident, item in zip(script_ids, script_details):
        if item.get('id') != ident or not isinstance(item.get('content'), str) or not isinstance(item.get('title'), str) or not any(item.get(k) is not None for k in ('lastModified', 'updatedAt')):
            raise ContentError('Incomplete script detail')
        require_common_fields(bundle_by_id[ident], item)
        require_common_fields(scripts_by_id[ident], item)
    for route, query in (('public-personas', 'personaId'), ('public-organizations', 'organizationId')):
        items = get('/api/' + route, list)
        ids = entities(items)
        requests = [(path, kind) for ident in ids for path, kind in (
            ('/api/' + route + '/' + quote(ident, safe=''), dict),
            ('/api/public-scripts?' + urlencode({query: ident}), list))]
        values = get_many(requests)
        for ident, detail, filtered in zip(ids, values[::2], values[1::2]):
            if detail.get('id') != ident:
                raise ContentError('Incomplete identity detail')
            if not set(entities(filtered)).issubset(set(bundle_ids)):
                raise ContentError('Filtered catalog disagrees')
    entities(get('/api/themes/public', list))
    if set(entities(bundle['personas'])) != set(entities(snapshot['/api/public-personas'])) or set(entities(bundle['organizations'])) != set(entities(snapshot['/api/public-organizations'])):
        raise ContentError('Bundle identities disagree with catalogs')
    print(f'[content-snapshot] captured {len(snapshot)} endpoints in {time.monotonic() - started:.1f}s '
          f'({CAPTURE_WORKERS} workers)', file=sys.stderr, flush=True)
    return snapshot


def empty_routes(snapshot):
    """Exact allowlisted stage directories whose static parameter set is proven empty."""
    bundle = snapshot['/api/public-bundle']
    scripts = bundle['scripts']
    external = [item for item in bundle['externalPublicScripts'] if item.get('status') == 'published']
    def named(value):
        return isinstance(value, str) and bool(value.strip())
    routes = []
    for directory, values in (
        ('read/[id]', scripts),
        ('author/[id]', snapshot['/api/public-personas']),
        ('org/[id]', snapshot['/api/public-organizations']),
        ('author/external/[name]', [x for x in external if str(x.get('authorName') or '').strip()]),
        ('org/external/[name]', [x for x in external if str(x.get('organizationName') or '').strip()]),
        ('series/[name]', [x for x in scripts if named((x.get('series') or {}).get('name'))] + [x for x in external if named(x.get('seriesName'))]),
        ('tag/[name]', [tag for x in scripts for tag in x.get('tags', []) if named(tag if isinstance(tag, str) else tag.get('name'))] + [tag for x in external for tag in x.get('categories', []) if named(tag)]),
        ('resources/[id]', [ident for x in bundle['productionResources'] for ident in x.get('legacyIds', [])]),
    ):
        if not values:
            routes.append(directory)
    return routes


def require_common_fields(left, right):
    # Bundle uses schemas.Script minus content and plus contentLength; nested
    # owner email is redacted. Compare publication fields shared by projections.
    fields = ('id', 'title', 'content', 'lastModified', 'updatedAt', 'createdAt', 'synopsis',
              'coverUrl', 'coverCrop', 'coverDesign', 'tags', 'series', 'seriesId',
              'seriesOrder', 'customMetadata', 'targetAudience', 'contentRating',
              'license', 'licenseSpecialTerms', 'authorDisplayMode', 'authorOverrideName',
              'licenseCommercial', 'licenseDerivative', 'licenseNotify', 'outline',
              'activityName', 'activityBannerUrl', 'activityContent', 'activityWorkUrl',
              'activityDemoLinks', 'disableCopy')
    for field in fields:
        if field not in left or field not in right:
            continue
        a, b = left[field], right[field]
        if field == 'tags' and isinstance(a, list) and isinstance(b, list):
            # List and detail queries return the same tag relation in different
            # database order. Compare every tag field, without requiring order.
            a = sorted(json.dumps(item, sort_keys=True) for item in a)
            b = sorted(json.dumps(item, sort_keys=True) for item in b)
        if a != b:
            raise ContentError('Public content projections disagree; retry next schedule')
    # Detail handlers normalize persona JSON and organization tags; those full
    # objects intentionally differ. Their stable displayed identity fields must
    # still agree, as must the owner after its email redaction.
    for key, names in (
        ('persona', ('id', 'displayName', 'avatar', 'bio', 'website')),
        ('organization', ('id', 'name', 'logoUrl', 'description')),
        ('owner', ('id', 'displayName', 'avatar', 'avatarUrl')),
    ):
        a, b = left.get(key), right.get(key)
        if isinstance(a, dict) and isinstance(b, dict):
            for name in names:
                if name in a and name in b and a[name] != b[name]:
                    raise ContentError('Public identity projections disagree; retry next schedule')


def fingerprint(snapshot):
    def clean(value):
        if isinstance(value, dict):
            return {k: clean(v) for k, v in value.items() if k not in ('views', 'likes', 'viewCount', 'likeCount')}
        if isinstance(value, list):
            return [clean(v) for v in value]
        return value
    normalized = clean(snapshot)
    normalized['/api/public-bundle'].pop('topTags', None)
    for path, value in normalized.items():
        if isinstance(value, list):
            value.sort(key=lambda x: str(x.get('id', '')))
    for key in LISTS:
        value = normalized['/api/public-bundle'].get(key)
        if isinstance(value, list):
            value.sort(key=lambda x: str(x.get('id', '')))
    return hashlib.sha256(json.dumps(normalized, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()).hexdigest()


@contextmanager
def frozen_server(snapshot):
    frozen = copy.deepcopy(snapshot)
    failures = []
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            parsed = urlsplit(self.path)
            query = parse_qs(parsed.query, keep_blank_values=True)
            path = parsed.path + ('?' + urlencode(sorted((k, v) for k, values in query.items() for v in values)) if query else '')
            try:
                if parsed.path == '/api/public-bundle' and set(query) == {'sections'} and len(query['sections']) == 1:
                    sections = query['sections'][0].split(',')
                    body = {key: frozen['/api/public-bundle'][key] for key in sections}
                else:
                    body = frozen[path]
            except KeyError:
                failures.append(self.path)
                self.send_error(404)
                return
            payload = json.dumps(body).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        def do_POST(self):
            failures.append(self.path)
            self.send_error(405)
        do_PUT = do_DELETE = do_PATCH = do_HEAD = do_OPTIONS = do_POST
        def log_message(self, *_args):
            pass
    server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield 'http://127.0.0.1:' + str(server.server_port), failures
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


def validate_export(output, snapshot):
    output = Path(output)
    for name in ('index.html', '404.html', 'sitemap.xml'):
        if not (output / name).is_file():
            raise ContentError('Missing exported ' + name)
    expected = set(entities(snapshot['/api/public-scripts']))
    actual = {p.stem for p in (output / 'read').glob('*.html')}
    actual |= {p.parent.name for p in (output / 'read').glob('*/index.html')}
    if actual != expected:
        raise ContentError('Exported script routes differ from capture')
    sitemap = (output / 'sitemap.xml').read_text()
    validate_sitemap(sitemap, snapshot)
    for ident in expected:
        path = output / 'read' / (ident + '.html')
        if not path.exists():
            path = output / 'read' / ident / 'index.html'
        source = path.read_text()
        title = snapshot['/api/public-scripts/' + quote(ident, safe='')]['title']
        if html.escape(title) not in source or '<title>' not in source or '/read/' + quote(ident, safe='') not in sitemap:
            raise ContentError('Missing read HTML metadata or sitemap route')
    for path in output.rglob('*'):
        if path.is_file() and path.suffix in ('.html', '.js', '.json', '.xml'):
            data = path.read_text(errors='replace')
            if 'http://127.0.0.1:' in data or 'dev-open-scripts' in data:
                raise ContentError('Private build origin leaked into export')
    if 'data-deploy-environment="production"' not in (output / 'index.html').read_text():
        raise ContentError('Expected production export')


def validate_sitemap(source, snapshot):
    import xml.etree.ElementTree as ET
    try:
        locations = [node.text or '' for node in ET.fromstring(source).iter() if node.tag.rsplit('}', 1)[-1] == 'loc']
    except ET.ParseError as error:
        raise ContentError('Invalid public sitemap XML') from error
    expected = set(entities(snapshot['/api/public-scripts']))
    read_urls = [url for url in locations if urlsplit(url).path.startswith('/read/')]
    actual = {unquote(urlsplit(url).path.removeprefix('/read/').rstrip('/')) for url in read_urls}
    if actual != expected or any(urlsplit(url).scheme != 'https' or urlsplit(url).netloc != urlsplit(PUBLIC).netloc for url in read_urls):
        raise ContentError('Sitemap script routes differ from capture')


def validate_html(source, script=None):
    class PublicHTML(HTMLParser):
        def __init__(self):
            super().__init__()
            self.production = False
            self.in_title = False
            self.title = ''
            self.canonicals = []
        def handle_starttag(self, tag, attributes):
            attrs = dict(attributes)
            if attrs.get('data-deploy-environment') == 'production':
                self.production = True
            if tag == 'title':
                self.in_title = True
            if tag == 'link' and 'canonical' in attrs.get('rel', '').split():
                self.canonicals.append(attrs.get('href', ''))
        def handle_endtag(self, tag):
            if tag == 'title':
                self.in_title = False
        def handle_data(self, data):
            if self.in_title:
                self.title += data
    page = PublicHTML()
    page.feed(source)
    if not page.production or not page.title:
        raise ContentError('Public HTML lacks production shell or title')
    if script:
        canonical_paths = [(urlsplit(url).scheme, urlsplit(url).netloc, unquote(urlsplit(url).path)) for url in page.canonicals]
        expected = ('https', urlsplit(PUBLIC).netloc, '/read/' + script['id'])
        if script['title'] not in page.title or expected not in canonical_paths:
            raise ContentError('Public read HTML title or canonical differs from capture')
