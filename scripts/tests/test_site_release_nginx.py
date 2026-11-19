#!/usr/bin/env python3
"""Opt-in isolated Docker contract test: RUN_NGINX_INTEGRATION=1 python3 -m unittest discover -s scripts/tests -p test_site_release_nginx.py."""
import os
import socket
from collections import Counter
from urllib.parse import urlsplit
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest
from urllib.error import HTTPError
from urllib.request import HTTPRedirectHandler, Request, build_opener, ProxyHandler


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


@unittest.skipUnless(os.environ.get('RUN_NGINX_INTEGRATION') == '1', 'requires isolated Docker integration opt-in')
class NginxRuntimeTests(unittest.TestCase):
    def test_api_studio_redirects_and_media_boundaries(self):
        identity = f'wp-runtime-contract-{os.getpid()}'
        backend, edge = identity + '-api', identity + '-edge'
        def docker(*args):
            return subprocess.check_output(['docker', *args], text=True).strip()
        http = build_opener(ProxyHandler({}), NoRedirect)
        def response(path, host='studio-open-scripts.shawnup.com', client_ip='198.51.100.1'):
            try:
                result = http.open(Request(base + path, headers={'Host': host, 'CF-Connecting-IP': client_ip}), timeout=5)
            except HTTPError as error:
                result = error
            with result:
                return result.status, result.headers, result.read()
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            static = root / 'static'; static.mkdir()
            (static / 'index.html').write_text('STUDIO SHELL')
            (static / 'random_text.json').write_text('{}')
            (static / 'assets').mkdir()
            (static / 'assets' / 'studio.js').write_text('STUDIO ASSET')
            config = root / 'default.conf'
            config.write_text((Path(__file__).resolve().parents[2] / 'deploy/nginx/default.conf').read_text())
            stub = root / 'stub.conf'
            stub.write_text('server { listen 1091; location / { return 200 "BACKEND"; } }')
            docker('network', 'create', identity)
            try:
                docker('run', '-d', '--name', backend, '--network', identity, '--network-alias', 'write_project-backend',
                       '-v', f'{stub}:/etc/nginx/conf.d/default.conf:ro', 'nginx:alpine')
                docker('run', '-d', '--name', edge, '--network', identity, '-p', '127.0.0.1::80',
                       '-v', f'{config}:/etc/nginx/conf.d/default.conf:ro', '-v', f'{static}:/usr/share/nginx/html:ro', 'nginx:alpine')
                docker('exec', edge, 'nginx', '-t')
                base = 'http://' + docker('port', edge, '80/tcp').splitlines()[0]
                for attempt in range(30):
                    try:
                        if response('/healthz')[0] == 200:
                            break
                    except OSError:
                        time.sleep(.1)
                for path in ('/', '/login', '/studio/demos', '/edit/script-id'):
                    status, _, body = response(path)
                    self.assertEqual((status, body), (200, b'STUDIO SHELL'), path)
                self.assertEqual(response('/assets/studio.js')[2], b'STUDIO ASSET')
                for path in ('/authors?q=test', '/read/script.webp?source=test', '/resources/item?q=1', '/_next/app.js'):
                    status, headers, _ = response(path)
                    self.assertEqual(status, 308, path)
                    self.assertEqual(headers['Location'], 'https://open-scripts.shawnup.com' + path)
                for host in ('studio-open-scripts.shawnup.com', 'api-open-scripts.shawnup.com'):
                    for path in ('/api/public-bundle', '/api/public-media/scripts/id/cover.webp', '/media/hash.png', '/media/hash.webp'):
                        status, headers, body = response(path, host)
                        self.assertEqual((status, body), (200, b'BACKEND'), (host, path))
                        if path == '/media/hash.webp':
                            self.assertEqual(headers['Content-Type'], 'image/webp')
                for path in ('/', '/login', '/authors', '/assets/studio.js'):
                    self.assertEqual(response(path, 'api-open-scripts.shawnup.com')[0], 404, path)
                self.assertEqual(response('/unknown')[0], 404)
                api_host = 'api-open-scripts.shawnup.com'
                for path in ('/api/public-media', '/api/public-media/scripts/id/cover.webp'):
                    statuses = Counter(response(path + f'?probe={index}', api_host, '198.51.100.77')[0] for index in range(80))
                    self.assertGreater(statuses[429], 0, (path, statuses))
                    self.assertTrue(set(statuses) <= {200, 429}, statuses)
                self.assertEqual(response('/api/public-media', api_host, '198.51.100.78')[0], 200)
                for path in ('/api/public-bundle', '/api/public-personas', '/healthz'):
                    self.assertEqual(response(path, api_host, '198.51.100.77')[0], 200, path)
                held = []
                try:
                    for _ in range(12):
                        connection = socket.create_connection(('127.0.0.1', urlsplit(base).port), timeout=5)
                        held.append(connection)
                        connection.sendall((f'GET /api/public-media/scripts/id/cover.webp HTTP/1.1\r\n'
                            f'Host: {api_host}\r\nCF-Connecting-IP: 203.0.113.77\r\n'
                            'Content-Length: 1048576\r\nConnection: close\r\n\r\n').encode())
                    time.sleep(.2)
                    self.assertEqual(response('/api/public-media', api_host, '203.0.113.77')[0], 429)
                    self.assertEqual(response('/api/public-bundle', api_host, '203.0.113.77')[0], 200)
                finally:
                    for connection in held:
                        connection.close()

                for checker in ('check-ingress-read-limits.py', 'check-ingress-write-limits.py'):
                    subprocess.run([sys.executable, str(Path(__file__).resolve().parents[1] / "checks" / checker), '--base-url', base], check=True)
            finally:
                subprocess.run(['docker', 'rm', '-f', edge, backend], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                docker('network', 'rm', identity)
