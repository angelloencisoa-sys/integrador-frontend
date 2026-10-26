#!/usr/bin/env python3
"""
Servidor HTTP local en Python 3 estándar (sin dependencias externas).
- Sirve los archivos estáticos de FRONTEND_VANILLA en http://127.0.0.1:4200
  (origen permitido por ApiSecurityConfig.java en Spring Boot).
- Redirige las solicitudes `/api/**` hacia el backend Spring Boot
  (por defecto `http://127.0.0.1:8080`, configurable con `API_TARGET`).
- Soporta rutas SPA devolviendo `index.html`.
"""
import os
import posixpath
import urllib.request
import urllib.error
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, unquote

HOST = os.environ.get('HOST', '127.0.0.1')
PORT = int(os.environ.get('PORT', '4200'))
API_TARGET = os.environ.get('API_TARGET', 'http://127.0.0.1:8080').rstrip('/')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))


class SpaAndProxyHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.mjs': 'text/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.webp': 'image/webp',
        '.woff2': 'font/woff2',
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def _is_api(self):
        return self.path.startswith('/api/') or self.path == '/api'

    def _proxy_api(self):
        target_url = f"{API_TARGET}{self.path}"
        content_len = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_len) if content_len > 0 else None

        req_headers = {}
        for k, v in self.headers.items():
            if k.lower() not in ('host', 'connection', 'transfer-encoding'):
                req_headers[k] = v

        req = urllib.request.Request(
            target_url,
            data=body,
            headers=req_headers,
            method=self.command
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                resp_body = resp.read()
                self.send_response(resp.status)
                for k, v in resp.getheaders():
                    if k.lower() not in ('transfer-encoding', 'connection', 'content-encoding', 'content-length'):
                        self.send_header(k, v)
                self.send_header('Content-Length', str(len(resp_body)))
                self.end_headers()
                if self.command != 'HEAD':
                    self.wfile.write(resp_body)
        except urllib.error.HTTPError as e:
            err_body = e.read()
            self.send_response(e.code)
            for k, v in e.headers.items():
                if k.lower() not in ('transfer-encoding', 'connection', 'content-encoding', 'content-length'):
                    self.send_header(k, v)
            self.send_header('Content-Length', str(len(err_body)))
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(err_body)
        except Exception:
            msg = b'{"status":502,"mensaje":"No pudimos conectar con la tienda."}'
            self.send_response(502)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(msg)))
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(msg)

    def do_GET(self):
        if self._is_api():
            self._proxy_api()
            return
        parsed = urlparse(self.path)
        raw_resource = unquote(parsed.path).replace('\\', '/')
        resource = posixpath.normpath(raw_resource)
        if (any(part.startswith('.') for part in resource.split('/')) or
            not (resource in ('/', '/index.html', '/favicon.ico', '/favicon.svg') or
                 resource.startswith(('/assets/', '/css/', '/js/')) or
                 not posixpath.splitext(resource)[1])):
            self.send_error(404)
            return
        clean_path = posixpath.normpath(parsed.path).lstrip('/')
        full_path = os.path.join(BASE_DIR, clean_path)
        if not os.path.isfile(full_path):
            _, ext = os.path.splitext(clean_path)
            if not ext or ext == '.html':
                self.path = '/index.html'
        if self.command == 'HEAD':
            stream = self.send_head()
            if stream:
                stream.close()
        else:
            super().do_GET()

    def do_HEAD(self):
        if self._is_api():
            self._proxy_api()
        else:
            # Misma validación de rutas que GET; el manejador estándar omite el cuerpo.
            self.do_GET()

    def do_POST(self):
        if self._is_api():
            self._proxy_api()
        else:
            self.send_error(405)

    def do_PUT(self):
        if self._is_api():
            self._proxy_api()
        else:
            self.send_error(405)

    def do_PATCH(self):
        if self._is_api():
            self._proxy_api()
        else:
            self.send_error(405)

    def do_DELETE(self):
        if self._is_api():
            self._proxy_api()
        else:
            self.send_error(405)

    def do_OPTIONS(self):
        if self._is_api():
            self._proxy_api()
        else:
            self.send_response(204)
            self.end_headers()


if __name__ == '__main__':
    with ThreadingHTTPServer((HOST, PORT), SpaAndProxyHandler) as httpd:
        print(f"La Bodega (Vanilla JS) disponible en http://{HOST}:{PORT}")
        print(f"Proxy /api redirigiendo hacia {API_TARGET}")
        httpd.serve_forever()
