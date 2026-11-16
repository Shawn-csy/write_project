"""Bounded public image serving; all I/O and decoding runs in sync route workers."""
import base64
from collections import OrderedDict
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeout
from contextlib import contextmanager
import io
import ipaddress
import http.client
import socket
import math
import mimetypes
import os
from pathlib import Path
import re
import stat as stat_module
import threading
import time
from urllib.error import HTTPError
from urllib.parse import unquote, urlsplit, urljoin
from urllib.request import Request, ProxyHandler, HTTPRedirectHandler, build_opener

from fastapi import Response
from PIL import Image, ImageOps
from services import external_public_script_metadata as metadata

MAX_PROXIED_BYTES = 25 * 1024 * 1024
MAX_RESIZE_SOURCE_BYTES = 12 * 1024 * 1024
MAX_RESIZE_INPUT_PIXELS = 50_000_000
LOCAL_CACHE = 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400'
REMOTE_CACHE = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400'
DEGRADED_CACHE = 'public, max-age=60, s-maxage=60'
SAFETY = {'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox"}
SAFE_TYPES = {'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'image/svg+xml'}
RESIZABLE = {'image/jpeg', 'image/png', 'image/webp'}

class MediaError(Exception):
    def __init__(self, status, message):
        self.status, self.message = status, message

class CapacityGate:
    def __init__(self, limit, queue_limit, timeout=5):
        self.limit, self.queue_limit, self.timeout = limit, queue_limit, timeout
        self.active = self.waiting = 0
        self.condition = threading.Condition()

    @contextmanager
    def slot(self):
        with self.condition:
            if self.active >= self.limit:
                if self.waiting >= self.queue_limit:
                    raise MediaError(503, 'Media busy')
                self.waiting += 1
                try:
                    if not self.condition.wait_for(lambda: self.active < self.limit, self.timeout):
                        raise MediaError(503, 'Media busy')
                finally:
                    self.waiting -= 1
            self.active += 1
        try:
            yield
        finally:
            with self.condition:
                self.active -= 1
                self.condition.notify()

media_gate = CapacityGate(12, 96)
resize_gate = CapacityGate(3, 12)
_cache = OrderedDict()
_cache_bytes = 0
_cache_lock = threading.Lock()
MAX_CACHE_BYTES = 32 * 1024 * 1024
MAX_CACHE_ENTRY_BYTES = 512 * 1024

def parse_width(raw):
    try:
        value = float(raw)
    except (ValueError, TypeError):
        return None
    if not math.isfinite(value) or value <= 0:
        return None
    return next((w for w in (48, 96, 240, 360, 480, 720, 960) if w >= value), 960)

def strip_extension(value):
    return value[:-5] if value.endswith('.webp') else value

def decode_token(token):
    if len(token) > 4096:
        raise MediaError(400, 'Invalid media token')
    value = strip_extension(token)
    try:
        if not value or not re.fullmatch(r'[A-Za-z0-9_+/=-]+', value):
            raise ValueError()
        return base64.b64decode(value.replace('-', '+').replace('_', '/') + '=' * (-len(value) % 4), validate=True).decode('utf-8')
    except (ValueError, UnicodeError):
        raise MediaError(400, 'Invalid media token')

def local_path(raw):
    if not raw.startswith('/media/') or '..' in raw or re.search(r'[\\\x00-\x1f]', raw):
        raise MediaError(400, 'Invalid media URL')
    parsed = urlsplit(raw)
    try:
        decoded = unquote(parsed.path, errors='strict')
    except UnicodeError:
        raise MediaError(400, 'Invalid media URL')
    if re.search(r'%(?![a-fA-F0-9]{2})', parsed.path) or re.search(r'[\\\x00-\x1f]', decoded) or '//' in decoded or '..' in decoded.split('/'):
        raise MediaError(400, 'Invalid media URL')
    # Resolve symlinks, then open with O_NOFOLLOW and compare the descriptor to
    # the validated identity, so swapping a final symlink cannot escape root.
    from routers.media import _media_storage_root
    root = Path(_media_storage_root()).resolve()
    path = (root / decoded[len('/media/'):]).resolve()
    if not path.is_relative_to(root):
        raise MediaError(400, 'Invalid media URL')
    return path, bool(parsed.query)

def response_socket(stream):
    current = stream
    for _ in range(4):
        sock = getattr(getattr(current, 'raw', None), '_sock', None)
        if sock is not None:
            return sock
        current = getattr(current, 'fp', None)
        if current is None:
            break
    return None

def read_bounded(stream, limit, declared=None, deadline=None):
    sock = response_socket(stream) if deadline is not None else None
    watchdog = None
    if sock is not None:
        def abort():
            try:
                sock.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
            try:
                sock.close()
            except OSError:
                pass
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise MediaError(502, 'Media unavailable')
        # Chunked HTTPResponse.read1 may block inside chunk-size readline.
        # A socket watchdog enforces total time even within that framing read.
        watchdog = threading.Timer(remaining, abort)
        watchdog.daemon = True
        watchdog.start()
    try:
        return _read_bounded(stream, limit, declared, deadline)
    finally:
        if watchdog is not None:
            watchdog.cancel()

def _read_bounded(stream, limit, declared=None, deadline=None):
    try:
        if declared and int(declared) > limit:
            raise MediaError(413, 'Media too large')
    except ValueError:
        pass
    output = bytearray()
    while True:
        if deadline is not None and time.monotonic() >= deadline:
            raise MediaError(502, 'Media unavailable')
        if deadline is not None:
            # Shorten the socket's idle timeout as time is consumed. The outer
            # watchdog also covers chunk framing, which may perform repeated
            # receives inside a single HTTPResponse.read1 call.
            remaining = deadline - time.monotonic()
            sock = response_socket(stream)
            if sock is not None:
                sock.settimeout(max(0.001, remaining))
        read = getattr(stream, 'read1', stream.read)
        chunk = read(min(65536, limit + 1 - len(output)))
        if deadline is not None and time.monotonic() >= deadline:
            raise MediaError(502, 'Media unavailable')
        if not chunk:
            return bytes(output)
        output.extend(chunk)
        if len(output) > limit:
            raise MediaError(413, 'Media too large')

def public_addresses(host):
    addresses = metadata._public_addresses(host)
    for address in addresses:
        ip = ipaddress.ip_address(address)
        check = ip.ipv4_mapped if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped else ip
        if check.is_multicast or (isinstance(check, ipaddress.IPv4Address) and check in ipaddress.ip_network('192.88.99.0/24')):
            raise metadata.ExternalMetadataError('Unsafe image host')
        if isinstance(ip, ipaddress.IPv6Address) and ip not in ipaddress.ip_network('2000::/3') and not ip.ipv4_mapped:
            if ip not in ipaddress.ip_network('64:ff9b::/96'):
                raise metadata.ExternalMetadataError('Unsafe image host')
    return addresses

# A stuck system resolver retains one worker, never an unbounded number of
# waiting jobs. Admission remains held until that resolver actually finishes.
_dns_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix='public-media-dns')
_dns_slots = threading.BoundedSemaphore(4)

def resolve_bounded(host, deadline):
    slots = _dns_slots
    if not slots.acquire(blocking=False):
        raise MediaError(503, 'Media busy')
    try:
        future = _dns_pool.submit(public_addresses, host)
    except Exception:
        slots.release()
        raise
    future.add_done_callback(lambda _: slots.release())
    try:
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise MediaError(502, 'Media unavailable')
        return future.result(timeout=remaining)
    except FutureTimeout:
        raise MediaError(502, 'Media unavailable')

def open_pinned(handler, request, connection_type):
    parsed = urlsplit(metadata.normalize_external_url(request.full_url))
    deadline = getattr(request, '_media_deadline', None) or (time.monotonic() + getattr(request, 'timeout', 10))
    addresses = resolve_bounded(parsed.hostname, deadline)
    connections = []
    def factory(host, timeout, **kwargs):
        connection = connection_type(host, timeout=max(0.001, deadline - time.monotonic()), **kwargs)
        connections.append(connection)
        def connect(destination, timeout, source_address=None):
            last_error = None
            for address in addresses:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    break
                try:
                    return socket.create_connection((address, destination[1]), remaining, source_address)
                except OSError as exc:
                    last_error = exc
            raise last_error or OSError('No vetted image address reachable')
        connection._create_connection = connect
        return connection
    def abort():
        # shutdown interrupts reads even when HTTPResponse retains a buffered
        # file reference; close alone does not reliably wake that reader.
        for connection in connections:
            sock = getattr(connection, 'sock', None)
            if sock is not None:
                try:
                    sock.shutdown(socket.SHUT_RDWR)
                except OSError:
                    pass
                try:
                    sock.close()
                except OSError:
                    pass
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        raise MediaError(502, 'Media unavailable')
    watchdog = threading.Timer(remaining, abort)
    watchdog.daemon = True
    watchdog.start()
    try:
        result = handler.do_open(factory, request)
        if time.monotonic() >= deadline:
            result.close()
            raise MediaError(502, 'Media unavailable')
        return result
    finally:
        watchdog.cancel()

class PinnedHTTP(metadata._PinnedHTTPHandler):
    def http_open(self, request):
        return open_pinned(self, request, http.client.HTTPConnection)

class PinnedHTTPS(metadata._PinnedHTTPSHandler):
    def https_open(self, request):
        return open_pinned(self, request, http.client.HTTPSConnection)

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def remote_bytes(raw, width):
    opener = build_opener(ProxyHandler({}), NoRedirect(), PinnedHTTP(), PinnedHTTPS())
    current = raw
    deadline = time.monotonic() + 10
    for hop in range(4):
        try:
            current = metadata.normalize_external_url(current)
        except metadata.ExternalMetadataError:
            raise MediaError(400, 'Invalid media URL')
        try:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise MediaError(502, 'Media unavailable')
            request = Request(current, headers={
                'Accept': 'image/*',
                'User-Agent': 'OpenScriptsMedia/1.0 (+https://open-scripts.shawnup.com)',
            })
            request._media_deadline = deadline
            response = opener.open(request, timeout=remaining)
        except HTTPError as exc:
            response = exc
        except metadata.ExternalMetadataError:
            raise MediaError(400, 'Invalid media URL')
        with response:
            status = response.status
            if 300 <= status < 400 and response.headers.get('location'):
                current = urljoin(current, response.headers['location'])
                continue
            if not 200 <= status < 300:
                raise MediaError(status, 'Media not found')
            kind = response.headers.get('content-type', '').split(';')[0].strip().lower()
            if kind not in SAFE_TYPES:
                raise MediaError(415, 'Media is not an image')
            limit = MAX_RESIZE_SOURCE_BYTES if width and kind in RESIZABLE else MAX_PROXIED_BYTES
            return read_bounded(response, limit, response.headers.get('content-length'), deadline), kind
    raise MediaError(400, 'Invalid media URL')

def image_response(data, kind, width, control):
    if kind not in SAFE_TYPES:
        raise MediaError(415, 'Media is not an image')
    if len(data) > MAX_PROXIED_BYTES or (width and kind in RESIZABLE and len(data) > MAX_RESIZE_SOURCE_BYTES):
        raise MediaError(413, 'Media too large')
    if width and kind in RESIZABLE:
        with resize_gate.slot():
            try:
                with Image.open(io.BytesIO(data)) as image:
                    if image.width * image.height > MAX_RESIZE_INPUT_PIXELS:
                        raise ValueError('Pixel ceiling')
                    if getattr(image, 'n_frames', 1) == 1 and image.width > width:
                        image = ImageOps.exif_transpose(image)
                        image.thumbnail((width, max(1, round(image.height * width / image.width))), Image.Resampling.LANCZOS)
                        out = io.BytesIO()
                        image.save(out, format='WEBP', quality=78)
                        if out.tell() < len(data):
                            data, kind = out.getvalue(), 'image/webp'
            except Exception:
                control = DEGRADED_CACHE
    return Response(data, media_type=kind, headers={**SAFETY, 'cache-control': control})

def serve_local(raw, width):
    global _cache_bytes
    path, has_query = local_path(raw)
    try:
        expected = path.stat()
        fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
        with os.fdopen(fd, 'rb') as source:
            stat = os.fstat(source.fileno())
            if not stat_module.S_ISREG(stat.st_mode):
                raise MediaError(404, 'Media not found')
            # Linux /proc verifies parent-directory swaps as well. On other
            # platforms re-resolve and compare identity before reading.
            actual = Path(f'/proc/self/fd/{source.fileno()}')
            checked = actual.resolve() if actual.exists() else path.resolve()
            root = Path(__import__('routers.media', fromlist=['_media_storage_root'])._media_storage_root()).resolve()
            if not checked.is_relative_to(root) or (expected.st_dev, expected.st_ino) != (stat.st_dev, stat.st_ino):
                raise MediaError(400, 'Invalid media URL')
            key = (str(path), stat.st_dev, stat.st_ino, stat.st_size, stat.st_mtime_ns, stat.st_ctime_ns, width)
            if width and not has_query:
                with _cache_lock:
                    hit = _cache.get(key)
                    if hit:
                        _cache.move_to_end(key)
                        return Response(hit[0], media_type=hit[1], headers={**SAFETY, 'cache-control': LOCAL_CACHE})
            kind = mimetypes.guess_type(str(path))[0] or ''
            limit = MAX_RESIZE_SOURCE_BYTES if width and kind in RESIZABLE else MAX_PROXIED_BYTES
            data = read_bounded(source, limit, stat.st_size)
        result = image_response(data, kind, width, LOCAL_CACHE)
        if width and not has_query and result.headers['cache-control'] == LOCAL_CACHE and len(result.body) <= MAX_CACHE_ENTRY_BYTES:
            with _cache_lock:
                old = _cache.pop(key, None)
                if old:
                    _cache_bytes -= len(old[0])
                _cache[key] = (result.body, result.media_type)
                _cache_bytes += len(result.body)
                while _cache_bytes > MAX_CACHE_BYTES:
                    _, entry = _cache.popitem(last=False)
                    _cache_bytes -= len(entry[0])
        return result
    except (FileNotFoundError, IsADirectoryError):
        raise MediaError(404, 'Media not found')

def serve(work):
    try:
        with media_gate.slot():
            return work()
    except MediaError as exc:
        return Response(exc.message, status_code=exc.status, headers={**SAFETY, 'cache-control': 'no-store'})
    except Exception:
        return Response('Media unavailable', status_code=502, headers={**SAFETY, 'cache-control': 'no-store'})
