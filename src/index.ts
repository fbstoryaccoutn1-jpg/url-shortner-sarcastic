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

function escapeHtml(str: string): string {
  if (!str) return '';
  return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

async function fetchOgTags(url: string): Promise<{ title: string; description: string; image: string } | null> {
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'FacebookBot' } });
    const html = await response.text();
    const titleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)/i);
    const descMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)/i);
    const imageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)/i);
    return {
      title: titleMatch ? titleMatch[1] : '',
      description: descMatch ? descMatch[1] : '',
      image: imageMatch ? imageMatch[1] : ''
    };
  } catch(e) {
    return null;
  }
}

// ==================== LOGIN PAGE ====================
app.get('/', async c => c.redirect('/login'));

app.get('/login', async c => {
  return c.html(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>URL Shortner Login</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background: linear-gradient(135deg, #0a0f1e 0%, #03050b 100%); min-height: 100vh; }
    .card { background: rgba(15, 25, 45, 0.8); backdrop-filter: blur(10px); border: 1px solid #00ccff33; border-radius: 32px; }
    input { background: #0a0f1c; border: 1px solid #1e2a3e; border-radius: 20px; padding: 12px 20px; color: white; }
    input:focus { border-color: #0ff; outline: none; box-shadow: 0 0 10px #0ff; }
    button { background: linear-gradient(95deg, #00c6ff, #0072ff); border-radius: 40px; padding: 12px; font-weight: bold; }
  </style>
</head>
<body class="flex items-center justify-center p-5">
  <div class="card p-8 w-full max-w-md">
    <div class="text-center mb-6">
      <div class="text-6xl mb-2">🎭</div>
      <h1 class="text-3xl font-bold text-white">URL Shortner</h1>
      <p class="text-cyan-300/50 text-sm">Sirf Admin ke liye</p>
    </div>
    <form id="loginForm" class="space-y-4">
      <input type="text" id="username" placeholder="Username" required>
      <input type="password" id="password" placeholder="Password" required>
      <button type="submit" class="w-full text-white">Login Karo</button>
    </form>
    <div class="mt-4 text-center">
      <button id="fakeBtn" class="text-cyan-300/50 text-sm">🔒 Register? (Press kar)</button>
    </div>
    <div id="msgBox" class="mt-4 hidden"><div id="msgText" class="p-3 rounded-xl text-center text-sm"></div></div>
  </div>
  <script>
    function showMsg(msg, isOk) {
      const box = document.getElementById('msgBox');
      const txt = document.getElementById('msgText');
      txt.innerHTML = msg;
      box.classList.remove('hidden');
      txt.className = isOk ? 'bg-green-500/20 text-green-300 p-3 rounded-xl' : 'bg-red-500/20 text-red-300 p-3 rounded-xl';
      setTimeout(() => box.classList.add('hidden'), 3000);
    }
    document.getElementById('loginForm').onsubmit = async (e) => {
      e.preventDefault();
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: document.getElementById('username').value, password: document.getElementById('password').value })
      });
      const data = await res.json();
      if (res.ok) { showMsg(data.message, true); setTimeout(() => window.location.href = '/dashboard', 1000); }
      else showMsg(data.message, false);
    };
    document.getElementById('fakeBtn').onclick = async () => {
      const res = await fetch('/api/fake-register');
      const data = await res.json();
      showMsg(data.message, false);
    };
  </script>
</body>
</html>`);
});

app.get('/api/fake-register', async c => {
  const msgs = ["😎 Arey bhai, registration band hai!", "🚫 Naye user nahi ban sakte!", "🤪 Kya soch raha hai? Registration off hai!"];
  return c.json({ message: msgs[Math.floor(Math.random() * msgs.length)] });
});

app.post('/api/login', async c => {
  const { username, password } = await c.req.json();
  if (username === 'admin' && password === 'admin@9630') {
    setCookie(c, 'token', btoa(JSON.stringify({ id: 'admin', exp: Date.now() + 86400000 })), { httpOnly: true, maxAge: 86400, path: '/' });
    return c.json({ success: true, message: "🎉 Wah bhai! Correct password! Andar aao!" });
  }
  return c.json({ message: "🤡 Bhai sahi password daal! hai!" }, 401);
});

// ==================== DASHBOARD ====================
app.get('/dashboard', async c => {
  const token = getCookie(c, 'token');
  if (!token) return c.redirect('/login');
  try {
    JSON.parse(atob(token));
    let links = [], images = [];
    try {
      const lr = await c.env.DB.prepare('SELECT * FROM short_links ORDER BY created_at DESC LIMIT 200').all();
      links = lr.results || [];
      const ir = await c.env.DB.prepare('SELECT * FROM images ORDER BY created_at DESC').all();
      images = ir.results || [];
    } catch(e) {}

    // Build links HTML
    let linksHtml = '';
    if (links.length === 0) {
      linksHtml = '<div class="text-center py-10 text-gray-400">✨ No links yet</div>';
    } else {
      for (const link of links) {
        linksHtml += `<div class="bg-[#0a0f1c] border border-gray-800 rounded-xl p-4 mb-3">
          <div class="flex flex-wrap justify-between items-center">
            <div class="flex-1">
              <code class="bg-black/50 px-3 py-1 rounded-full text-sm text-cyan-300">/${link.slug}</code>
              <div class="text-cyan-300/80 text-sm mt-1">${escapeHtml(link.title || '')}</div>
              <div class="text-gray-500 text-xs truncate">${escapeHtml(link.destination || '')}</div>
              ${link.preview_mode === 'auto' ? '<span class="text-purple-400 text-xs">🌐 Auto Preview</span>' : ''}
            </div>
            <div class="flex gap-2 mt-2 sm:mt-0">
              <span class="bg-blue-500/20 px-3 py-1 rounded-full text-xs">👆 ${link.clicks}</span>
              <button onclick="copyText(\'${c.req.url.replace('/dashboard', '')}/${link.slug}\')" class="bg-gray-700 hover:bg-cyan-600 px-3 py-1 rounded-full text-xs">Copy</button>
            </div>
          </div>
        </div>`;
      }
    }

    // Build images HTML
    let imagesHtml = '';
    if (images.length === 0) {
      imagesHtml = '<div class="text-center py-10 text-gray-400">📸 No images yet</div>';
    } else {
      imagesHtml = '<div class="grid grid-cols-2 sm:grid-cols-4 gap-4">';
      for (const img of images) {
        imagesHtml += `<div class="bg-black/40 rounded-xl p-3 border border-gray-800">
          <img src="${img.url}" class="w-full h-32 object-cover rounded-lg mb-2">
          <div class="text-xs text-gray-400 truncate">${escapeHtml(img.filename || 'image')}</div>
          <button onclick="copyText('${img.url}')" class="w-full mt-2 bg-gray-700 hover:bg-cyan-600 px-2 py-1 rounded-full text-xs">Copy URL</button>
        </div>`;
      }
      imagesHtml += '</div>';
    }

    // Build gallery HTML for create tab
    let galleryHtml = '';
    for (const img of images.slice(0, 12)) {
      galleryHtml += `<div onclick="selectImage('${img.url}')" class="cursor-pointer border-2 border-transparent rounded-lg hover:border-cyan-400">
        <img src="${img.url}" class="w-full h-16 object-cover rounded-lg">
      </div>`;
    }

    return c.html(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Dashboard - URL Shortner</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { background: #03050b; }
    .card { background: rgba(10, 18, 30, 0.95); border: 1px solid rgba(0,200,255,0.15); border-radius: 28px; }
    input, textarea { background: #0a0f1c; border: 1px solid #1e2a3e; border-radius: 18px; padding: 12px 16px; color: white; }
    input:focus, textarea:focus { border-color: #0ff; outline: none; box-shadow: 0 0 8px #0ff; }
    .btn-primary { background: linear-gradient(100deg, #00c6ff, #0072ff); border-radius: 40px; padding: 12px; font-weight: bold; }
    .tab-active { border-bottom: 2px solid #0ff; color: #0ff; }
    .tab-inactive { color: #8a9bb5; }
  </style>
</head>
<body class="text-gray-200">
  <div class="max-w-6xl mx-auto px-4 py-6">
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div class="flex items-center gap-3">
        <div class="text-4xl">🎭</div>
        <div>
          <h1 class="text-2xl font-bold">Sarcastic Shortner</h1>
          <p class="text-cyan-300/50 text-xs">pro dashboard</p>
        </div>
      </div>
      <button onclick="logout()" class="bg-red-600/70 hover:bg-red-600 px-5 py-2 rounded-full text-sm">Logout</button>
    </div>

    <!-- Tabs -->
    <div class="flex gap-4 mb-6 border-b border-gray-800">
      <button onclick="showTab('create')" id="tabCreateBtn" class="tab-active pb-2 px-2 font-semibold">Create Link</button>
      <button onclick="showTab('links')" id="tabLinksBtn" class="tab-inactive pb-2 px-2 font-semibold">All Links</button>
      <button onclick="showTab('images')" id="tabImagesBtn" class="tab-inactive pb-2 px-2 font-semibold">Images</button>
    </div>

    <!-- Tab 1: Create -->
    <div id="tabCreate" class="card p-6">
      <h2 class="text-xl font-bold mb-4">Create New Link</h2>
      
      <!-- Preview Mode -->
      <div class="bg-[#0a0f1c] rounded-xl p-4 mb-5">
        <p class="text-sm text-cyan-300/80 mb-2">Preview Mode (Airbridge Style):</p>
        <div class="flex gap-6">
          <label class="flex items-center gap-2">
            <input type="radio" name="mode" value="custom" checked class="w-4 h-4"> Custom Preview
          </label>
          <label class="flex items-center gap-2">
            <input type="radio" name="mode" value="auto" class="w-4 h-4"> Auto Preview (from Destination)
          </label>
        </div>
      </div>

      <form id="createForm" class="space-y-4">
        <input type="url" id="dest" placeholder="Destination URL" required>
        
        <div id="customFields">
          <input type="text" id="title" placeholder="OG Title (Facebook Preview)" required>
          <textarea id="desc" placeholder="OG Description" rows="2" class="mt-3" required></textarea>
          
          <div class="mt-3">
            <label class="text-sm text-cyan-300/80">Image (Cloudinary)</label>
            <input type="file" id="imageFile" accept="image/*" class="mt-1">
            <div id="uploadStatus" class="text-xs mt-1 hidden"></div>
            <div id="gallery" class="grid grid-cols-6 gap-2 mt-3">${galleryHtml}</div>
            <input type="hidden" id="imageUrl">
          </div>
        </div>
        
        <div id="autoNote" class="hidden bg-purple-900/30 border border-purple-500/30 rounded-xl p-3 text-sm">
          <p class="text-purple-300">Auto Preview Mode - Facebook will see destination website's OG tags</p>
        </div>
        
        <button type="submit" class="btn-primary w-full text-white">Create Short Link</button>
      </form>
      
      <div id="result" class="mt-4 hidden p-4 bg-cyan-900/30 rounded-xl">
        <p class="font-semibold">Short URL:</p>
        <code id="shortUrl" class="break-all block mt-1"></code>
      </div>

      <!-- Bulk Generate -->
      <div class="mt-8 pt-5 border-t border-gray-800">
        <h3 class="font-semibold mb-3">Bulk Generate - 15 Links</h3>
        <div class="flex gap-3">
          <input type="text" id="bulkPrefix" placeholder="Prefix (optional)" class="flex-1">
          <button type="button" id="bulkBtn" class="bg-purple-600/80 hover:bg-purple-600 px-5 py-2 rounded-full">Generate 15</button>
        </div>
        <div id="bulkResult" class="mt-3 hidden p-3 bg-cyan-900/30 rounded-xl max-h-60 overflow-y-auto"></div>
      </div>
    </div>

    <!-- Tab 2: Links -->
    <div id="tabLinks" class="card p-6 hidden">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">All Links</h2>
        <span class="bg-blue-500/20 px-3 py-1 rounded-full text-sm">Total: ${links.length}</span>
      </div>
      ${linksHtml}
    </div>

    <!-- Tab 3: Images -->
    <div id="tabImages" class="card p-6 hidden">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-xl font-bold">Image Gallery</h2>
        <span class="bg-blue-500/20 px-3 py-1 rounded-full text-sm">Total: ${images.length}</span>
      </div>
      ${imagesHtml}
    </div>
  </div>

  <script>
    let selectedImage = '';
    
    function toggleMode() {
      const isAuto = document.querySelector('input[name="mode"]:checked').value === 'auto';
      const customDiv = document.getElementById('customFields');
      const autoNote = document.getElementById('autoNote');
      if (isAuto) {
        customDiv.style.display = 'none';
        autoNote.classList.remove('hidden');
      } else {
        customDiv.style.display = 'block';
        autoNote.classList.add('hidden');
      }
    }
    
    document.querySelectorAll('input[name="mode"]').forEach(r => r.addEventListener('change', toggleMode));
    
    window.selectImage = function(url) {
      selectedImage = url;
      document.getElementById('imageUrl').value = url;
      document.querySelectorAll('#gallery > div').forEach(div => div.classList.remove('border-cyan-400', 'border-2'));
      if(event && event.currentTarget) event.currentTarget.classList.add('border-cyan-400', 'border-2');
    };
    
    document.getElementById('imageFile').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('image', file);
      const status = document.getElementById('uploadStatus');
      status.classList.remove('hidden');
      status.innerHTML = 'Uploading...';
      status.className = 'text-xs mt-1 text-cyan-300';
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.url) {
          status.innerHTML = 'Uploaded!';
          status.className = 'text-xs mt-1 text-green-300';
          selectedImage = data.url;
          document.getElementById('imageUrl').value = data.url;
          setTimeout(() => status.classList.add('hidden'), 1500);
          // Refresh gallery
          location.reload();
        }
      } catch(err) {
        status.innerHTML = 'Failed';
        status.className = 'text-xs mt-1 text-red-300';
      }
    };
    
    document.getElementById('createForm').onsubmit = async (e) => {
      e.preventDefault();
      const mode = document.querySelector('input[name="mode"]:checked').value;
      const dest = document.getElementById('dest').value;
      let title = '', desc = '', imgUrl = '';
      
      if (mode === 'custom') {
        title = document.getElementById('title').value;
        desc = document.getElementById('desc').value;
        imgUrl = document.getElementById('imageUrl').value;
        if (!title || !desc || !imgUrl) {
          alert('Please fill title, description and select/upload image');
          return;
        }
      }
      
      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: dest, title, description: desc, imageUrl: imgUrl, previewMode: mode })
      });
      const data = await res.json();
      if (data.slug) {
        document.getElementById('shortUrl').innerText = window.location.origin + '/' + data.slug;
        document.getElementById('result').classList.remove('hidden');
        setTimeout(() => location.reload(), 2000);
      } else {
        alert('Error: ' + JSON.stringify(data));
      }
    };
    
    document.getElementById('bulkBtn').onclick = async () => {
      const mode = document.querySelector('input[name="mode"]:checked').value;
      const dest = document.getElementById('dest').value;
      const prefix = document.getElementById('bulkPrefix').value || '';
      let title = '', desc = '', imgUrl = '';
      
      if (mode === 'custom') {
        title = document.getElementById('title').value;
        desc = document.getElementById('desc').value;
        imgUrl = document.getElementById('imageUrl').value;
        if (!dest || !title || !desc || !imgUrl) {
          alert('Please fill all fields first');
          return;
        }
      } else if (!dest) {
        alert('Please enter destination URL');
        return;
      }
      
      const btn = document.getElementById('bulkBtn');
      btn.innerHTML = 'Generating...';
      btn.disabled = true;
      
      const res = await fetch('/api/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: dest, title, description: desc, imageUrl: imgUrl, count: 15, prefix, previewMode: mode })
      });
      const data = await res.json();
      
      if (data.slugs) {
        let html = '<p class="font-semibold mb-2">15 Links Generated:</p>';
        for (const slug of data.slugs) {
          html += '<div class="bg-black/40 p-2 rounded-lg mb-1 flex justify-between items-center"><code>' + window.location.origin + '/' + slug + '</code><button onclick="copyText(\'' + window.location.origin + '/' + slug + '\')" class="bg-gray-700 px-2 py-1 rounded text-xs">Copy</button></div>';
        }
        document.getElementById('bulkResult').innerHTML = html;
        document.getElementById('bulkResult').classList.remove('hidden');
        setTimeout(() => location.reload(), 3000);
      }
      btn.innerHTML = 'Generate 15';
      btn.disabled = false;
    };
    
    window.copyText = function(text) {
      navigator.clipboard.writeText(text);
      alert('Copied: ' + text);
    };
    
    window.showTab = function(tab) {
      document.getElementById('tabCreate').classList.add('hidden');
      document.getElementById('tabLinks').classList.add('hidden');
      document.getElementById('tabImages').classList.add('hidden');
      document.getElementById('tabCreateBtn').classList.remove('tab-active');
      document.getElementById('tabLinksBtn').classList.remove('tab-active');
      document.getElementById('tabImagesBtn').classList.remove('tab-active');
      document.getElementById('tabCreateBtn').classList.add('tab-inactive');
      document.getElementById('tabLinksBtn').classList.add('tab-inactive');
      document.getElementById('tabImagesBtn').classList.add('tab-inactive');
      
      if (tab === 'create') {
        document.getElementById('tabCreate').classList.remove('hidden');
        document.getElementById('tabCreateBtn').classList.add('tab-active');
      } else if (tab === 'links') {
        document.getElementById('tabLinks').classList.remove('hidden');
        document.getElementById('tabLinksBtn').classList.add('tab-active');
      } else if (tab === 'images') {
        document.getElementById('tabImages').classList.remove('hidden');
        document.getElementById('tabImagesBtn').classList.add('tab-active');
      }
    };
    
    window.logout = async function() {
      await fetch('/api/logout');
      window.location.href = '/login';
    };
    
    toggleMode();
  </script>
</body>
</html>`);
  } catch(e) {
    return c.redirect('/login');
  }
});

// ==================== API ROUTES ====================
app.post('/api/upload', async c => {
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
  const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${c.env.CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: cloudFormData });
  const cloudData = await cloudRes.json();
  await c.env.DB.prepare(`INSERT INTO images (id, url, filename, size, created_at) VALUES (?, ?, ?, ?, ?)`).bind(nanoid(), cloudData.secure_url, file.name, file.size, Date.now()).run();
  return c.json({ url: cloudData.secure_url });
});

