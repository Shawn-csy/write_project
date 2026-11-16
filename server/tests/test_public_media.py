import base64
import io
from pathlib import Path
import pytest
from PIL import Image
from services import public_media as media

def token(value):
    return base64.urlsafe_b64encode(value.encode()).decode().rstrip('=')

@pytest.fixture
def storage(tmp_path, monkeypatch):
    monkeypatch.setenv('MEDIA_STORAGE_ROOT', str(tmp_path))
    return tmp_path

def png(path, width=1200, height=1800):
    image = Image.new('RGB', (width, height), (200, 40, 40))
    image.save(path)

@pytest.mark.parametrize('value', ['/media/%2e%2e/admin', '/media/a/../b.png', '/media/a\\b', '/media//host/a', '/media/x%00.png', '/api/admin', '/media/%2f%2fhost/x', '/media/%5cfoo'])
def test_bad_paths(client, storage, value):
    response = client.get('/api/public-media/' + token(value))
    assert response.status_code == 400
    assert response.headers['cache-control'] == 'no-store'

def test_local_variants_and_query(client, storage):
    png(storage / 'cover.png')
    value = token('/media/cover.png')
    for url in [f'/api/public-media/{value}.webp?w=241', f'/api/public-media?token={value}&w=241']:
        response = client.get(url)
        assert response.status_code == 200
        assert response.headers['content-type'] == 'image/webp'
        assert Image.open(io.BytesIO(response.content)).width == 360
        assert 's-maxage=2592000' in response.headers['cache-control']
        assert response.headers['x-content-type-options'] == 'nosniff'
        assert 'sandbox' in response.headers['content-security-policy']

def test_degraded_and_missing(client, storage):
    (storage / 'bad.png').write_bytes(b'broken')
    response = client.get('/api/public-media/' + token('/media/bad.png') + '?w=48')
    assert response.content == b'broken'
    assert response.headers['cache-control'] == media.DEGRADED_CACHE
    assert client.get('/api/public-media/' + token('/media/missing.png')).status_code == 404
    assert client.get('/api/public-media/' + 'x' * 4097).status_code == 400

def test_symlink_and_nonimage(client, storage, tmp_path):
    outside = storage.parent / 'outside.png'
    png(outside)
    (storage / 'link.png').symlink_to(outside)
    assert client.get('/api/public-media/' + token('/media/link.png')).status_code == 400
    (storage / 'page.html').write_text('<html>')
    assert client.get('/api/public-media/' + token('/media/page.html')).status_code == 415

def test_bounded_body_and_resize(client, storage, monkeypatch):
    monkeypatch.setattr(media, 'MAX_PROXIED_BYTES', 8)
    (storage / 'large.gif').write_bytes(b'x' * 9)
    assert client.get('/api/public-media/' + token('/media/large.gif')).status_code == 413
    with pytest.raises(media.MediaError) as exc:
        media.read_bounded(io.BytesIO(b'x' * 9), 8, 1)
    assert exc.value.status == 413

def test_pixel_ceiling(client, storage, monkeypatch):
    png(storage / 'pixels.png', 100, 100)
    monkeypatch.setattr(media, 'MAX_RESIZE_INPUT_PIXELS', 9999)
    response = client.get('/api/public-media/' + token('/media/pixels.png') + '?w=48')
    assert response.headers['cache-control'] == media.DEGRADED_CACHE

def test_cache_invalidates_on_replacement(client, storage, monkeypatch):
    png(storage / 'cache.png')
    url = '/api/public-media/' + token('/media/cache.png') + '?w=48'
    first = client.get(url)
    original = media.image_response
    monkeypatch.setattr(media, 'image_response', lambda *a: pytest.fail('cached variant encoded again'))
    assert client.get(url).content == first.content
    monkeypatch.setattr(media, 'image_response', original)
    (storage / 'cache.png').write_bytes(b'broken')
    assert client.get(url).headers['cache-control'] == media.DEGRADED_CACHE

