import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { setCookie, getCookie, deleteCookie } from 'hono/cookie';
import { nanoid } from 'nanoid';

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  CLOUDINARY_CLOUD_NAME: string;
  CLOUDINARY_UPLOAD_PRESET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

const wrongPassMsgs = [
  "🤡 Bhai sahi password daal! admin@9630 hai!",
  "😏 Oye! password likha hai!",
  "💀 Arey yaar! Itna bhi mushkil nahi hai password!"
];

const registerMsgs = [
  "😎 Arey bhai, registration band hai! Sirf admin hi login kar sakta hai!",
  "🚫 Oho! Naye user nahi ban sakte!"
];

const successMsgs = [
  "🎉 Wah bhai! Correct password! Andar aao!",
  "✅ Sahi jawab! Dashboard mein ja rahe ho!"
];

function escapeHtml(str: string): string {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    if (m === '"') return '&quot;';
    if (m === "'") return '&#39;';
    return m;
  });
}

app.get('/', async (c) => {
  return c.redirect('/login');
});

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────────
app.get('/login', async (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LinkForge — Login</title>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0a0a0f;
      --surface: #13131a;
      --border: #1e1e2e;
      --accent: #7c6af7;
      --accent2: #f76aab;
      --text: #e8e8f0;
      --muted: #6b6b80;
    }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'DM Sans', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .bg-mesh {
      position: fixed; inset: 0; pointer-events: none; z-index: 0;
      background: 
        radial-gradient(ellipse 60% 50% at 20% 20%, rgba(124,106,247,0.15) 0%, transparent 60%),
        radial-gradient(ellipse 50% 60% at 80% 80%, rgba(247,106,171,0.12) 0%, transparent 60%);
    }
    .grid-lines {
      position: fixed; inset: 0; pointer-events: none; z-index: 0;
      background-image: 
        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size: 40px 40px;
    }
    .card {
      position: relative; z-index: 1;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 48px 44px;
      width: 420px;
      backdrop-filter: blur(20px);
      box-shadow: 0 0 60px rgba(124,106,247,0.08), 0 30px 60px rgba(0,0,0,0.5);
    }
    .logo {
      display: flex; align-items: center; gap: 10px; margin-bottom: 36px;
    }
    .logo-icon {
      width: 40px; height: 40px; border-radius: 10px;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .logo-text {
      font-family: 'Syne', sans-serif;
      font-size: 22px; font-weight: 800;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }
    h1 { font-family: 'Syne', sans-serif; font-size: 28px; font-weight: 800; margin-bottom: 6px; }
    .subtitle { color: var(--muted); font-size: 14px; margin-bottom: 32px; }
    label { display: block; font-size: 12px; font-weight: 500; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
    .field { margin-bottom: 18px; }
    input {
      width: 100%; padding: 13px 16px;
      background: var(--bg); border: 1px solid var(--border);
      border-radius: 10px; color: var(--text);
      font-family: 'DM Sans', sans-serif; font-size: 15px;
      outline: none; transition: border-color 0.2s, box-shadow 0.2s;
    }
    input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(124,106,247,0.15); }
    .btn-primary {
      width: 100%; padding: 14px;
      background: linear-gradient(135deg, var(--accent), var(--accent2));
      border: none; border-radius: 10px; color: white;
      font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700;
      cursor: pointer; transition: opacity 0.2s, transform 0.1s;
      margin-top: 8px;
    }
    .btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
    .btn-primary:active { transform: translateY(0); }
    .divider { text-align: center; color: var(--muted); font-size: 13px; margin: 16px 0; }
    .btn-ghost {
      width: 100%; padding: 12px; background: transparent;
      border: 1px solid var(--border); border-radius: 10px; color: var(--muted);
      font-family: 'DM Sans', sans-serif; font-size: 13px;
      cursor: pointer; transition: border-color 0.2s, color 0.2s;
    }
    .btn-ghost:hover { border-color: var(--muted); color: var(--text); }
    .msg {
      padding: 12px 16px; border-radius: 10px; font-size: 14px;
      margin-top: 16px; display: none;
    }
    .msg.error { background: rgba(247,106,106,0.12); border: 1px solid rgba(247,106,106,0.3); color: #f76a6a; }
    .msg.success { background: rgba(106,247,171,0.12); border: 1px solid rgba(106,247,171,0.3); color: #6af7ab; }
  </style>
</head>
<body>
  <div class="bg-mesh"></div>
  <div class="grid-lines"></div>
  <div class="card">
    <div class="logo">
      <div class="logo-icon">🔗</div>
      <span class="logo-text">LinkForge</span>
    </div>
    <h1>Welcome back</h1>
    <p class="subtitle">Admin panel — sirf aap ke liye</p>
    <div class="field">
      <label>Username</label>
      <input type="text" id="username" placeholder="admin" autocomplete="username">
    </div>
    <div class="field">
      <label>Password</label>
      <input type="password" id="password" placeholder="••••••••" autocomplete="current-password">
    </div>
    <button class="btn-primary" onclick="doLogin()">Login Karo →</button>
    <div class="divider">— ya phir —</div>
    <button class="btn-ghost" onclick="fakeReg()">🔒 Register karna hai? (Try karo)</button>
    <div class="msg" id="msg"></div>
  </div>
  <script>
    function showMsg(text, type) {
      const el = document.getElementById('msg');
      el.textContent = text; el.className = 'msg ' + type; el.style.display = 'block';
      setTimeout(() => el.style.display = 'none', 3500);
    }
    async function doLogin() {
      const res = await fetch('/api/login', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ username: document.getElementById('username').value, password: document.getElementById('password').value })
      });
      const data = await res.json();
      if (res.ok) { showMsg(data.message, 'success'); setTimeout(() => location.href='/dashboard', 900); }
      else showMsg(data.message, 'error');
    }
    async function fakeReg() {
      const res = await fetch('/api/fake-register');
      const data = await res.json();
      showMsg(data.message, 'error');
    }
    document.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
  </script>
</body>
</html>`);
});

// ─── API ROUTES ───────────────────────────────────────────────────────────────
app.get('/api/fake-register', async (c) => {
  const msg = registerMsgs[Math.floor(Math.random() * registerMsgs.length)];
  return c.json({ message: msg });
});

app.post('/api/login', async (c) => {
  const { username, password } = await c.req.json();
  if (username === 'admin' && password === 'admin@9630') {
    const token = btoa(JSON.stringify({ id: 'admin', username: 'admin', exp: Date.now() + 86400000 }));
    setCookie(c, 'token', token, { httpOnly: true, maxAge: 86400, path: '/' });
    const msg = successMsgs[Math.floor(Math.random() * successMsgs.length)];
    return c.json({ success: true, message: msg });
  }
  const msg = wrongPassMsgs[Math.floor(Math.random() * wrongPassMsgs.length)];
  return c.json({ message: msg }, 401);
});

// ─── FETCH OG TAGS FROM URL ───────────────────────────────────────────────────
app.post('/api/fetch-og', async (c) => {
  const token = getCookie(c, 'token');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const { url } = await c.req.json();
    if (!url) return c.json({ error: 'No URL' }, 400);
    const res = await fetch(url, {
      headers: { 'User-Agent': 'facebookexternalhit/1.1' }
    });
    const html = await res.text();
    const getMeta = (prop: string) => {
      const match = html.match(new RegExp(`<meta[^>]*property=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i'))
        || html.match(new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*property=["']${prop}["']`, 'i'));
      return match ? match[1] : '';
    };
    const getMetaName = (name: string) => {
      const match = html.match(new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'));
      return match ? match[1] : '';
    };
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return c.json({
      title: getMeta('og:title') || (titleMatch ? titleMatch[1] : ''),
      description: getMeta('og:description') || getMetaName('description') || '',
      image: getMeta('og:image') || ''
    });
  } catch(e) {
    return c.json({ error: 'Failed to fetch' }, 500);
  }
});

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
app.get('/dashboard', async (c) => {
  const token = getCookie(c, 'token');
  if (!token) return c.redirect('/login');
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) throw new Error('Expired');
    let links: any[] = [], images: any[] = [];
    try {
      const linksResult = await c.env.DB.prepare('SELECT * FROM short_links ORDER BY created_at DESC LIMIT 50').all();
      links = linksResult.results || [];
      const imagesResult = await c.env.DB.prepare('SELECT * FROM images ORDER BY created_at DESC').all();
      images = imagesResult.results || [];
    } catch(e) {}

    const imagesJson = JSON.stringify(images);

    return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LinkForge — Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0a0a0f;
      --surface: #13131a;
      --surface2: #17171f;
      --border: #1e1e2e;
      --accent: #7c6af7;
      --accent2: #f76aab;
      --green: #6af7ab;
      --text: #e8e8f0;
      --muted: #6b6b80;
      --sidebar: 240px;
    }
    body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; min-height: 100vh; display: flex; }
    
    /* SIDEBAR */
    .sidebar {
      width: var(--sidebar); min-height: 100vh; background: var(--surface);
      border-right: 1px solid var(--border); padding: 28px 20px;
      display: flex; flex-direction: column; position: fixed; left: 0; top: 0; bottom: 0;
    }
    .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 40px; padding: 0 4px; }
    .logo-icon { width: 34px; height: 34px; border-radius: 8px; background: linear-gradient(135deg, var(--accent), var(--accent2)); display: flex; align-items: center; justify-content: center; font-size: 16px; }
    .logo-text { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 800; background: linear-gradient(135deg, var(--accent), var(--accent2)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .nav-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: var(--muted); padding: 0 8px; margin-bottom: 8px; }
    .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; color: var(--muted); font-size: 14px; cursor: pointer; transition: all 0.15s; margin-bottom: 2px; border: none; background: none; width: 100%; text-align: left; }
    .nav-item:hover { background: var(--border); color: var(--text); }
    .nav-item.active { background: rgba(124,106,247,0.15); color: var(--accent); }
    .nav-item .icon { font-size: 16px; width: 20px; text-align: center; }
    .sidebar-footer { margin-top: auto; }
    .stat-card { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 14px; margin-bottom: 10px; }
    .stat-num { font-family: 'Syne', sans-serif; font-size: 24px; font-weight: 800; }
    .stat-label { font-size: 11px; color: var(--muted); margin-top: 2px; }

    /* MAIN */
    .main { margin-left: var(--sidebar); flex: 1; padding: 36px 40px; max-width: 1000px; }
    .top-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; }
    .page-title { font-family: 'Syne', sans-serif; font-size: 26px; font-weight: 800; }
    .badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
    .badge-green { background: rgba(106,247,171,0.12); color: var(--green); border: 1px solid rgba(106,247,171,0.2); }
    .btn-logout { padding: 9px 18px; background: transparent; border: 1px solid var(--border); border-radius: 8px; color: var(--muted); font-size: 13px; cursor: pointer; transition: all 0.15s; }
    .btn-logout:hover { border-color: #f76a6a; color: #f76a6a; }

    /* CREATE FORM CARD */
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 28px; margin-bottom: 24px; }
    .card-title { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 8px; }

    /* PREVIEW SOURCE TOGGLE */
    .toggle-group { display: flex; gap: 0; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; padding: 4px; margin-bottom: 22px; }
    .toggle-btn {
      flex: 1; padding: 10px 14px; border: none; border-radius: 7px;
      background: transparent; color: var(--muted); font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
      cursor: pointer; transition: all 0.2s; text-align: center;
    }
    .toggle-btn.active { background: var(--surface); color: var(--text); box-shadow: 0 1px 4px rgba(0,0,0,0.3); }
    .toggle-btn .t-icon { margin-right: 6px; }

    /* PREVIEW PANEL */
    .preview-panel {
      background: var(--bg); border: 1px solid var(--border); border-radius: 12px;
      overflow: hidden; margin-bottom: 20px;
    }
    .preview-panel-header { padding: 12px 16px; border-bottom: 1px solid var(--border); font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 6px; }
    .preview-inner { padding: 16px; }
    .og-preview { display: flex; gap: 14px; align-items: flex-start; }
    .og-img { width: 80px; height: 80px; object-fit: cover; border-radius: 8px; background: var(--border); flex-shrink: 0; border: 1px solid var(--border); }
    .og-img-placeholder { width: 80px; height: 80px; border-radius: 8px; background: var(--border); display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; }
    .og-title { font-weight: 600; font-size: 14px; margin-bottom: 4px; line-height: 1.3; }
    .og-desc { font-size: 12px; color: var(--muted); line-height: 1.5; }
    .og-url { font-size: 11px; color: var(--accent); margin-top: 6px; }

    /* FORM FIELDS */
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-field { margin-bottom: 14px; }
    .form-field.full { grid-column: 1 / -1; }
    label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 7px; }
    input[type=text], input[type=url], textarea {
      width: 100%; padding: 11px 14px; background: var(--bg); border: 1px solid var(--border);
      border-radius: 9px; color: var(--text); font-family: 'DM Sans', sans-serif; font-size: 14px;
      outline: none; transition: border-color 0.2s, box-shadow 0.2s; resize: none;
    }
    input:focus, textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(124,106,247,0.12); }
    
    /* IMAGE SECTION */
    .img-upload-area {
      border: 2px dashed var(--border); border-radius: 10px; padding: 20px;
      text-align: center; cursor: pointer; transition: all 0.2s; margin-bottom: 12px;
    }
    .img-upload-area:hover { border-color: var(--accent); background: rgba(124,106,247,0.04); }
    .img-upload-area input { display: none; }
    .img-upload-icon { font-size: 28px; margin-bottom: 8px; }
    .img-upload-text { font-size: 13px; color: var(--muted); }
    .img-upload-text strong { color: var(--accent); }
    .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 8px; }
    .gallery-item { position: relative; border-radius: 8px; overflow: hidden; cursor: pointer; border: 2px solid transparent; transition: border-color 0.15s; aspect-ratio: 1; }
    .gallery-item img { width: 100%; height: 100%; object-fit: cover; }
    .gallery-item:hover { border-color: var(--accent); }
    .gallery-item.selected { border-color: var(--accent2); }
    .gallery-item .del-btn { position: absolute; top: 3px; right: 3px; background: rgba(0,0,0,0.7); border: none; color: white; border-radius: 50%; width: 20px; height: 20px; font-size: 11px; cursor: pointer; display: none; align-items: center; justify-content: center; }
    .gallery-item:hover .del-btn { display: flex; }

    .upload-progress { height: 3px; background: var(--border); border-radius: 2px; margin-top: 10px; overflow: hidden; display: none; }
    .upload-progress-bar { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent2)); width: 0%; transition: width 0.3s; border-radius: 2px; }

    /* FETCH OG STATUS */
    .fetch-status { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 8px; font-size: 13px; margin-bottom: 14px; display: none; }
    .fetch-status.loading { background: rgba(124,106,247,0.1); color: var(--accent); border: 1px solid rgba(124,106,247,0.2); }
    .fetch-status.success { background: rgba(106,247,171,0.1); color: var(--green); border: 1px solid rgba(106,247,171,0.2); }
    .fetch-status.error { background: rgba(247,106,106,0.1); color: #f76a6a; border: 1px solid rgba(247,106,106,0.2); }

    .btn-primary {
      padding: 13px 28px; background: linear-gradient(135deg, var(--accent), var(--accent2));
      border: none; border-radius: 9px; color: white; font-family: 'Syne', sans-serif;
      font-size: 14px; font-weight: 700; cursor: pointer; transition: opacity 0.2s, transform 0.1s;
    }
    .btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }

    /* RESULT */
    .result-box { background: rgba(106,247,171,0.08); border: 1px solid rgba(106,247,171,0.2); border-radius: 10px; padding: 16px 20px; margin-top: 16px; display: none; }
    .result-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--green); margin-bottom: 8px; }
    .result-url-row { display: flex; align-items: center; gap: 10px; }
    .result-url { font-family: 'Syne', sans-serif; font-size: 16px; font-weight: 700; color: var(--text); flex: 1; }
    .btn-copy { padding: 7px 14px; background: var(--border); border: none; border-radius: 6px; color: var(--text); font-size: 12px; cursor: pointer; transition: background 0.15s; }
    .btn-copy:hover { background: var(--accent); }

    /* LINKS TABLE */
    .links-table { width: 100%; border-collapse: collapse; }
    .links-table th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); padding: 10px 14px; text-align: left; border-bottom: 1px solid var(--border); }
    .links-table td { padding: 12px 14px; border-bottom: 1px solid var(--border); font-size: 13px; vertical-align: middle; }
    .links-table tr:last-child td { border-bottom: none; }
    .links-table tr:hover td { background: rgba(255,255,255,0.02); }
    .slug-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: rgba(124,106,247,0.12); color: var(--accent); border-radius: 20px; font-size: 12px; font-weight: 600; font-family: 'Syne', sans-serif; }
    .clicks-chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px; background: rgba(106,247,171,0.1); color: var(--green); border-radius: 20px; font-size: 12px; }
    .thumb { width: 38px; height: 38px; border-radius: 6px; object-fit: cover; }
    .link-title { font-weight: 500; margin-bottom: 2px; }
    .link-dest { font-size: 12px; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px; }
    .empty-state { text-align: center; padding: 40px; color: var(--muted); }
    .empty-icon { font-size: 36px; margin-bottom: 10px; }

    /* SPINNER */
    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { display: inline-block; width: 14px; height: 14px; border: 2px solid currentColor; border-top-color: transparent; border-radius: 50%; animation: spin 0.6s linear infinite; }
  </style>
