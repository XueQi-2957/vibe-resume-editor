"""VibeResume server: serves files, saves resumes, exports PDF, manages file locks."""
import sys, json, os, re, subprocess, uuid, socket, glob, threading
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
REPO = os.path.dirname(os.path.abspath(__file__))
RESUMES_DIR = os.path.join(REPO, 'resumes')
EXPORT_DIR = os.path.join(REPO, 'export')
os.makedirs(RESUMES_DIR, exist_ok=True)
os.makedirs(EXPORT_DIR, exist_ok=True)
os.chdir(REPO)

# File locks: {filename: client_id}
file_locks = {}
lock = threading.Lock()

BLANK_RESUME = """<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>新简历</title><link rel="stylesheet" href="../styles.css"></head><body>
<main class="page">
<header class="resume-header"><div class="photo-frame"><img class="profile-photo" src="../assets/avatar-placeholder.svg" alt="证件照"/></div>
<div class="profile-main"><p class="eyebrow">岗位方向</p>
<div class="name-row"><h1>姓名</h1><p class="identity-line">身份 · 届别</p></div>
<div class="contact-line"><a href="tel:"><svg class="icon"><use href="#icon-phone"></use></svg>电话</a><a href="mailto:"><svg class="icon"><use href="#icon-mail"></use></svg>邮箱</a><a href="https://github.com/"><svg class="icon"><use href="#icon-github"></use></svg>github</a></div></div></header>
<section class="section"><h2><svg class="section-icon"><use href="#icon-school"></use></svg>教育背景</h2>
<div class="education-grid"><div>学校</div><div>专业</div><div>时间</div></div></section>
<section class="section skills-section"><h2><svg class="section-icon"><use href="#icon-tool"></use></svg>专业技能</h2>
<ul class="skills-list"><li>技能描述</li></ul></section></main></body></html>"""

DEFAULT_TEMPLATE_PATHS = [
    os.path.join(REPO, 'index.template.html'),
    os.path.join(REPO, 'index.html'),
]

def load_default_resume_template():
    for path in DEFAULT_TEMPLATE_PATHS:
        if not os.path.exists(path):
            continue
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception:
            continue
    return BLANK_RESUME

def safe_filename(name):
    """Sanitize filename, ensure .html extension."""
    name = name.strip()
    if not name:
        name = '未命名简历'
    if not name.endswith('.html'):
        name += '.html'
    # Remove path separators
    name = re.sub(r'[\\/:*?"<>|]', '_', name)
    return name

def parse_query(qs):
    return {k: v[0] if v else '' for k, v in parse_qs(qs).items()}

