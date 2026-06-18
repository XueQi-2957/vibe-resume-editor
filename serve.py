"""VibeResume unified server: serves files, saves index.html, exports PDF.
Usage: python serve.py [port]
Default port: 4173
"""
import sys, json, os, re, subprocess, uuid, socket
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
REPO = os.path.dirname(os.path.abspath(__file__))
EXPORT_DIR = os.path.join(REPO, 'export')
VERSION = '2026-06-18-export-temp-input'
os.makedirs(EXPORT_DIR, exist_ok=True)
os.chdir(REPO)

class H(SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path in ('/health', '/version'):
            self._json(200, {'ok': True, 'version': VERSION})
            return
        if path == '/editor.html' or path == '/':
            return super().do_GET()
        return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)
        try:
            data = json.loads(body)
            html = data.get('html', '')
        except Exception as e:
            self._json(400, {'ok': False, 'error': 'Invalid JSON: ' + str(e)})
            return

        if path == '/save':
            self._save(html)
        elif path == '/export-pdf':
            self._export(html)
        else:
            self._json(404, {'ok': False, 'error': 'Not found'})

    def _save(self, html):
        try:
            with open(os.path.join(REPO, 'index.html'), 'w', encoding='utf-8') as f:
                f.write(html)
            self._json(200, {'ok': True})
        except Exception as e:
            self._json(500, {'ok': False, 'error': str(e)})

    def _export(self, html):
        temp_html = os.path.join(EXPORT_DIR, f'export-input-{uuid.uuid4().hex[:8]}.html')
        try:
            with open(temp_html, 'w', encoding='utf-8') as f:
                f.write(inject_export_base(strip_base_tag(html)))
        except Exception as e:
            self._json(500, {'ok': False, 'error': 'Write failed: ' + str(e)})
            return

        pdf_name = f'resume-{uuid.uuid4().hex[:8]}.pdf'
        pdf_path = os.path.join(EXPORT_DIR, pdf_name)
        cmd = ['node', 'scripts/export-pdf.mjs', '--input', temp_html, pdf_path]
        try:
            result = subprocess.run(
                cmd,
                cwd=REPO, capture_output=True, text=True, timeout=35
            )
            if result.returncode != 0:
                self._json(500, {
                    'ok': False,
                    'error': result.stderr.strip() or 'Export failed',
                    'cmd': cmd,
                    'stdout': result.stdout.strip()
                })
                return
        except subprocess.TimeoutExpired:
            self._json(500, {'ok': False, 'error': 'Export timed out'})
            return
        except FileNotFoundError:
            self._json(500, {'ok': False, 'error': 'Node.js not found. Run: npm install'})
            return

        try:
            with open(pdf_path, 'rb') as f:
                pdf_data = f.read()
            os.remove(pdf_path)
        except Exception as e:
            self._json(500, {'ok': False, 'error': 'Read PDF failed: ' + str(e)})
            return
        finally:
            try:
                if os.path.exists(temp_html):
                    os.remove(temp_html)
            except Exception:
                pass

        self.send_response(200)
        self.send_header('Content-Type', 'application/pdf')
        self.send_header('Content-Disposition', f'attachment; filename="{pdf_name}"')
        self._cors_headers()
        self.send_header('Content-Length', str(len(pdf_data)))
        self.end_headers()
        self.wfile.write(pdf_data)

    def _json(self, status, data):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self._cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, *a): pass

def strip_base_tag(html):
    return re.sub(r'<base\b[^>]*>', '', html, flags=re.IGNORECASE)

def inject_export_base(html):
    base_href = path_to_file_url(REPO) + '/'
    head_match = re.search(r'<head\b[^>]*>', html, flags=re.IGNORECASE)
    if not head_match:
        return f'<head><base href="{base_href}"></head>' + html
    insert_at = head_match.end()
    return html[:insert_at] + f'<base href="{base_href}">' + html[insert_at:]

def path_to_file_url(path_value):
    normalized = os.path.abspath(path_value).replace('\\', '/')
    return 'file:///' + normalized.lstrip('/')

class QuietHTTPServer(ThreadingHTTPServer):
    def handle_error(self, request, client_address):
        exc = sys.exc_info()[1]
        if isinstance(exc, (ConnectionResetError, ConnectionAbortedError, BrokenPipeError, socket.timeout)):
            return
        super().handle_error(request, client_address)

print(f'VibeResume server {VERSION}: http://localhost:{PORT}/editor.html', flush=True)
QuietHTTPServer(('0.0.0.0', PORT), H).serve_forever()