</head>
<body>
  <!-- SIDEBAR -->
  <aside class="sidebar">
    <div class="logo">
      <div class="logo-icon">🔗</div>
      <span class="logo-text">LinkForge</span>
    </div>
    <div class="nav-label">Menu</div>
    <button class="nav-item active" onclick="showSection('create')">
      <span class="icon">✂️</span> New Link
    </button>
    <button class="nav-item" onclick="showSection('links')">
      <span class="icon">📊</span> All Links
    </button>
    <button class="nav-item" onclick="showSection('images')">
      <span class="icon">🖼️</span> Images
    </button>
    <div class="sidebar-footer">
      <div class="stat-card">
        <div class="stat-num" id="total-links">${links.length}</div>
        <div class="stat-label">Total Links</div>
      </div>
      <div class="stat-card">
        <div class="stat-num" id="total-clicks">${links.reduce((a: number, l: any) => a + (l.clicks || 0), 0)}</div>
        <div class="stat-label">Total Clicks</div>
      </div>
      <button class="nav-item" onclick="logout()" style="margin-top:8px;color:#f76a6a">
        <span class="icon">🚪</span> Logout
      </button>
    </div>
  </aside>

  <!-- MAIN CONTENT -->
  <main class="main">
    <div class="top-bar">
      <h1 class="page-title" id="section-title">New Link</h1>
      <span class="badge badge-green"><span class="spin" style="display:none" id="global-spin"></span> ✓ Admin</span>
    </div>

    <!-- ── CREATE SECTION ── -->
    <section id="sec-create">
      <div class="card">
        <div class="card-title">🔗 Destination URL</div>
        <div class="form-field">
          <label>URL</label>
          <div style="display:flex;gap:10px">
            <input type="url" id="destination" placeholder="https://example.com/your/link" style="flex:1">
            <button class="btn-primary" onclick="fetchOG()" style="padding:11px 18px;font-size:13px;white-space:nowrap">Fetch Preview</button>
          </div>
        </div>
        <div class="fetch-status" id="fetch-status"></div>
        
        <!-- TOGGLE -->
        <div class="card-title" style="margin-top:8px">🎨 Preview Source</div>
        <div class="toggle-group">
          <button class="toggle-btn active" id="toggle-custom" onclick="setMode('custom')">
            <span class="t-icon">✏️</span> Custom Preview
          </button>
          <button class="toggle-btn" id="toggle-auto" onclick="setMode('auto')">
            <span class="t-icon">🔍</span> Destination OG Tags
          </button>
        </div>

        <!-- LIVE PREVIEW -->
        <div class="preview-panel" id="preview-panel">
          <div class="preview-panel-header">👁️ Facebook / WhatsApp Preview</div>
          <div class="preview-inner">
            <div class="og-preview">
              <div class="og-img-placeholder" id="prev-img-placeholder">🖼️</div>
              <img class="og-img" id="prev-img" src="" alt="" style="display:none">
              <div>
                <div class="og-title" id="prev-title">Title yahan dikhega...</div>
                <div class="og-desc" id="prev-desc">Description yahan dikhega...</div>
                <div class="og-url" id="prev-url">linkforge.workers.dev/xxxxxxxx</div>
              </div>
            </div>
          </div>
        </div>

        <!-- CUSTOM MODE FIELDS -->
        <div id="custom-fields">
          <div class="form-grid">
            <div class="form-field full">
              <label>OG Title</label>
              <input type="text" id="title" placeholder="Jo title dikhana hai..." oninput="updatePreview()">
            </div>
            <div class="form-field full">
              <label>OG Description</label>
              <textarea id="description" placeholder="Short description..." rows="2" oninput="updatePreview()"></textarea>
            </div>
          </div>
          
          <div class="form-field">
            <label>🖼️ Image</label>
            <div class="img-upload-area" onclick="document.getElementById('newImage').click()">
              <input type="file" id="newImage" accept="image/*" onchange="handleUpload(event)">
              <div class="img-upload-icon">☁️</div>
              <div class="img-upload-text">Click to upload ya gallery se select karo<br><strong>Cloudinary pe save hoga</strong></div>
            </div>
            <div class="upload-progress" id="upload-progress">
              <div class="upload-progress-bar" id="upload-bar"></div>
            </div>
            <div class="gallery-grid" id="gallery">
              ${images.map((img: any) => `<div class="gallery-item" onclick="selectImage('${escapeHtml(img.url)}', this)" data-url="${escapeHtml(img.url)}"><img src="${escapeHtml(img.url)}" alt=""><button class="del-btn" onclick="delImg(event,'${img.id}',this)">✕</button></div>`).join('')}
            </div>
            <input type="hidden" id="imageUrl">
          </div>
        </div>

        <!-- AUTO MODE FIELDS (readonly) -->
        <div id="auto-fields" style="display:none">
          <div style="padding: 16px; background: var(--bg); border: 1px solid var(--border); border-radius: 10px; text-align: center; color: var(--muted); font-size: 13px;">
            <div style="font-size:24px;margin-bottom:8px">🔍</div>
            Destination URL ke OG tags automatically use honge.<br>
            Pehle "Fetch Preview" click karo upar se.
          </div>
        </div>

        <div style="margin-top:20px">
          <button class="btn-primary" onclick="createLink()">✂️ Short Karo</button>
        </div>

        <div class="result-box" id="result-box">
          <div class="result-label">🎉 Short URL Ready!</div>
          <div class="result-url-row">
            <span class="result-url" id="result-url"></span>
            <button class="btn-copy" onclick="copyUrl()">📋 Copy</button>
          </div>
        </div>
      </div>
    </section>

    <!-- ── LINKS SECTION ── -->
    <section id="sec-links" style="display:none">
      <div class="card">
        <div class="card-title">📊 All Links</div>
        ${links.length === 0 
          ? '<div class="empty-state"><div class="empty-icon">🔗</div><div>Abhi koi link nahi hai</div></div>'
          : `<table class="links-table">
            <thead><tr>
              <th>Image</th><th>Title / Destination</th><th>Slug</th><th>Clicks</th><th>Actions</th>
            </tr></thead>
            <tbody>
            ${links.map((link: any) => `<tr>
              <td><img class="thumb" src="${escapeHtml(link.image_url)}" alt="" onerror="this.style.display='none'"></td>
              <td>
                <div class="link-title">${escapeHtml(link.title)}</div>
                <div class="link-dest">${escapeHtml(link.destination)}</div>
              </td>
              <td><span class="slug-chip">/${link.slug}</span></td>
              <td><span class="clicks-chip">👆 ${link.clicks}</span></td>
              <td>
                <button class="btn-copy" onclick="navigator.clipboard.writeText(window.location.origin+'/${link.slug}')">📋</button>
                <button class="btn-copy" onclick="delLink('${link.slug}')" style="margin-left:4px;color:#f76a6a">🗑️</button>
              </td>
            </tr>`).join('')}
            </tbody>
          </table>`
        }
      </div>
    </section>

    <!-- ── IMAGES SECTION ── -->
    <section id="sec-images" style="display:none">
      <div class="card">
        <div class="card-title">🖼️ Image Library</div>
        <div style="margin-bottom:16px">
          <div class="img-upload-area" onclick="document.getElementById('libUpload').click()">
            <input type="file" id="libUpload" accept="image/*" style="display:none" onchange="libUpload(event)">
            <div class="img-upload-icon">☁️</div>
            <div class="img-upload-text">Click to upload new image</div>
          </div>
        </div>
        <div class="gallery-grid" id="lib-gallery" style="grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px;">
          ${images.map((img: any) => `<div class="gallery-item" style="aspect-ratio:1" data-id="${img.id}"><img src="${escapeHtml(img.url)}" alt="" style="width:100%;height:100%;object-fit:cover"><button class="del-btn" onclick="delImg(event,'${img.id}',this)">✕</button></div>`).join('')}
        </div>
      </div>
    </section>
  </main>

  <script>
    // State
    let mode = 'custom'; // 'custom' or 'auto'
    let fetchedOG = { title: '', description: '', image: '' };
    const allImages = ${imagesJson};

    // Section switching
    function showSection(name) {
      ['create','links','images'].forEach(s => {
        document.getElementById('sec-'+s).style.display = s === name ? '' : 'none';
      });
      document.getElementById('section-title').textContent = {create:'New Link',links:'All Links',images:'Image Library'}[name];
      document.querySelectorAll('.nav-item').forEach((el, i) => {
        el.classList.toggle('active', ['create','links','images'][i] === name);
      });
    }

    // Preview Source Toggle
    function setMode(m) {
      mode = m;
      document.getElementById('toggle-custom').classList.toggle('active', m === 'custom');
      document.getElementById('toggle-auto').classList.toggle('active', m === 'auto');
      document.getElementById('custom-fields').style.display = m === 'custom' ? '' : 'none';
      document.getElementById('auto-fields').style.display = m === 'auto' ? '' : 'none';
      if (m === 'auto') applyFetchedOG();
    }

    function applyFetchedOG() {
      if (fetchedOG.title || fetchedOG.description || fetchedOG.image) {
        updatePreviewWith(fetchedOG.title, fetchedOG.description, fetchedOG.image);
      }
    }

    // Live preview update
    function updatePreview() {
      const t = document.getElementById('title').value;
      const d = document.getElementById('description').value;
      const i = document.getElementById('imageUrl').value;
      updatePreviewWith(t, d, i);
    }

    function updatePreviewWith(t, d, i) {
      document.getElementById('prev-title').textContent = t || 'Title yahan dikhega...';
      document.getElementById('prev-desc').textContent = d || 'Description yahan dikhega...';
      if (i) {
        document.getElementById('prev-img').src = i;
        document.getElementById('prev-img').style.display = '';
        document.getElementById('prev-img-placeholder').style.display = 'none';
      } else {
        document.getElementById('prev-img').style.display = 'none';
        document.getElementById('prev-img-placeholder').style.display = '';
      }
    }

    // Fetch OG Tags from destination
    async function fetchOG() {
      const url = document.getElementById('destination').value;
      if (!url) { alert('URL daalo pehle!'); return; }
      const status = document.getElementById('fetch-status');
      status.className = 'fetch-status loading'; 
      status.innerHTML = '<span class="spin"></span> Fetching OG tags...'; 
      status.style.display = 'flex';
      try {
        const res = await fetch('/api/fetch-og', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ url })
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        fetchedOG = { title: data.title || '', description: data.description || '', image: data.image || '' };
        status.className = 'fetch-status success';
        status.innerHTML = '✅ OG tags fetch ho gaye!';
        if (mode === 'auto') applyFetchedOG();
        setTimeout(() => status.style.display = 'none', 2500);
      } catch(e) {
        status.className = 'fetch-status error';
        status.innerHTML = '❌ Fetch nahi hua. Custom mode use karo.';
        setTimeout(() => status.style.display = 'none', 3000);
      }
    }

    // Image selection
    function selectImage(url, el) {
      document.getElementById('imageUrl').value = url;
      document.querySelectorAll('.gallery-item').forEach(d => d.classList.remove('selected'));
      if (el) el.classList.add('selected');
      updatePreview();
    }

    // Upload image
    async function handleUpload(e) {
      const file = e.target.files[0]; if (!file) return;
      const prog = document.getElementById('upload-progress');
      const bar = document.getElementById('upload-bar');
      prog.style.display = 'block'; bar.style.width = '30%';
      const form = new FormData(); form.append('image', file);
      bar.style.width = '60%';
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      bar.style.width = '100%';
      const data = await res.json();
      setTimeout(() => prog.style.display = 'none', 600);
      if (data.url) {
        const gallery = document.getElementById('gallery');
        const div = document.createElement('div');
        div.className = 'gallery-item selected';
        div.setAttribute('data-url', data.url);
        div.onclick = () => selectImage(data.url, div);
        div.innerHTML = '<img src="'+data.url+'" alt=""><button class="del-btn" onclick="delImg(event,null,this)">✕</button>';
        gallery.insertBefore(div, gallery.firstChild);
        selectImage(data.url, div);
      }
      e.target.value = '';
    }

    async function libUpload(e) {
      const file = e.target.files[0]; if (!file) return;
      const form = new FormData(); form.append('image', file);
      const res = await fetch('/api/upload', { method: 'POST', body: form });
      const data = await res.json();
      if (data.url) {
        const g = document.getElementById('lib-gallery');
        const d = document.createElement('div');
        d.className = 'gallery-item'; d.style.aspectRatio = '1';
        d.innerHTML = '<img src="'+data.url+'" style="width:100%;height:100%;object-fit:cover"><button class="del-btn" onclick="delImg(event,null,this)">✕</button>';
        g.insertBefore(d, g.firstChild);
      }
      e.target.value = '';
    }

    function delImg(e, id, btn) {
      e.stopPropagation();
      btn.closest('.gallery-item').remove();
    }

    // Create short link
    async function createLink() {
      const destination = document.getElementById('destination').value;
      if (!destination) { alert('URL daalo!'); return; }
      
      let title, description, imageUrl;
      if (mode === 'auto') {
        title = fetchedOG.title;
        description = fetchedOG.description;
        imageUrl = fetchedOG.image;
        if (!title) { alert('Pehle "Fetch Preview" click karo!'); return; }
      } else {
        title = document.getElementById('title').value;
        description = document.getElementById('description').value;
        imageUrl = document.getElementById('imageUrl').value;
        if (!title) { alert('Title daalo!'); return; }
        if (!imageUrl) { alert('Image select karo!'); return; }
      }

      const res = await fetch('/api/shorten', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ destination, title, description, imageUrl })
      });
      const data = await res.json();
      if (data.slug) {
        const shortUrl = window.location.origin + '/' + data.slug;
        document.getElementById('result-url').textContent = shortUrl;
        document.getElementById('result-box').style.display = 'block';
        document.getElementById('prev-url').textContent = shortUrl;
      } else alert('Error!');
    }

    function copyUrl() {
      navigator.clipboard.writeText(document.getElementById('result-url').textContent);
      const btn = document.querySelector('.btn-copy');
      btn.textContent = '✅ Copied!';
      setTimeout(() => btn.textContent = '📋 Copy', 2000);
    }

    async function delLink(slug) {
      if (!confirm('Delete karna hai /' + slug + '?')) return;
      await fetch('/api/delete/' + slug, { method: 'DELETE' });
      location.reload();
    }

    async function logout() {
      await fetch('/api/logout');
      location.href = '/login';
    }
  </script>