app.post('/api/shorten', async c => {
  const token = getCookie(c, 'token');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  const { destination, title, description, imageUrl, previewMode } = await c.req.json();
  const slug = nanoid(8);
  const mode = previewMode || 'custom';
  await c.env.DB.prepare(`INSERT INTO short_links (id, slug, destination, title, description, image_url, clicks, created_at, preview_mode) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`).bind(nanoid(), slug, destination, title || '', description || '', imageUrl || '', Date.now(), mode).run();
  return c.json({ slug });
});

app.post('/api/bulk', async c => {
  const token = getCookie(c, 'token');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  const { destination, title, description, imageUrl, count, prefix, previewMode } = await c.req.json();
  const slugs = [];
  const batch = c.env.DB.batch();
  const mode = previewMode || 'custom';
  const limit = Math.min(count || 15, 20);
  for(let i = 0; i < limit; i++) {
    const slug = prefix ? `${prefix}${nanoid(6)}` : nanoid(8);
    slugs.push(slug);
    batch.add(c.env.DB.prepare(`INSERT INTO short_links (id, slug, destination, title, description, image_url, clicks, created_at, preview_mode) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`).bind(nanoid(), slug, destination, title || '', description || '', imageUrl || '', Date.now(), mode));
  }
  await batch.run();
  return c.json({ slugs });
});