def test_capacity_failure(client, storage, monkeypatch):
    monkeypatch.setattr(media, 'media_gate', media.CapacityGate(1, 0))
    with media.media_gate.slot():
        response = client.get('/api/public-media/' + token('/media/a.png'))
    assert response.status_code == 503
    assert response.headers['cache-control'] == 'no-store'

def test_missing_external(client):
    assert client.get('/api/public-media/external/missing.webp').status_code == 404

@pytest.mark.parametrize('value', ['http://127.0.0.1/a', 'http://169.254.169.254/a', 'http://[::ffff:127.0.0.1]/a', 'http://localhost/a', 'http://x.local/a', 'https://user:pass@public.example/a'])
def test_remote_unsafe(value):
    with pytest.raises(media.MediaError) as exc:
        media.remote_bytes(value, None)
    assert exc.value.status == 400

def test_external_published_only(client, db_session, storage):
    import models
    png(storage / 'external.png', 100, 100)
    item = models.ExternalPublicScript(id='public-cover', sourceUrl='https://example.com/item', status='draft', remoteCoverUrl='/media/external.png')
    db_session.add(item)
    db_session.commit()
    url = '/api/public-media/external/public-cover.webp?w=48'
    assert client.get(url).status_code == 404
    item.status = 'published'
    db_session.commit()
    assert client.get(url).status_code == 200

class RemoteResponse(io.BytesIO):
    def __init__(self, status=200, headers=None, body=b'abc'):
        super().__init__(body)
        self.status, self.headers = status, headers or {'content-type': 'image/png'}

def test_redirect_revalidates_and_bounds(monkeypatch):
    calls = []
    class Opener:
        def open(self, request, timeout):
            calls.append(request)
            return RemoteResponse(302, {'location': 'http://169.254.169.254/a'})
    monkeypatch.setattr(media, 'build_opener', lambda *a: Opener())
    with pytest.raises(media.MediaError) as exc:
        media.remote_bytes('https://public.example/a', None)
    assert exc.value.status == 400
    assert len(calls) == 1
    assert not calls[0].has_header('Cookie')
    assert not calls[0].has_header('Authorization')


def test_redirect_loop_is_bounded(monkeypatch):
    calls = []
    class Opener:
        def open(self, request, timeout):
            calls.append(request.full_url)
            return RemoteResponse(302, {'location': '/again'})
    monkeypatch.setattr(media, 'build_opener', lambda *a: Opener())
    with pytest.raises(media.MediaError):
        media.remote_bytes('https://public.example:8443/a', None)
    assert len(calls) == 4
    assert calls[1] == 'https://public.example:8443/again'


def test_pinned_transport_preserves_hostname_and_uses_vetted_addresses(monkeypatch):
    from urllib.request import Request
    metadata = media.metadata
    destinations = []
    monkeypatch.setattr(metadata, '_public_addresses', lambda host: ('93.184.216.34',))
    monkeypatch.setattr(metadata.socket, 'create_connection', lambda addr, timeout, source: destinations.append(addr) or object())
    class Connection:
        def __init__(self, host, timeout, **kwargs):
            assert host == 'images.example:8443'
    class Handler:
        def do_open(self, factory, request):
            connection = factory('images.example:8443', 10)
            connection._create_connection(('images.example', 8443), 10)
            return 'ok'
    assert media.open_pinned(Handler(), Request('https://images.example:8443/image.png'), Connection) == 'ok'
    assert destinations == [('93.184.216.34', 8443)]


def test_mixed_dns_answer_rejected(monkeypatch):
    metadata = media.metadata
    monkeypatch.setattr(metadata.socket, 'getaddrinfo', lambda *a, **k: [(2, 1, 6, '', ('93.184.216.34', 0)), (2, 1, 6, '', ('127.0.0.1', 0))])
    with pytest.raises(metadata.ExternalMetadataError):
        metadata._public_addresses('mixed.example')