</body>
</html>`);
  } catch(e) {
    return c.redirect('/login');
  }
});

// ─── UPLOAD ───────────────────────────────────────────────────────────────────
app.post('/api/upload', async (c) => {
  const token = getCookie(c, 'token');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  const formData = await c.req.formData();
  const file = formData.get('image') as File;
  if (!file) return c.json({ error: 'No file' }, 400);
  const bytes = await file.arrayBuffer();
  const cloudFormData = new FormData();
  const blob = new Blob([bytes], { type: file.type });
  cloudFormData.append('file', blob, file.name);
  cloudFormData.append('upload_preset', c.env.CLOUDINARY_UPLOAD_PRESET);
  const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${c.env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST', body: cloudFormData
  });
  const cloudData = await cloudRes.json() as { secure_url: string };
  await c.env.DB.prepare(`INSERT INTO images (id, url, filename, size, created_at) VALUES (?, ?, ?, ?, ?)`)
    .bind(nanoid(), cloudData.secure_url, file.name, file.size, Date.now()).run();
  return c.json({ url: cloudData.secure_url });
});

// ─── SHORTEN ─────────────────────────────────────────────────────────────────
app.post('/api/shorten', async (c) => {
  const token = getCookie(c, 'token');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  const { destination, title, description, imageUrl } = await c.req.json();
  const slug = nanoid(8);
  await c.env.DB.prepare(`INSERT INTO short_links (id, slug, destination, title, description, image_url, clicks, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`)
    .bind(nanoid(), slug, destination, title || '', description || '', imageUrl || '', Date.now()).run();
  return c.json({ slug });
});

// ─── DELETE LINK ──────────────────────────────────────────────────────────────
app.delete('/api/delete/:slug', async (c) => {
  const token = getCookie(c, 'token');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  const slug = c.req.param('slug');
  await c.env.DB.prepare('DELETE FROM short_links WHERE slug = ?').bind(slug).run();
  return c.json({ success: true });
});

// ─── REDIRECT / OG ───────────────────────────────────────────────────────────
app.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const userAgent = c.req.header('User-Agent') || '';
  const isBot = /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|WhatsApp|curl|wget|python|bot|crawler|spider|scraper|facebook/i.test(userAgent);

  const link = await c.env.DB.prepare('SELECT * FROM short_links WHERE slug = ?').bind(slug).first();
  if (!link) return c.text('404 - Link not found', 404);

  if (isBot) {
    return c.html(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta property="og:title" content="${escapeHtml(String(link.title))}" />
  <meta property="og:description" content="${escapeHtml(String(link.description))}" />
  <meta property="og:image" content="${escapeHtml(String(link.image_url))}" />
  <meta property="og:url" content="${c.req.url}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="LinkForge" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(String(link.title))}" />
  <meta name="twitter:description" content="${escapeHtml(String(link.description))}" />
  <meta name="twitter:image" content="${escapeHtml(String(link.image_url))}" />
  <title>${escapeHtml(String(link.title))}</title>
</head>
<body>
  <h1>${escapeHtml(String(link.title))}</h1>
  <p>${escapeHtml(String(link.description))}</p>
  <img src="${escapeHtml(String(link.image_url))}" alt="Preview" style="max-width:300px">
  <p><a href="${escapeHtml(String(link.destination))}">${escapeHtml(String(link.destination))}</a></p>
</body>
</html>`);
  }

  await c.env.DB.prepare('UPDATE short_links SET clicks = clicks + 1 WHERE slug = ?').bind(slug).run();
  return c.redirect(String(link.destination), 302);
});

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
app.get('/api/logout', async (c) => {
  deleteCookie(c, 'token');
  return c.json({ success: true });
});

export default app;