app.get('/:slug', async c => {
  const slug = c.req.param('slug');
  const userAgent = c.req.header('User-Agent') || '';
  const isBot = /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|WhatsApp|curl|wget|python|bot|crawler|spider|scraper|facebook/i.test(userAgent);
  const link = await c.env.DB.prepare('SELECT * FROM short_links WHERE slug = ?').bind(slug).first();
  if (!link) return c.text('404 - Link not found', 404);
  
  if (isBot) {
    let ogTitle = link.title;
    let ogDescription = link.description;
    let ogImage = link.image_url;
    if (link.preview_mode === 'auto') {
      const ogTags = await fetchOgTags(link.destination);
      if (ogTags) {
        ogTitle = ogTags.title || link.destination;
        ogDescription = ogTags.description || '';
        ogImage = ogTags.image || '';
      }
    }
    return c.html(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta property="og:title" content="${escapeHtml(ogTitle)}" /><meta property="og:description" content="${escapeHtml(ogDescription)}" /><meta property="og:image" content="${escapeHtml(ogImage)}" /><meta property="og:url" content="${c.req.url}" /><meta property="og:type" content="website" /><title>${escapeHtml(ogTitle)}</title></head><body style="background:#0a0f1c;color:#ccc;text-align:center;padding-top:3rem"><h2>${escapeHtml(ogTitle)}</h2><p>${escapeHtml(ogDescription)}</p>${ogImage ? '<img src="' + escapeHtml(ogImage) + '" style="max-width:300px;border-radius:20px;margin:20px auto"/>' : ''}<p>Redirecting...</p></body></html>`);
  }
  
  await c.env.DB.prepare('UPDATE short_links SET clicks = clicks + 1 WHERE slug = ?').bind(slug).run();
  return c.redirect(link.destination, 302);
});

app.get('/api/logout', async c => { deleteCookie(c, 'token'); return c.json({ success: true }); });

export default app;