def test_no_environment_proxy_or_auto_redirect(monkeypatch):
    handlers = []
    monkeypatch.setattr(media, 'build_opener', lambda *args: handlers.extend(args) or type('Opener', (), {'open': lambda *a, **k: RemoteResponse()})())
    assert media.remote_bytes('https://images.example/a', None) == (b'abc', 'image/png')
    assert handlers[0].proxies == {}
    assert isinstance(handlers[1], media.NoRedirect)

@pytest.mark.parametrize('address', ['224.0.0.1', '239.255.255.250', '192.88.99.1', 'ff02::1'])
def test_additional_special_addresses(monkeypatch, address):
    monkeypatch.setattr(media.metadata, '_public_addresses', lambda host: (address,))
    with pytest.raises(media.metadata.ExternalMetadataError):
        media.public_addresses('unsafe.example')

def test_remote_route_and_errors(client, db_session, monkeypatch):
    import models
    item = models.ExternalPublicScript(id='remote-cover', sourceUrl='https://example.com/script', status='published', remoteCoverUrl='https://images.example/cover')
    db_session.add(item)
    db_session.commit()
    class Opener:
        def open(self, request, timeout):
            return RemoteResponse()
    monkeypatch.setattr(media, 'build_opener', lambda *a: Opener())
    response = client.get('/api/public-media/external/remote-cover.webp')
    assert response.content == b'abc'
    assert response.headers['cache-control'] == media.REMOTE_CACHE
    item.remoteCoverUrl = 'http://127.0.0.1/image'
    db_session.commit()
    assert client.get('/api/public-media/external/remote-cover').status_code == 400


def test_resize_gate_failure(client, storage, monkeypatch):
    png(storage / 'busy.png')
    monkeypatch.setattr(media, 'resize_gate', media.CapacityGate(1, 0))
    with media.resize_gate.slot():
        response = client.get('/api/public-media/' + token('/media/busy.png') + '?w=48')
    assert response.status_code == 503
    assert response.headers['cache-control'] == 'no-store'


def test_small_and_animated_unchanged(client, storage):
    png(storage / 'small.png', 10, 10)
    response = client.get('/api/public-media/' + token('/media/small.png') + '?w=48')
    assert response.content == (storage / 'small.png').read_bytes()
    assert response.headers['cache-control'] == media.LOCAL_CACHE
    frames = [Image.new('RGB', (100, 100), color) for color in ['red', 'blue']]
    frames[0].save(storage / 'animated.png', save_all=True, append_images=frames[1:], duration=100, loop=0)
    response = client.get('/api/public-media/' + token('/media/animated.png') + '?w=48')
    assert response.content == (storage / 'animated.png').read_bytes()


def test_absolute_body_deadline(monkeypatch):
    times = iter([1, 1, 11])
    monkeypatch.setattr(media.time, 'monotonic', lambda: next(times))
    with pytest.raises(media.MediaError) as exc:
        media.read_bounded(io.BytesIO(b'abcd'), 10, deadline=10)
    assert exc.value.status == 502


def test_queue_timeout_releases_accounting():
    gate = media.CapacityGate(1, 1, timeout=0.001)
    with gate.slot():
        with pytest.raises(media.MediaError):
            with gate.slot():
                pass
        assert gate.waiting == 0
    assert gate.active == 0

