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
  "🤡 Bhai sahi password daal! hai!",
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

app.get('/', async c => c.redirect('/login'));

app.get('/login', async c => {
  return c.html(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Sarcastic URL Shortner</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { font-family: 'Inter', sans-serif; }
    body { background: radial-gradient(circle at 20% 30%, #0a0f1e, #03050b); min-height: 100vh; }
    .glass-card { background: rgba(15, 25, 45, 0.6); backdrop-filter: blur(14px); border: 1px solid rgba(0, 255, 255, 0.2); border-radius: 32px; }
    .glow-input { background: #0a0f1c; border: 1px solid #1e2a3e; border-radius: 20px; transition: all 0.2s; color: white; }
    .glow-input:focus { border-color: #0ff; box-shadow: 0 0 10px #0ff; outline: none; }
    .btn-glow { background: linear-gradient(95deg, #00c6ff, #0072ff); border-radius: 40px; }
    .btn-glow:hover { transform: scale(1.02); }
  </style>
</head>
<body class="flex items-center justify-center p-5">
  <div class="glass-card rounded-3xl p-8 w-full max-w-md">
    <div class="text-center mb-7">
      <div class="text-7xl mb-3">🎭</div>
      <h1 class="text-4xl font-bold text-white">URL Shortner</h1>
      <p class="text-cyan-300/60 text-sm mt-1">(Sirf Admin — Sarcasm Mode On)</p>
    </div>
    <form id="loginForm" class="space-y-5">
      <input type="text" id="username" placeholder="Username" class="glow-input w-full px-5 py-3.5 rounded-2xl text-white" required>
      <input type="password" id="password" placeholder="Password" class="glow-input w-full px-5 py-3.5 rounded-2xl text-white" required>
      <button type="submit" class="btn-glow w-full py-3.5 rounded-2xl font-semibold text-white">Login Karo</button>
    </form>
    <div class="mt-5 text-center">
      <button id="fakeRegisterBtn" class="text-cyan-300/60 text-sm">🔒 Register? (Press kar)</button>
    </div>
    <div id="messageBox" class="mt-4 hidden"><div id="messageText" class="p-3 rounded-xl text-center text-sm"></div></div>
  </div>
  <script>
    function showMessage(msg, isSuccess) {
      const box = document.getElementById('messageBox');
      const text = document.getElementById('messageText');
      text.innerHTML = msg;
      box.classList.remove('hidden');
      if(isSuccess) text.className = 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 p-3 rounded-xl';
      else text.className = 'bg-rose-500/20 text-rose-300 border border-rose-400/40 p-3 rounded-xl';
      setTimeout(() => box.classList.add('hidden'), 3000);
    }
    document.getElementById('loginForm').onsubmit = async (e) => {
      e.preventDefault();
      const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: document.getElementById('username').value, password: document.getElementById('password').value }) });
      const data = await res.json();
      if (res.ok) { showMessage(data.message, true); setTimeout(() => window.location.href = '/dashboard', 1000); }
      else showMessage(data.message, false);
    };
    document.getElementById('fakeRegisterBtn').onclick = async () => {
      const res = await fetch('/api/fake-register');
      const data = await res.json();
      showMessage(data.message, false);
    };
  </script>
</body>
</html>`);
});

app.get('/api/fake-register', async c => c.json({ message: registerMsgs[Math.floor(Math.random() * registerMsgs.length)] }));

app.post('/api/login', async c => {
  const { username, password } = await c.req.json();
  if (username === 'admin' && password === 'admin@9630') {
    setCookie(c, 'token', btoa(JSON.stringify({ id: 'admin', username: 'admin', exp: Date.now() + 86400000 })), { httpOnly: true, maxAge: 86400, path: '/' });
    return c.json({ success: true, message: successMsgs[Math.floor(Math.random() * successMsgs.length)] });
  }
  return c.json({ message: wrongPassMsgs[Math.floor(Math.random() * wrongPassMsgs.length)] }, 401);
});

app.get('/dashboard', async c => {
  const token = getCookie(c, 'token');
  if (!token) return c.redirect('/login');
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) throw new Error('expired');
    let links = [], images = [];
    try {
      const lr = await c.env.DB.prepare('SELECT * FROM short_links ORDER BY created_at DESC LIMIT 200').all();
      links = lr.results || [];
      const ir = await c.env.DB.prepare('SELECT * FROM images ORDER BY created_at DESC').all();
      images = ir.results || [];
    } catch(e) {}

    let linksHtml = '';
    if (links.length === 0) {
      linksHtml = '<div class="text-center py-12 text-gray-400 border border-dashed border-gray-700 rounded-2xl">✨ No links yet. Create your first link ✨</div>';
    } else {
      linksHtml = '<div class="space-y-3 max-h-[550px] overflow-y-auto pr-2">';
      for (const link of links) {
        linksHtml += '<div class="link-row bg-[#0a0f1c] border border-[#1e2a40] rounded-xl p-4 transition hover:border-cyan-400">';
        linksHtml += '<div class="flex flex-wrap justify-between items-center gap-3">';
        linksHtml += '<div class="flex-1 min-w-0">';
        linksHtml += '<code class="text-sm bg-black/60 px-3 py-1 rounded-full text-cyan-300">/' + link.slug + '</code>';
        linksHtml += '<div class="text-cyan-300/70 text-sm mt-1">' + escapeHtml((link.title || '').substring(0, 60)) + '</div>';
        linksHtml += '<div class="text-gray-500 text-xs truncate">' + escapeHtml((link.destination || '').substring(0, 70)) + '</div>';
        if (link.preview_mode === 'auto') linksHtml += '<span class="text-purple-400 text-xs inline-block mt-1">🌐 Auto Preview Mode</span>';
        linksHtml += '</div>';
        linksHtml += '<div class="flex items-center gap-3">';
        linksHtml += '<span class="bg-blue-500/20 px-3 py-1 rounded-full text-xs">👆 ' + link.clicks + ' clicks</span>';
        linksHtml += '<button onclick="copyToClipboard(\'' + c.req.url.replace('/dashboard', '') + '/' + link.slug + '\')" class="bg-gray-800 hover:bg-cyan-600 px-3 py-1 rounded-full text-xs transition">📋 Copy</button>';
        linksHtml += '</div></div></div>';
      }
      linksHtml += '</div>';
    }

    let imagesHtml = '';
    if (images.length === 0) {
      imagesHtml = '<div class="text-center py-12 text-gray-400 border border-dashed border-gray-700 rounded-2xl">📸 No images uploaded yet. Upload from Create tab.</div>';
    } else {
      imagesHtml = '<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[550px] overflow-y-auto p-2">';
      for (const img of images) {
        imagesHtml += '<div class="bg-black/40 rounded-xl p-3 border border-gray-800 hover:border-cyan-400 transition">';
        imagesHtml += '<img src="' + img.url + '" class="w-full h-32 object-cover rounded-lg mb-2">';
        imagesHtml += '<div class="text-xs text-gray-400 truncate">' + escapeHtml(img.filename || 'image') + '</div>';
        imagesHtml += '<button onclick="copyToClipboard(\'' + img.url + '\')" class="copy-btn w-full mt-2 bg-gray-800 hover:bg-cyan-600 px-2 py-1 rounded-full text-xs transition">📋 Copy URL</button>';
        imagesHtml += '</div>';
      }
      imagesHtml += '</div>';
    }

    let galleryHtml = '';
    for (const img of images) {
      galleryHtml += '<div onclick="selectImage(\'' + img.url + '\')" class="gallery-img cursor-pointer border-2 border-transparent rounded-xl hover:border-cyan-400 transition"><img src="' + img.url + '" class="w-full h-20 object-cover rounded-lg"></div>';
    }

    return c.html(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Pro Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { font-family: 'Inter', sans-serif; }
    body { background: #03050b; }
    .dark-card { background: rgba(10, 18, 30, 0.95); backdrop-filter: blur(10px); border: 1px solid rgba(0, 200, 255, 0.15); border-radius: 28px; }
    .glow-input { background: #0a0f1c; border: 1px solid #1e2a3e; border-radius: 18px; transition: all 0.2s; color: white; }
    .glow-input:focus { border-color: #0ff; box-shadow: 0 0 10px #0ff; outline: none; }
    .btn-primary { background: linear-gradient(100deg, #00c6ff, #0072ff); border-radius: 40px; }
    .btn-primary:hover { transform: scale(0.98); }
    .tab-active { background: linear-gradient(135deg, #00c6ff20, #0072ff20); border-bottom: 2px solid #0ff; color: #0ff; }
    .tab-inactive { color: #8a9bb5; border-bottom: 2px solid transparent; }
    .radio-group { background: #0a0f1c; border-radius: 20px; padding: 12px 16px; border: 1px solid #1e2a3e; }
    .copy-btn { cursor: pointer; }
  </style>
</head>
<body class="text-gray-200">
  <div class="max-w-7xl mx-auto px-5 py-7">
    <div class="flex justify-between items-center mb-8">
      <div class="flex items-center gap-3">
        <div class="text-5xl">🎭</div>
        <div>
          <h1 class="text-3xl font-extrabold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">Sarcastic Shortner</h1>
          <p class="text-cyan-300/50 text-xs mt-0.5">pro dashboard — sarcasm guaranteed</p>
        </div>
      </div>
      <button onclick="logout()" class="bg-rose-600/70 hover:bg-rose-600 px-6 py-2.5 rounded-full text-sm transition">🚪 Logout</button>
    </div>

    <div class="flex gap-2 mb-7 border-b border-gray-800 pb-0">
      <button onclick="showTab('create')" id="tabCreateBtn" class="tab-active px-7 py-3 rounded-t-2xl font-semibold text-sm">✨ Create Link</button>
      <button onclick="showTab('links')" id="tabLinksBtn" class="tab-inactive px-7 py-3 rounded-t-2xl font-semibold text-sm">📊 All Links</button>
      <button onclick="showTab('images')" id="tabImagesBtn" class="tab-inactive px-7 py-3 rounded-t-2xl font-semibold text-sm">🖼️ Image Gallery</button>
    </div>

    <!-- Tab 1: Create -->
    <div id="tabCreate" class="dark-card p-7">
      <h2 class="text-2xl font-bold mb-6">✨ Create New Link</h2>
      <div class="radio-group mb-6">
        <p class="text-sm text-cyan-300/80 mb-3">🎯 Select Preview Mode (Airbridge Style):</p>
        <div class="flex flex-col sm:flex-row gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="previewMode" value="custom" checked class="w-4 h-4 accent-cyan-500"> 
            <span>🎨 Custom Preview <span class="text-gray-400 text-xs">(use my title, description, image)</span></span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="previewMode" value="auto" class="w-4 h-4 accent-purple-500"> 
            <span>🌐 Auto Preview (Destination) <span class="text-gray-400 text-xs">(fetch OG tags from destination website)</span></span>
          </label>
        </div>
      </div>
      
      <form id="shortenForm" class="space-y-5">
        <input type="url" id="destination" placeholder="Destination URL" class="glow-input w-full px-5 py-3.5 rounded-2xl" required>
        
        <div id="customFields">
          <input type="text" id="title" placeholder="OG Title (Facebook Preview)" class="glow-input w-full px-5 py-3.5 rounded-2xl mb-4" required>
          <textarea id="description" placeholder="OG Description" rows="2" class="glow-input w-full px-5 py-3.5 rounded-2xl mb-4" required></textarea>
          <div>
            <label class="text-cyan-300/80 text-sm mb-2 block">🖼️ Image (Cloudinary)</label>
            <input type="file" id="newImage" accept="image/*" class="glow-input w-full py-3 px-5 rounded-2xl">
            <div id="uploadStatus" class="text-sm mt-2 hidden"></div>
            <div id="gallery" class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 mt-4">${galleryHtml}</div>
            <input type="hidden" id="imageUrl">
          </div>
        </div>
        
        <div id="autoPreviewNote" class="hidden bg-purple-900/30 border border-purple-500/30 rounded-2xl p-4 text-sm">
          <p class="text-purple-300">🌐 Auto Preview Mode Active</p>
          <p class="text-gray-400 text-xs mt-1">Facebook bot will see the destination website's OG tags.</p>
          <p class="text-gray-500 text-xs mt-1">Canonical URL will still be your short link (like Airbridge).</p>
        </div>
        
        <button type="submit" class="btn-primary w-full py-3.5 rounded-2xl font-semibold text-white">🚀 Create Short Link</button>
      </form>
      
      <div class="mt-8 pt-6 border-t border-gray-800">
        <h3 class="text-lg font-semibold mb-4">⚡ Bulk Generate — 15 Links (1 Click)</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" id="bulkPrefix" placeholder="Prefix (optional)" class="glow-input px-4 py-2.5 rounded-xl">
          <button type="button" id="bulkBtn" class="bg-purple-600/80 hover:bg-purple-600 py-2.5 rounded-xl font-medium transition">🔥 Generate 15 Short Links</button>
        </div>
        <div id="bulkResult" class="mt-4 hidden p-4 rounded-2xl bg-cyan-900/30 border border-cyan-400/50 max-h-64 overflow-y-auto">
          <p class="font-semibold mb-2">✅ 15 Links Generated:</p>
          <div id="bulkList" class="space-y-2 text-sm"></div>
        </div>
      </div>
      
      <div id="result" class="mt-6 hidden p-5 rounded-2xl bg-cyan-900/30 border border-cyan-400/50">
        <p class="font-semibold">🔗 Your Short URL</p>
        <code id="shortUrl" class="break-all block mt-1"></code>
      </div>
    </div>

    <!-- Tab 2: Links -->
    <div id="tabLinks" class="dark-card p-7 hidden">
      <div class="flex justify-between items-center mb-5">
        <h2 class="text-2xl font-bold">📊 All Short Links</h2>
        <span class="bg-blue-500/20 px-3 py-1 rounded-full text-sm">Total: ${links.length}</span>
      </div>
      ${linksHtml}
    </div>

    <!-- Tab 3: Images -->
    <div id="tabImages" class="dark-card p-7 hidden">
      <div class="flex justify-between items-center mb-5">
        <h2 class="text-2xl font-bold">🖼️ Image Gallery</h2>
        <span class="bg-blue-500/20 px-3 py-1 rounded-full text-sm">Total: ${images.length}</span>
      </div>
      ${imagesHtml}
    </div>
  </div>

  <script>
    let selectedImage = '';
    
    function togglePreviewMode() {
      const selected = document.querySelector('input[name="previewMode"]:checked').value;
      const customFields = document.getElementById('customFields');
      const autoNote = document.getElementById('autoPreviewNote');
      const titleInput = document.getElementById('title');
      const descInput = document.getElementById('description');
      const imageHidden = document.getElementById('imageUrl');
      
      if (selected === 'auto') {
        customFields.classList.add('hidden');
        autoNote.classList.remove('hidden');
        if(titleInput) titleInput.removeAttribute('required');
        if(descInput) descInput.removeAttribute('required');
        if(imageHidden) imageHidden.removeAttribute('required');
      } else {
        customFields.classList.remove('hidden');
        autoNote.classList.add('hidden');
        if(titleInput) titleInput.setAttribute('required', 'required');
        if(descInput) descInput.setAttribute('required', 'required');
        if(imageHidden) imageHidden.setAttribute('required', 'required');
      }
    }
    
    document.querySelectorAll('input[name="previewMode"]').forEach(radio => {
      radio.addEventListener('change', togglePreviewMode);
    });
    
    async function uploadImage(file) {
      const fd = new FormData();
      fd.append('image', file);
      const statusDiv = document.getElementById('uploadStatus');
      statusDiv.classList.remove('hidden');
      statusDiv.innerHTML = '⏳ Uploading to Cloudinary...';
      statusDiv.className = 'text-sm mt-2 text-cyan-300';
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.url) {
          statusDiv.innerHTML = '✅ Uploaded!';
          statusDiv.className = 'text-green-300 text-sm mt-2';
          setTimeout(() => statusDiv.classList.add('hidden'), 1800);
          return data.url;
        }
      } catch(e) {
        statusDiv.innerHTML = '❌ Upload failed';
        statusDiv.className = 'text-red-300 text-sm mt-2';
        return null;
      }
    }
    
    window.selectImage = function(url) {
      selectedImage = url;
      document.getElementById('imageUrl').value = url;
      const galleryItems = document.querySelectorAll('#tabCreate .gallery-img');
      galleryItems.forEach(item => {
        item.classList.remove('border-2', 'border-cyan-400');
      });
      if(event && event.currentTarget) {
        event.currentTarget.classList.add('border-2', 'border-cyan-400');
      }
    };
    
    document.getElementById('newImage').onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const url = await uploadImage(file);
      if (url) {
        selectedImage = url;
        document.getElementById('imageUrl').value = url;
        const gallery = document.getElementById('tabCreate .gallery');
        const newDiv = document.createElement('div');
        newDiv.className = 'gallery-img cursor-pointer border-2 border-cyan-400 rounded-xl';
        newDiv.setAttribute('onclick', 'selectImage(\'' + url + '\')');
        newDiv.innerHTML = '<img src="' + url + '" class="w-full h-20 object-cover rounded-lg">';
        if(gallery) gallery.prepend(newDiv);
      }
      document.getElementById('newImage').value = '';
    };
    
    document.getElementById('shortenForm').onsubmit = async (e) => {
      e.preventDefault();
      const previewMode = document.querySelector('input[name="previewMode"]:checked').value;
      let imageUrl = '';
      
      if (previewMode === 'custom') {
        imageUrl = document.getElementById('imageUrl').value;
        if (!imageUrl) {
          alert('🖼️ Pehle image select karo ya upload karo');
          return;
        }
      }
      
      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: document.getElementById('destination').value,
          title: previewMode === 'custom' ? document.getElementById('title').value : '',
          description: previewMode === 'custom' ? document.getElementById('description').value : '',
          imageUrl: previewMode === 'custom' ? imageUrl : '',
          previewMode: previewMode
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.slug) {
          const shortUrl = window.location.origin + '/' + data.slug;
          document.getElementById('shortUrl').innerText = shortUrl;
          document.getElementById('result').classList.remove('hidden');
          setTimeout(() => location.reload(), 2000);
        }
      } else {
        alert('❌ Link save nahi hua, check fields');
      }
    };
    
    document.getElementById('bulkBtn').onclick = async () => {
      const prefix = document.getElementById('bulkPrefix').value || '';
      const destination = document.getElementById('destination').value;
      const previewMode = document.querySelector('input[name="previewMode"]:checked').value;
      let title = '', description = '', imageUrl = '';
      
      if (previewMode === 'custom') {
        title = document.getElementById('title').value;
        description = document.getElementById('description').value;
        imageUrl = document.getElementById('imageUrl').value;
        if (!destination || !title || !description || !imageUrl) {
          alert('❌ Pehle ek sample link banao (destination, title, description, image select karo)');
          return;
        }
      } else {
        if (!destination) {
          alert('❌ Pehle destination URL daalo');
          return;
        }
      }
      
      const btn = document.getElementById('bulkBtn');
      btn.innerHTML = '⏳ Generating 15 links...';
      btn.disabled = true;
      
      const res = await fetch('/api/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination, title, description, imageUrl, count: 15, prefix, previewMode })
      });
      const data = await res.json();
      
      if (data.slugs && data.slugs.length) {
        let listHtml = '';
        for (const slug of data.slugs) {
          listHtml += '<div class="bg-black/40 p-2 rounded-lg flex justify-between items-center"><code>' + window.location.origin + '/' + slug + '</code><button onclick="copyToClipboard(\'' + window.location.origin + '/' + slug + '\')" class="bg-gray-700 hover:bg-cyan-600 px-3 py-1 rounded-full text-xs">Copy</button></div>';
        }
        document.getElementById('bulkList').innerHTML = listHtml;
        document.getElementById('bulkResult').classList.remove('hidden');
        setTimeout(() => location.reload(), 3500);
      } else {
        alert('Bulk generation failed');
      }
      btn.innerHTML = '🔥 Generate 15 Short Links';
      btn.disabled = false;
    };
    
    window.copyToClipboard = function(text) {
      navigator.clipboard.writeText(text);
      alert('✅ Copied: ' + text);
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
        document.getElementById('tabCreateBtn').classList.remove('tab-inactive');
      } else if (tab === 'links') {
        document.getElementById('tabLinks').classList.remove('hidden');
        document.getElementById('tabLinksBtn').classList.add('tab-active');
        document.getElementById('tabLinksBtn').classList.remove('tab-inactive');
      } else if (tab === 'images') {
        document.getElementById('tabImages').classList.remove('hidden');
        document.getElementById('tabImagesBtn').classList.add('tab-active');
        document.getElementById('tabImagesBtn').classList.remove('tab-inactive');
      }
    };
    
    window.logout = async function() {
      await fetch('/api/logout');
      window.location.href = '/login';
    };
    
    // Initialize
    togglePreviewMode();
  </script>
</body>
</html>`);
  } catch(e) { return c.redirect('/login'); }
});

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
  if (!link) return c.text('404 — Link nahi mila', 404);
  
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
    return c.html(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta property="og:title" content="${escapeHtml(ogTitle)}" /><meta property="og:description" content="${escapeHtml(ogDescription)}" /><meta property="og:image" content="${escapeHtml(ogImage)}" /><meta property="og:url" content="${c.req.url}" /><meta property="og:type" content="website" /><meta name="twitter:card" content="summary_large_image" /><title>${escapeHtml(ogTitle)}</title></head><body style="background:#0a0f1c;color:#ccc;text-align:center;padding-top:3rem"><h2>${escapeHtml(ogTitle)}</h2><p>${escapeHtml(ogDescription)}</p>${ogImage ? '<img src="' + escapeHtml(ogImage) + '" style="max-width:320px;border-radius:24px;margin:20px auto"/>' : ''}<p>🔁 Redirecting...</p></body></html>`);
  }
  
  await c.env.DB.prepare('UPDATE short_links SET clicks = clicks + 1 WHERE slug = ?').bind(slug).run();
  return c.redirect(link.destination, 302);
});

app.get('/api/logout', async c => { deleteCookie(c, 'token'); return c.json({ success: true }); });

export default app;