class H(SimpleHTTPRequestHandler):
    def end_headers(self):
        if self.path.endswith(('.html', '.css', '.js')) or self.path.startswith('/editor.html'):
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        qs = parse_query(urlparse(self.path).query)
        if path == '/list-resumes':
            self._list_resumes()
        elif path == '/load-resume':
            self._load_resume(qs.get('file', ''))
        else:
            return super().do_GET()

    def do_POST(self):
        path = urlparse(self.path).path
        qs = parse_query(urlparse(self.path).query)
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)
        try:
            data = json.loads(body) if body else {}
        except Exception:
            data = {}

        if path == '/save':
            self._save_legacy(data.get('html', ''))
        elif path == '/save-resume':
            self._save_resume(qs.get('file', ''), data.get('html', ''), data.get('client_id', ''))
        elif path == '/new-resume':
            self._new_resume(data.get('name', '新简历'))
        elif path == '/rename-resume':
            self._rename_resume(data.get('old_name', ''), data.get('new_name', ''), data.get('client_id', ''))
        elif path == '/delete-resume':
            self._delete_resume(qs.get('file', '') or data.get('file', ''), data.get('client_id', ''))
        elif path == '/export-pdf':
            self._export(data.get('html', ''))
        elif path == '/lock-resume':
            self._lock_resume(qs.get('file', ''), data.get('client_id', ''))
        elif path == '/unlock-resume':
            self._unlock_resume(qs.get('file', ''), data.get('client_id', ''))
        else:
            self._json(404, {'ok': False, 'error': 'Not found'})

    # ── Resume file management ──

    def _list_resumes(self):
        files = sorted(glob.glob(os.path.join(RESUMES_DIR, '*.html')))
        names = [os.path.basename(f) for f in files]
        self._json(200, {'ok': True, 'files': names})

    def _load_resume(self, filename):
        if not filename:
            self._json(400, {'ok': False, 'error': 'Missing file parameter'})
            return
        safe = safe_filename(filename)
        path = os.path.join(RESUMES_DIR, safe)
        if not os.path.exists(path):
            self._json(404, {'ok': False, 'error': 'File not found'})
            return
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            self._json(200, {'ok': True, 'html': content, 'file': safe})
        except Exception as e:
            self._json(500, {'ok': False, 'error': str(e)})

    def _save_resume(self, filename, html, client_id=''):
        if not filename:
            self._json(400, {'ok': False, 'error': 'Missing file parameter'})
            return
        safe = safe_filename(filename)
        path = os.path.join(RESUMES_DIR, safe)

        with lock:
            lock_holder = file_locks.get(safe)
            if lock_holder and lock_holder != client_id:
                self._json(409, {'ok': False, 'error': f'文件 "{safe}" 已被其他标签页打开，无法保存'})
                return

        try:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(html)
            with lock:
                file_locks[safe] = client_id  # renew lock on save
            self._json(200, {'ok': True, 'file': safe})
        except Exception as e:
            self._json(500, {'ok': False, 'error': str(e)})

    def _new_resume(self, name):
        safe = safe_filename(name)
        path = os.path.join(RESUMES_DIR, safe)
        if os.path.exists(path):
            # Append number to avoid overwrite
            base, ext = os.path.splitext(safe)
            counter = 1
            while os.path.exists(os.path.join(RESUMES_DIR, f'{base}_{counter}{ext}')):
                counter += 1
            safe = f'{base}_{counter}{ext}'
            path = os.path.join(RESUMES_DIR, safe)
        try:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(load_default_resume_template())
            self._json(200, {'ok': True, 'file': safe})
        except Exception as e:
            self._json(500, {'ok': False, 'error': str(e)})

    def _rename_resume(self, old_name, new_name, client_id=''):
        if not old_name or not new_name:
            self._json(400, {'ok': False, 'error': 'Missing old_name or new_name'})
            return

        old_safe = safe_filename(old_name)
        new_safe = safe_filename(new_name)
        old_path = os.path.join(RESUMES_DIR, old_safe)
        new_path = os.path.join(RESUMES_DIR, new_safe)

        if old_safe == new_safe:
            self._json(200, {'ok': True, 'file': new_safe})
            return
        if not os.path.exists(old_path):
            self._json(404, {'ok': False, 'error': 'File not found'})
            return
        if os.path.exists(new_path):
            self._json(409, {'ok': False, 'error': f'文件 "{new_safe}" 已存在'})
            return

        with lock:
            lock_holder = file_locks.get(old_safe)
            if lock_holder and lock_holder != client_id:
                self._json(409, {'ok': False, 'error': f'文件 "{old_safe}" 已被其他标签页打开，无法重命名'})
                return

        try:
            os.replace(old_path, new_path)
            with lock:
                if old_safe in file_locks:
                    del file_locks[old_safe]
                if client_id:
                    file_locks[new_safe] = client_id
            self._json(200, {'ok': True, 'file': new_safe})
        except Exception as e:
            self._json(500, {'ok': False, 'error': str(e)})

    def _delete_resume(self, filename, client_id=''):
        if not filename:
            self._json(400, {'ok': False, 'error': 'Missing file parameter'})
            return

        safe = safe_filename(filename)
        path = os.path.join(RESUMES_DIR, safe)
        if not os.path.exists(path):
            self._json(404, {'ok': False, 'error': 'File not found'})
            return

        with lock:
            lock_holder = file_locks.get(safe)
            if lock_holder and lock_holder != client_id:
                self._json(409, {'ok': False, 'error': f'文件 "{safe}" 已被其他标签页打开，无法删除'})
                return

        try:
            os.remove(path)
            with lock:
                if safe in file_locks:
                    del file_locks[safe]
            self._json(200, {'ok': True, 'file': safe})
        except Exception as e:
            self._json(500, {'ok': False, 'error': str(e)})

    def _lock_resume(self, filename, client_id):
        if not filename or not client_id:
            self._json(400, {'ok': False, 'error': 'Missing file or client_id'})
            return
        safe = safe_filename(filename)
        with lock:
            existing = file_locks.get(safe)
            if existing and existing != client_id:
                self._json(409, {'ok': False, 'error': f'文件 "{safe}" 已被其他窗口打开'})
                return
            file_locks[safe] = client_id
        self._json(200, {'ok': True, 'locked': True})

    def _unlock_resume(self, filename, client_id):
        if not filename or not client_id:
            self._json(400, {'ok': False, 'error': 'Missing file or client_id'})
            return
        safe = safe_filename(filename)
        with lock:
            if file_locks.get(safe) == client_id:
                del file_locks[safe]
        self._json(200, {'ok': True, 'locked': False})

    # ── Legacy save (index.html) ──

    def _save_legacy(self, html):
        try:
            with open(os.path.join(REPO, 'index.html'), 'w', encoding='utf-8') as f:
                f.write(html)
            self._json(200, {'ok': True})
        except Exception as e:
            self._json(500, {'ok': False, 'error': str(e)})

    # ── PDF export ──

    def _export(self, html):
        temp_html = os.path.join(EXPORT_DIR, f'export-input-{uuid.uuid4().hex[:8]}.html')
        try:
            with open(temp_html, 'w', encoding='utf-8') as f:
                f.write(html)
        except Exception as e:
            self._json(500, {'ok': False, 'error': 'Write failed: ' + str(e)})
            return

        pdf_name = f'resume-{uuid.uuid4().hex[:8]}.pdf'
        pdf_path = os.path.join(EXPORT_DIR, pdf_name)
        try:
            result = subprocess.run(
                ['node', 'scripts/export-pdf.mjs', '--input', temp_html, pdf_path],
                cwd=REPO, capture_output=True, text=True, timeout=35
            )
            if result.returncode != 0:
                self._json(500, {'ok': False, 'error': result.stderr.strip() or 'Export failed'})
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
        self._cors()
        self.send_header('Content-Length', str(len(pdf_data)))
        self.end_headers()
        self.wfile.write(pdf_data)

    def _json(self, status, data):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self._cors()
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def log_message(self, *a): pass

class QuietHTTPServer(ThreadingHTTPServer):
    def handle_error(self, request, client_address):
        exc = sys.exc_info()[1]
        if isinstance(exc, (ConnectionResetError, ConnectionAbortedError, BrokenPipeError, socket.timeout)):
            return
        super().handle_error(request, client_address)

print(f'VibeResume server: http://localhost:{PORT}/editor.html', flush=True)
QuietHTTPServer(('0.0.0.0', PORT), H).serve_forever()
