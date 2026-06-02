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
  "🤡 Bhai sahi password daal!",
  "😏 Oye! Galat password!",
  "💀 Arey yaar! Password bhool gaya?"
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
<head><meta charset="UTF-8"><title>Login</title><script src="https://cdn.tailwindcss.com"></script>
<style>
body{background:radial-gradient(circle at top,#0a0f1e,#03050b);min-height:100vh}
.card{background:rgba(15,25,45,0.6);backdrop-filter:blur(14px);border:1px solid #0ff3;border-radius:32px}
input{background:#0a0f1c;border:1px solid #1e2a3e;border-radius:20px;padding:12px 20px;color:white;width:100%}
input:focus{border-color:#0ff;outline:none}
button{background:linear-gradient(95deg,#00c6ff,#0072ff);border-radius:40px;padding:12px;font-weight:bold;color:white;width:100%;cursor:pointer}
</style>
</head>
<body class="flex items-center justify-center p-5">
<div class="card p-8 w-full max-w-md"><div class="text-center mb-7"><div class="text-7xl mb-3">🎭</div><h1 class="text-4xl font-bold text-white">URL Shortner</h1><p class="text-cyan-300/60 text-sm">(Sirf Admin)</p></div>
<form id="loginForm"><input type="text" id="username" placeholder="Username" class="mb-4" required><input type="password" id="password" placeholder="Password" class="mb-4" required><button type="submit">Login Karo</button></form>
<div class="mt-5 text-center"><button id="fakeRegisterBtn" class="text-cyan-300/60 text-sm bg-transparent border-0 cursor-pointer">🔒 Register?</button></div>
<div id="msgBox" class="mt-4 hidden"><div id="msgText" class="p-3 rounded-xl text-center text-sm"></div></div></div>
<script>
function showMsg(msg,isOk){var b=document.getElementById('msgBox'),t=document.getElementById('msgText');t.innerHTML=msg;b.classList.remove('hidden');t.className=isOk?'bg-green-500/20 text-green-300 p-3 rounded-xl':'bg-red-500/20 text-red-300 p-3 rounded-xl';setTimeout(function(){b.classList.add('hidden');},3000);}
document.getElementById('loginForm').onsubmit=async function(e){e.preventDefault();var r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:document.getElementById('username').value,password:document.getElementById('password').value})});var d=await r.json();if(r.ok){showMsg(d.message,true);setTimeout(function(){window.location.href='/dashboard';},1000);}else{showMsg(d.message,false);}};
document.getElementById('fakeRegisterBtn').onclick=async function(){var r=await fetch('/api/fake-register');var d=await r.json();showMsg(d.message,false);};
</script>
</body></html>`);
});

app.get('/api/fake-register', async c => c.json({ message: registerMsgs[Math.floor(Math.random() * registerMsgs.length)] }));

app.post('/api/login', async c => {
  const { username, password } = await c.req.json();
  if (username === 'admin' && password === 'admin@9630') {
    setCookie(c, 'token', btoa(JSON.stringify({ id: 'admin', exp: Date.now() + 86400000 })), { httpOnly: true, maxAge: 86400, path: '/' });
    return c.json({ success: true, message: successMsgs[Math.floor(Math.random() * successMsgs.length)] });
  }
  return c.json({ message: wrongPassMsgs[Math.floor(Math.random() * wrongPassMsgs.length)] }, 401);
});

app.get('/dashboard', async c => {
  const token = getCookie(c, 'token');
  if (!token) return c.redirect('/login');
  try {
    JSON.parse(atob(token));
    let links = [], images = [];
    try {
      const lr = await c.env.DB.prepare('SELECT * FROM short_links ORDER BY created_at DESC LIMIT 100').all();
      links = lr.results || [];
      const ir = await c.env.DB.prepare('SELECT * FROM images ORDER BY created_at DESC').all();
      images = ir.results || [];
    } catch(e) {}

    let linksHtml = '';
    if (links.length === 0) {
      linksHtml = '<div class="text-center py-10 text-gray-400">✨ No links yet</div>';
    } else {
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        linksHtml += '<div class="bg-[#0a0f1c] border border-gray-800 rounded-xl p-3 mb-3"><div class="flex justify-between items-center flex-wrap gap-2"><div><code class="bg-black/50 px-2 py-0.5 rounded text-sm">/' + link.slug + '</code><div class="text-cyan-300/80 text-sm mt-1">' + escapeHtml(link.title || '') + '</div><div class="text-gray-500 text-xs">' + escapeHtml((link.destination || '').substring(0, 60)) + '</div>' + (link.preview_mode === 'auto' ? '<span class="text-purple-400 text-xs"> 🌐 Auto</span>' : '') + '</div><div class="flex gap-2 mt-2 sm:mt-0"><span class="bg-blue-500/20 px-2 py-0.5 rounded-full text-xs">👆 ' + link.clicks + '</span><button onclick="window.copyText(\'' + c.req.url.replace('/dashboard', '') + '/' + link.slug + '\')" class="bg-gray-700 hover:bg-cyan-600 px-2 py-0.5 rounded-full text-xs">Copy</button></div></div></div>';
      }
    }

    let imagesHtml = '';
    if (images.length === 0) {
      imagesHtml = '<div class="text-center py-10 text-gray-400">📸 No images yet</div>';
    } else {
      imagesHtml = '<div class="grid grid-cols-2 sm:grid-cols-4 gap-4">';
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        imagesHtml += '<div class="bg-black/40 rounded-xl p-2 border border-gray-800"><img src="' + img.url + '" class="w-full h-28 object-cover rounded-lg mb-2"><div class="text-xs text-gray-400 truncate">' + escapeHtml(img.filename || 'image') + '</div><button onclick="window.copyText(\'' + img.url + '\')" class="w-full mt-2 bg-gray-700 hover:bg-cyan-600 px-2 py-1 rounded-full text-xs">Copy URL</button></div>';
      }
      imagesHtml += '</div>';
    }

    let galleryHtml = '';
    for (let i = 0; i < Math.min(images.length, 12); i++) {
      const img = images[i];
      galleryHtml += '<div class="gallery-item" data-url="' + img.url + '"><img src="' + img.url + '"></div>';
    }

    if (galleryHtml === '') {
      galleryHtml = '<div class="text-gray-500 text-sm col-span-full">No images yet. Upload one!</div>';
    }

    return c.html(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Dashboard</title><script src="https://cdn.tailwindcss.com"></script>
<style>
body{background:#03050b}
.dark-card{background:rgba(10,18,30,0.95);border:1px solid rgba(0,200,255,0.15);border-radius:28px}
input,textarea{background:#0a0f1c;border:1px solid #1e2a3e;border-radius:18px;padding:10px 16px;color:white;width:100%}
input:focus,textarea:focus{border-color:#0ff;outline:none}
.btn-primary{background:linear-gradient(100deg,#00c6ff,#0072ff);border-radius:40px;padding:10px;font-weight:bold;color:white;width:100%;cursor:pointer;margin-top:10px}
.btn-secondary{background:#7c3aed;border-radius:40px;padding:10px;font-weight:bold;color:white;cursor:pointer}
.radio-group{background:#0a0f1c;border-radius:20px;padding:16px;border:1px solid #1e2a3e;margin-bottom:20px}
.tab-active{border-bottom:2px solid #0ff;color:#0ff;padding-bottom:8px;font-weight:600;cursor:pointer}
.tab-inactive{color:#8a9bb5;padding-bottom:8px;font-weight:500;cursor:pointer}
.badge{background:#0072ff20;border-radius:60px;padding:4px 14px;font-size:12px}
code{background:#00000060;padding:4px 12px;border-radius:40px;font-size:0.85rem;color:#aaf0ff}
.gallery-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-top:15px}
.gallery-item{cursor:pointer;border:2px solid transparent;border-radius:12px;transition:all 0.2s}
.gallery-item img{width:100%;height:80px;object-fit:cover;border-radius:12px}
.gallery-item:hover{border-color:#0ff;transform:scale(1.02)}
.gallery-item.selected{border-color:#0ff;box-shadow:0 0 10px #0ff}
</style>
</head>
<body class="text-gray-200">
<div class="max-w-5xl mx-auto px-4 py-6">
<div class="flex justify-between items-center mb-6"><h1 class="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">🎭 Sarcastic Shortner</h1><button onclick="window.logout()" class="bg-red-600/70 hover:bg-red-600 px-5 py-2 rounded-full text-sm">🚪 Logout</button></div>

<div class="flex gap-4 mb-6 border-b border-gray-800">
<button onclick="window.showTab('create')" id="tabCreateBtn" class="tab-active">✨ Create Link</button>
<button onclick="window.showTab('links')" id="tabLinksBtn" class="tab-inactive">📊 All Links</button>
<button onclick="window.showTab('images')" id="tabImagesBtn" class="tab-inactive">🖼️ Gallery</button>
</div>

<div id="tabCreate" class="dark-card p-6">
<h2 class="text-xl font-bold mb-4">✨ Naya Link Banao</h2>
<div class="radio-group"><p class="text-sm text-cyan-300/80 mb-2">🎯 Preview Mode:</p><div class="flex gap-6"><label class="flex items-center gap-2"><input type="radio" name="mode" value="custom" checked onchange="window.toggleMode()"> 🎨 Custom Preview</label><label class="flex items-center gap-2"><input type="radio" name="mode" value="auto" onchange="window.toggleMode()"> 🌐 Auto Preview (from Destination)</label></div></div>

<form id="shortenForm">
<input type="url" id="dest" placeholder="Destination URL" class="mb-3" required>
<div id="customFields">
<input type="text" id="title" placeholder="OG Title" class="mb-3" required>
<textarea id="desc" placeholder="OG Description" rows="2" class="mb-3" required></textarea>
<div><label class="text-cyan-300/80 text-sm">🖼️ Image</label><input type="file" id="imageFile" accept="image/*" class="mt-1"><div id="uploadStatus" class="text-sm mt-1 hidden"></div><div class="gallery-grid" id="gallery">${galleryHtml}</div><input type="hidden" id="imageUrl"></div>
</div>
<div id="autoNote" class="hidden bg-purple-900/30 border border-purple-500/30 rounded-xl p-3 text-sm mt-3"><p>🌐 Auto Preview Mode Active</p><p class="text-gray-400 text-xs">Facebook will see destination website's OG tags</p></div>
<button type="submit" class="btn-primary">🚀 Create Short Link</button>
</form>
<div id="result" class="mt-4 hidden p-4 bg-cyan-900/30 rounded-xl"><p class="font-semibold">🔗 Short URL:</p><code id="shortUrl" class="break-all block mt-1"></code></div>

<div class="mt-8 pt-5 border-t border-gray-800"><h3 class="font-semibold mb-3">⚡ Bulk Generate - 15 Links</h3><div class="flex gap-3"><input type="text" id="bulkPrefix" placeholder="Prefix" class="flex-1"><button type="button" id="bulkBtn" class="bg-purple-600/80 hover:bg-purple-600 px-5 py-2 rounded-full">🔥 Generate 15</button></div><div id="bulkResult" class="mt-3 hidden p-3 bg-cyan-900/30 rounded-xl max-h-60 overflow-y-auto"></div></div>
</div>

<div id="tabLinks" class="dark-card p-6 hidden"><div class="flex justify-between items-center mb-4"><h2 class="text-xl font-bold">📊 All Links</h2><span class="badge">Total: ${links.length}</span></div>${linksHtml}</div>

<div id="tabImages" class="dark-card p-6 hidden"><div class="flex justify-between items-center mb-4"><h2 class="text-xl font-bold">🖼️ Image Gallery</h2><span class="badge">Total: ${images.length}</span></div>${imagesHtml}</div>
</div>

<script>
var selectedImage = '';

window.toggleMode = function() {
  var isAuto = document.querySelector('input[name="mode"]:checked').value === 'auto';
  var customDiv = document.getElementById('customFields');
  var autoNote = document.getElementById('autoNote');
  var titleInput = document.getElementById('title');
  var descInput = document.getElementById('desc');
  var imageHidden = document.getElementById('imageUrl');
  
  if (isAuto) {
    customDiv.style.display = 'none';
    autoNote.style.display = 'block';
    if(titleInput) titleInput.removeAttribute('required');
    if(descInput) descInput.removeAttribute('required');
    if(imageHidden) imageHidden.removeAttribute('required');
  } else {
    customDiv.style.display = 'block';
    autoNote.style.display = 'none';
    if(titleInput) titleInput.setAttribute('required', 'required');
    if(descInput) descInput.setAttribute('required', 'required');
    if(imageHidden) imageHidden.setAttribute('required', 'required');
  }
};

window.selectImage = function(url) {
  selectedImage = url;
  document.getElementById('imageUrl').value = url;
  var items = document.querySelectorAll('#gallery .gallery-item');
  for(var i = 0; i < items.length; i++) {
    items[i].classList.remove('selected');
  }
  if(window.event && window.event.currentTarget) {
    window.event.currentTarget.classList.add('selected');
  }
};

// Attach click handlers to gallery items
function attachGalleryHandlers() {
  var items = document.querySelectorAll('#gallery .gallery-item');
  for(var i = 0; i < items.length; i++) {
    var url = items[i].getAttribute('data-url');
    if(url) {
      items[i].onclick = (function(u) {
        return function() { window.selectImage(u); };
      })(url);
    }
  }
}

document.getElementById('imageFile').onchange = async function(e) {
  var file = e.target.files[0];
  if (!file) return;
  var fd = new FormData();
  fd.append('image', file);
  var status = document.getElementById('uploadStatus');
  status.classList.remove('hidden');
  status.innerHTML = '⏳ Uploading...';
  status.className = 'text-sm mt-1 text-cyan-300';
  try {
    var res = await fetch('/api/upload', { method: 'POST', body: fd });
    var data = await res.json();
    if (data.url) {
      status.innerHTML = '✅ Uploaded!';
      status.className = 'text-sm mt-1 text-green-300';
      selectedImage = data.url;
      document.getElementById('imageUrl').value = data.url;
      setTimeout(function() { status.classList.add('hidden'); }, 1500);
      setTimeout(function() { location.reload(); }, 1000);
    }
  } catch(err) {
    status.innerHTML = '❌ Failed';
    status.className = 'text-sm mt-1 text-red-300';
  }
};

document.getElementById('shortenForm').onsubmit = async function(e) {
  e.preventDefault();
  var mode = document.querySelector('input[name="mode"]:checked').value;
  var dest = document.getElementById('dest').value;
  var title = '', desc = '', imgUrl = '';
  
  if (mode === 'custom') {
    title = document.getElementById('title').value;
    desc = document.getElementById('desc').value;
    imgUrl = document.getElementById('imageUrl').value;
    if (!title || !desc || !imgUrl) {
      alert('📸 Please select an image and fill title/description!');
      return;
    }
  }
  
  var res = await fetch('/api/shorten', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination: dest, title: title, description: desc, imageUrl: imgUrl, previewMode: mode })
  });
  var data = await res.json();
  if (data.slug) {
    document.getElementById('shortUrl').innerText = window.location.origin + '/' + data.slug;
    document.getElementById('result').classList.remove('hidden');
    setTimeout(function() { location.reload(); }, 2000);
  } else {
    alert('❌ Link save nahi hua!');
  }
};

document.getElementById('bulkBtn').onclick = async function() {
  var mode = document.querySelector('input[name="mode"]:checked').value;
  var dest = document.getElementById('dest').value;
  var prefix = document.getElementById('bulkPrefix').value || '';
  var title = '', desc = '', imgUrl = '';
  
  if (mode === 'custom') {
    title = document.getElementById('title').value;
    desc = document.getElementById('desc').value;
    imgUrl = document.getElementById('imageUrl').value;
    if (!dest || !title || !desc || !imgUrl) {
      alert('❌ Fill all fields first!');
      return;
    }
  } else if (!dest) {
    alert('❌ Enter destination URL!');
    return;
  }
  
  var btn = document.getElementById('bulkBtn');
  btn.innerHTML = '⏳ Generating...';
  btn.disabled = true;
  
  var res = await fetch('/api/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination: dest, title: title, description: desc, imageUrl: imgUrl, count: 15, prefix: prefix, previewMode: mode })
  });
  var data = await res.json();
  
  if (data.slugs && data.slugs.length) {
    var html = '<p class="font-semibold mb-2">✅ 15 Links Generated:</p>';
    for (var i = 0; i < data.slugs.length; i++) {
      var s = data.slugs[i];
      html += '<div class="bg-black/40 p-2 rounded-lg mb-1 flex justify-between items-center"><code>' + window.location.origin + '/' + s + '</code><button onclick="window.copyText(\'' + window.location.origin + '/' + s + '\')" class="bg-gray-700 hover:bg-cyan-600 px-2 py-1 rounded text-xs">📋 Copy</button></div>';
    }
    document.getElementById('bulkList').innerHTML = html;
    document.getElementById('bulkResult').classList.remove('hidden');
    setTimeout(function() { location.reload(); }, 3000);
  }
  btn.innerHTML = '🔥 Generate 15';
  btn.disabled = false;
};

window.copyText = function(text) {
  navigator.clipboard.writeText(text);
  alert('✅ Copied: ' + text);
};

window.showTab = function(tab) {
  var createTab = document.getElementById('tabCreate');
  var linksTab = document.getElementById('tabLinks');
  var imagesTab = document.getElementById('tabImages');
  var createBtn = document.getElementById('tabCreateBtn');
  var linksBtn = document.getElementById('tabLinksBtn');
  var imagesBtn = document.getElementById('tabImagesBtn');
  
  createTab.classList.add('hidden');
  linksTab.classList.add('hidden');
  imagesTab.classList.add('hidden');
  createBtn.classList.remove('tab-active');
  linksBtn.classList.remove('tab-active');
  imagesBtn.classList.remove('tab-active');
  createBtn.classList.add('tab-inactive');
  linksBtn.classList.add('tab-inactive');
  imagesBtn.classList.add('tab-inactive');
  
  if (tab === 'create') {
    createTab.classList.remove('hidden');
    createBtn.classList.add('tab-active');
    createBtn.classList.remove('tab-inactive');
  } else if (tab === 'links') {
    linksTab.classList.remove('hidden');
    linksBtn.classList.add('tab-active');
    linksBtn.classList.remove('tab-inactive');
  } else if (tab === 'images') {
    imagesTab.classList.remove('hidden');
    imagesBtn.classList.add('tab-active');
    imagesBtn.classList.remove('tab-inactive');
  }
};

window.logout = async function() {
  await fetch('/api/logout');
  window.location.href = '/login';
};

// Initialize
window.toggleMode();
attachGalleryHandlers();
</script>
</body></html>`);
  } catch(e) {
    return c.redirect('/login');
  }
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
    return c.html(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta property="og:title" content="${escapeHtml(ogTitle)}" /><meta property="og:description" content="${escapeHtml(ogDescription)}" /><meta property="og:image" content="${escapeHtml(ogImage)}" /><meta property="og:url" content="${c.req.url}" /><meta property="og:type" content="website" /><title>${escapeHtml(ogTitle)}</title></head><body style="background:#0a0f1c;color:#ccc;text-align:center;padding:3rem"><h2>${escapeHtml(ogTitle)}</h2><p>${escapeHtml(ogDescription)}</p>${ogImage ? '<img src="' + escapeHtml(ogImage) + '" style="max-width:300px;border-radius:20px;margin:20px auto"/>' : ''}<p>Redirecting...</p></body></html>`);
  }
  
  await c.env.DB.prepare('UPDATE short_links SET clicks = clicks + 1 WHERE slug = ?').bind(slug).run();
  return c.redirect(link.destination, 302);
});

app.get('/api/logout', async c => { deleteCookie(c, 'token'); return c.json({ success: true }); });

export default app;