def test_slow_headers_absolute_deadline_releases_media_slot(monkeypatch):
    import socket
    import threading
    import time
    from urllib.request import Request
    peers = []
    def create_connection(destination, timeout, source=None):
        left, right = socket.socketpair()
        left.settimeout(timeout)
        peers.append(right)
        return left
    monkeypatch.setattr(media, 'resolve_bounded', lambda host, deadline: ('93.184.216.34',))
    monkeypatch.setattr(media.socket, 'create_connection', create_connection)
    class Handler:
        def do_open(self, factory, request):
            connection = factory('images.example', 10)
            connection.connect()
            # Socket activity stays below its idle timeout, but status/header
            # completion never arrives. Only the absolute watchdog interrupts.
            def drip():
                try:
                    while True:
                        peers[0].sendall(b'H')
                        time.sleep(0.005)
                except OSError:
                    pass
            thread = threading.Thread(target=drip, daemon=True)
            thread.start()
            try:
                while connection.sock.recv(1):
                    pass
                raise OSError('deadline shutdown')
            finally:
                connection.close()
    request = Request('http://images.example/a')
    request._media_deadline = time.monotonic() + 0.08
    started = time.monotonic()
    response = media.serve(lambda: media.open_pinned(Handler(), request, media.http.client.HTTPConnection))
    assert response.status_code == 502
    assert time.monotonic() - started < 0.5
    assert media.media_gate.active == 0
    for peer in peers:
        peer.close()


def test_hung_dns_admission_is_bounded_and_times_out(monkeypatch):
    import threading
    import time
    from concurrent.futures import ThreadPoolExecutor
    gate = threading.Event()
    pool = ThreadPoolExecutor(max_workers=4)
    monkeypatch.setattr(media, '_dns_pool', pool)
    monkeypatch.setattr(media, '_dns_slots', threading.BoundedSemaphore(4))
    monkeypatch.setattr(media, 'public_addresses', lambda host: gate.wait() or ())
    try:
        for _ in range(4):
            with pytest.raises(media.MediaError) as exc:
                media.resolve_bounded('stuck.example', time.monotonic() + 0.005)
            assert exc.value.status == 502
        with pytest.raises(media.MediaError) as exc:
            media.resolve_bounded('extra.example', time.monotonic() + 1)
        assert exc.value.status == 503
        assert len(pool._threads) == 4
        assert pool._work_queue.qsize() == 0
    finally:
        gate.set()
        pool.shutdown(wait=True)


def test_svg_passthrough_is_sandboxed_and_not_resized(client, storage):
    source = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'
    (storage / 'cover.svg').write_bytes(source)
    response = client.get('/api/public-media/' + token('/media/cover.svg') + '.webp?w=48')
    assert response.status_code == 200
    assert response.content == source
    assert response.headers['content-type'] == 'image/svg+xml'
    assert response.headers['cache-control'] == media.LOCAL_CACHE
    assert response.headers['x-content-type-options'] == 'nosniff'
    assert response.headers['content-security-policy'] == "default-src 'none'; style-src 'unsafe-inline'; sandbox"
    # No allow-scripts or default script source is granted, even when opened
    # directly as a same-origin document. Missing sources stay uncached.
    missing = client.get('/api/public-media/' + token('/media/missing.svg'))
    assert missing.status_code == 404
    assert missing.headers['cache-control'] == 'no-store'
    assert 'sandbox' in missing.headers['content-security-policy']


def test_chunk_size_drip_has_absolute_deadline_and_releases_slot():
    import socket
    import threading
    import time
    import http.client
    left, right = socket.socketpair()
    left.settimeout(0.15)
    right.sendall(b'HTTP/1.1 200 OK\r\nContent-Type: image/png\r\nTransfer-Encoding: chunked\r\n\r\n')
    response = http.client.HTTPResponse(left)
    response.begin()
    def drip():
        try:
            # An unfinished chunk-size line keeps fp.readline inside read1,
            # with each byte arriving before its socket idle timeout.
            while True:
                right.sendall(b'1')
                time.sleep(0.005)
        except OSError:
            pass
    thread = threading.Thread(target=drip, daemon=True)
    thread.start()
    started = time.monotonic()
    try:
        result = media.serve(lambda: media.read_bounded(response, 1024, deadline=started + 0.08))
        assert result.status_code == 502
        assert time.monotonic() - started < 0.5
        assert media.media_gate.active == 0
    finally:
        response.close()
        left.close()
        right.close()
        thread.join(timeout=0.1)
