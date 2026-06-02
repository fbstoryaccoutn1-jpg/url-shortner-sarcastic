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
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

// Helper to fetch OG tags
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

app.get('/', async (c) => {
  return c.redirect('/login');
});

app.get('/login', async (c) => {
  return c.html(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Sarcastic URL Shortner</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background: radial-gradient(circle at top, #0a0f1e, #03050b); }
        .glass-card { background: rgba(15, 25, 45, 0.6); backdrop-filter: blur(14px); border: 1px solid rgba(0, 255, 255, 0.2); border-radius: 32px; }
        .glow-input { background: #0a0f1c; border: 1px solid #1e2a3e; border-radius: 20px; transition: all 0.2s; color: white; }
        .glow-input:focus { border-color: #0ff; box-shadow: 0 0 10px #0ff; outline: none; }
        .btn-glow { background: linear-gradient(95deg, #00c6ff, #0072ff); border-radius: 40px; transition: all 0.2s; }
        .btn-glow:hover { transform: scale(1.02); }
    </style>
</head>
<body class="flex items-center justify-center p-5">
    <div class="glass-card p-8 w-full max-w-md">
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
        
        <div id="messageBox" class="mt-4 hidden">
            <div id="messageText" class="p-3 rounded-xl text-center text-sm"></div>
        </div>
    </div>
    
    <script>
        function showMessage(msg, isSuccess) {
            const box = document.getElementById('messageBox');
            const text = document.getElementById('messageText');
            text.innerHTML = msg;
            box.classList.remove('hidden');
            text.className = isSuccess ? 'bg-green-500/20 text-green-300 p-3 rounded-xl' : 'bg-red-500/20 text-red-300 p-3 rounded-xl';
            setTimeout(() => box.classList.add('hidden'), 3000);
        }
        
        document.getElementById('loginForm').onsubmit = async (e) => {
            e.preventDefault();
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: document.getElementById('username').value,
                    password: document.getElementById('password').value
                })
            });
            const data = await res.json();
            if (res.ok) {
                showMessage(data.message, true);
                setTimeout(() => window.location.href = '/dashboard', 1000);
            } else {
                showMessage(data.message, false);
            }
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

app.get('/dashboard', async (c) => {
  const token = getCookie(c, 'token');
  if (!token) return c.redirect('/login');
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) throw new Error('Expired');
    let links = [], images = [];
    try {
      const linksResult = await c.env.DB.prepare('SELECT * FROM short_links ORDER BY created_at DESC LIMIT 50').all();
      links = linksResult.results || [];
      const imagesResult = await c.env.DB.prepare('SELECT * FROM images ORDER BY created_at DESC').all();
      images = imagesResult.results || [];
    } catch(e) {}
    
    return c.html(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Dashboard - Sarcastic URL Shortner</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { background: #03050b; font-family: 'Inter', sans-serif; }
        .dark-card { background: rgba(10, 18, 30, 0.95); backdrop-filter: blur(10px); border: 1px solid rgba(0, 200, 255, 0.15); border-radius: 28px; }
        .glow-input { background: #0a0f1c; border: 1px solid #1e2a3e; border-radius: 18px; transition: all 0.2s; color: white; padding: 12px 16px; width: 100%; }
        .glow-input:focus { border-color: #0ff; box-shadow: 0 0 8px #0ff; outline: none; }
        .glow-textarea { background: #0a0f1c; border: 1px solid #1e2a3e; border-radius: 18px; transition: all 0.2s; color: white; padding: 12px 16px; width: 100%; }
        .glow-textarea:focus { border-color: #0ff; box-shadow: 0 0 8px #0ff; outline: none; }
        .btn-primary { background: linear-gradient(100deg, #00c6ff, #0072ff); border-radius: 40px; padding: 12px 24px; font-weight: 600; transition: 0.2s; cursor: pointer; border: none; color: white; width: 100%; }
        .btn-primary:hover { transform: scale(0.98); }
        .btn-secondary { background: #7c3aed; border-radius: 40px; padding: 12px 24px; font-weight: 600; cursor: pointer; color: white; width: 100%; }
        .btn-secondary:hover { background: #6d28d9; }
        .radio-group { background: #0a0f1c; border-radius: 20px; padding: 16px; border: 1px solid #1e2a3e; }
        .link-row { background: #0a0f1c; border: 1px solid #1e2a40; border-radius: 20px; padding: 16px; margin-bottom: 12px; transition: 0.15s; }
        .link-row:hover { border-color: #0ff; background: #0e1625; }
        code { background: #00000060; padding: 4px 12px; border-radius: 40px; font-size: 0.85rem; color: #aaf0ff; }
        .badge { background: #0072ff20; border-radius: 60px; padding: 4px 14px; font-size: 12px; color: #7bc5ff; }
        .copy-btn { background: #1e2a3e; border-radius: 30px; padding: 6px 14px; font-size: 12px; transition: 0.1s; cursor: pointer; display: inline-block; }
        .copy-btn:hover { background: #0ff; color: #000; }
        .gallery-img { cursor: pointer; border: 2px solid transparent; border-radius: 12px; transition: 0.2s; }
        .gallery-img:hover { border-color: #0ff; transform: scale(1.02); }
        .gallery-img img { width: 100%; height: 80px; object-fit: cover; border-radius: 12px; }
        .tab-active { border-bottom: 2px solid #0ff; color: #0ff; padding-bottom: 8px; font-weight: 600; cursor: pointer; }
        .tab-inactive { color: #8a9bb5; padding-bottom: 8px; font-weight: 500; cursor: pointer; }
    </style>
</head>
<body class="text-gray-200">
    <div class="max-w-6xl mx-auto px-5 py-7">
        <!-- Header -->
        <div class="flex justify-between items-center mb-8">
            <div>
                <h1 class="text-3xl font-extrabold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">🎭 Sarcastic Shortner</h1>
                <p class="text-cyan-300/50 text-xs mt-1">pro dashboard — sarcasm guaranteed</p>
            </div>
            <button onclick="logout()" class="bg-rose-600/70 hover:bg-rose-600 px-6 py-2.5 rounded-full text-sm font-medium transition">🚪 Logout</button>
        </div>

        <!-- Tabs -->
        <div class="flex gap-6 mb-7 border-b border-gray-800">
            <button onclick="showTab('create')" id="tabCreateBtn" class="tab-active">✨ Create Link</button>
            <button onclick="showTab('links')" id="tabLinksBtn" class="tab-inactive">📊 All Links</button>
            <button onclick="showTab('images')" id="tabImagesBtn" class="tab-inactive">🖼️ Gallery</button>
        </div>

        <!-- Tab 1: Create -->
        <div id="tabCreate" class="dark-card p-7">
            <h2 class="text-2xl font-bold mb-6">✨ Naya Link Banao</h2>
            
            <!-- Preview Mode Selection -->
            <div class="radio-group mb-6">
                <p class="text-sm text-cyan-300/80 mb-3">🎯 Preview Mode (Airbridge Style):</p>
                <div class="flex flex-col sm:flex-row gap-4">
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="previewMode" value="custom" checked class="w-4 h-4 accent-cyan-500"> 
                        <span>🎨 Custom Preview <span class="text-gray-400 text-xs">(use my title, description, image)</span></span>
                    </label>
                    <label class="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="previewMode" value="auto" class="w-4 h-4 accent-purple-500"> 
                        <span>🌐 Auto Preview <span class="text-gray-400 text-xs">(fetch OG tags from destination website)</span></span>
                    </label>
                </div>
            </div>

            <form id="shortenForm" class="space-y-5">
                <input type="url" id="destination" placeholder="Destination URL" class="glow-input" required>
                
                <div id="customFields">
                    <input type="text" id="title" placeholder="OG Title (Facebook Preview)" class="glow-input mb-4" required>
                    <textarea id="description" placeholder="OG Description" rows="2" class="glow-textarea mb-4" required></textarea>
                    
                    <div>
                        <label class="text-cyan-300/80 text-sm mb-2 block">🖼️ Image (Cloudinary)</label>
                        <input type="file" id="newImage" accept="image/*" class="glow-input">
                        <div id="uploadStatus" class="text-sm mt-2 hidden"></div>
                        <div id="gallery" class="grid grid-cols-6 gap-2 mt-4">
                            ${images.map((img: any) => `<div class="gallery-img" onclick="selectImage('${img.url}')"><img src="${img.url}"></div>`).join('')}
                        </div>
                        <input type="hidden" id="imageUrl">
                    </div>
                </div>
                
                <div id="autoNote" class="hidden bg-purple-900/30 border border-purple-500/30 rounded-xl p-4 text-sm">
                    <p class="text-purple-300">🌐 Auto Preview Mode Active</p>
                    <p class="text-gray-400 text-xs mt-1">Facebook bot will see destination website's OG tags</p>
                    <p class="text-gray-500 text-xs">Canonical URL will still be your short link (like Airbridge)</p>
                    <p class="text-yellow-400 text-xs mt-2">⚠️ Title, Description, Image fields are NOT required in this mode</p>
                </div>
                
                <button type="submit" class="btn-primary">🚀 Create Short Link</button>
            </form>
            
            <div id="result" class="mt-6 hidden p-5 rounded-2xl bg-cyan-900/30 border border-cyan-400/50">
                <p class="font-semibold">🔗 Your Short URL:</p>
                <code id="shortUrl" class="break-all block mt-2"></code>
            </div>

            <!-- Bulk Generate -->
            <div class="mt-8 pt-6 border-t border-gray-800">
                <h3 class="text-lg font-semibold mb-4">⚡ Bulk Generate — 15 Links (1 Click)</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" id="bulkPrefix" placeholder="Prefix (optional)" class="glow-input">
                    <button type="button" id="bulkBtn" class="bg-purple-600/80 hover:bg-purple-600 py-3 rounded-xl font-medium transition">🔥 Generate 15 Short Links</button>
                </div>
                <div id="bulkResult" class="mt-4 hidden p-4 rounded-2xl bg-cyan-900/30 border border-cyan-400/50 max-h-64 overflow-y-auto">
                    <p class="font-semibold mb-2">✅ 15 Links Generated:</p>
                    <div id="bulkList" class="space-y-2 text-sm"></div>
                </div>
            </div>
        </div>

        <!-- Tab 2: Links -->
        <div id="tabLinks" class="dark-card p-7 hidden">
            <div class="flex justify-between items-center mb-5">
                <h2 class="text-2xl font-bold">📊 All Short Links</h2>
                <span class="badge">Total: ${links.length}</span>
            </div>
            ${links.length === 0 ? '<div class="text-center py-12 text-gray-400 border border-dashed border-gray-700 rounded-2xl">✨ No links yet. Create your first link ✨</div>' : 
                links.map((link: any) => `
                    <div class="link-row">
                        <div class="flex flex-wrap justify-between items-center gap-3">
                            <div class="flex-1">
                                <code>/${link.slug}</code>
                                <div class="text-cyan-300/80 text-sm mt-1">${escapeHtml(link.title || '')}</div>
                                <div class="text-gray-500 text-xs truncate">${escapeHtml(link.destination || '')}</div>
                                ${link.preview_mode === 'auto' ? '<span class="text-purple-400 text-xs mt-1 inline-block">🌐 Auto Preview Mode</span>' : ''}
                            </div>
                            <div class="flex items-center gap-3">
                                <span class="badge">👆 ${link.clicks} clicks</span>
                                <div class="copy-btn" onclick="copyText('${c.req.url.replace('/dashboard', '')}/${link.slug}')">📋 Copy</div>
                            </div>
                        </div>
                    </div>
                `).join('')
            }
        </div>

        <!-- Tab 3: Images -->
        <div id="tabImages" class="dark-card p-7 hidden">
            <div class="flex justify-between items-center mb-5">
                <h2 class="text-2xl font-bold">🖼️ Image Gallery</h2>
                <span class="badge">Total: ${images.length}</span>
            </div>
            ${images.length === 0 ? '<div class="text-center py-12 text-gray-400 border border-dashed border-gray-700 rounded-2xl">📸 No images uploaded yet. Upload from Create tab.</div>' :
                `<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[550px] overflow-y-auto p-2">
                    ${images.map((img: any) => `
                        <div class="bg-black/40 rounded-xl p-3 border border-gray-800 hover:border-cyan-400 transition">
                            <img src="${img.url}" class="w-full h-32 object-cover rounded-lg mb-2">
                            <div class="text-xs text-gray-400 truncate">${escapeHtml(img.filename || 'image')}</div>
                            <div class="copy-btn text-center mt-2 w-full" onclick="copyText('${img.url}')">📋 Copy Image URL</div>
                        </div>
                    `).join('')}
                </div>`
            }
        </div>
    </div>

    <script>
        let selectedImage = '';
        
        // Toggle preview mode
        function togglePreviewMode() {
            const isAuto = document.querySelector('input[name="previewMode"]:checked').value === 'auto';
            const customFields = document.getElementById('customFields');
            const autoNote = document.getElementById('autoNote');
            const titleInput = document.getElementById('title');
            const descInput = document.getElementById('description');
            const imageHidden = document.getElementById('imageUrl');
            
            if (isAuto) {
                customFields.style.display = 'none';
                autoNote.style.display = 'block';
                if(titleInput) titleInput.removeAttribute('required');
                if(descInput) descInput.removeAttribute('required');
                if(imageHidden) imageHidden.removeAttribute('required');
            } else {
                customFields.style.display = 'block';
                autoNote.style.display = 'none';
                if(titleInput) titleInput.setAttribute('required', 'required');
                if(descInput) descInput.setAttribute('required', 'required');
                if(imageHidden) imageHidden.setAttribute('required', 'required');
            }
        }
        
        document.querySelectorAll('input[name="previewMode"]').forEach(r => r.addEventListener('change', togglePreviewMode));
        
        async function uploadImage(file) {
            const formData = new FormData();
            formData.append('image', file);
            const statusDiv = document.getElementById('uploadStatus');
            statusDiv.classList.remove('hidden');
            statusDiv.innerHTML = '⏳ Uploading to Cloudinary...';
            statusDiv.className = 'text-sm mt-2 text-cyan-300';
            try {
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.url) {
                    statusDiv.innerHTML = '✅ Uploaded!';
                    statusDiv.className = 'text-sm mt-2 text-green-300';
                    setTimeout(() => statusDiv.classList.add('hidden'), 1500);
                    return data.url;
                }
            } catch(e) {
                statusDiv.innerHTML = '❌ Upload failed';
                statusDiv.className = 'text-sm mt-2 text-red-300';
                return null;
            }
        }
        
        function selectImage(url) {
            selectedImage = url;
            document.getElementById('imageUrl').value = url;
            const galleryItems = document.querySelectorAll('#gallery > div');
            galleryItems.forEach(item => item.classList.remove('border-cyan-400', 'border-2'));
            if(event && event.currentTarget) {
                event.currentTarget.classList.add('border-cyan-400', 'border-2');
            }
        }
        
        document.getElementById('newImage').onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                const url = await uploadImage(file);
                if (url) {
                    selectedImage = url;
                    document.getElementById('imageUrl').value = url;
                    const gallery = document.getElementById('gallery');
                    const newDiv = document.createElement('div');
                    newDiv.className = 'gallery-img';
                    newDiv.setAttribute('onclick', 'selectImage(\'' + url + '\')');
                    newDiv.innerHTML = '<img src="' + url + '">';
                    if(gallery) gallery.prepend(newDiv);
                }
                document.getElementById('newImage').value = '';
            }
        };
        
        document.getElementById('shortenForm').onsubmit = async (e) => {
            e.preventDefault();
            const previewMode = document.querySelector('input[name="previewMode"]:checked').value;
            const destination = document.getElementById('destination').value;
            let title = '', description = '', imageUrl = '';
            
            if (previewMode === 'custom') {
                title = document.getElementById('title').value;
                description = document.getElementById('description').value;
                imageUrl = document.getElementById('imageUrl').value;
                if (!title || !description || !imageUrl) {
                    alert('📸 Bhai image select kar! Bina image ke link kaise banega?');
                    return;
                }
            }
            
            const res = await fetch('/api/shorten', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destination: destination,
                    title: title,
                    description: description,
                    imageUrl: imageUrl,
                    previewMode: previewMode
                })
            });
            
            if (res.ok) {
                const data = await res.json();
                if(data.slug) {
                    document.getElementById('shortUrl').textContent = window.location.origin + '/' + data.slug;
                    document.getElementById('result').classList.remove('hidden');
                    setTimeout(() => location.reload(), 2000);
                }
            } else {
                alert('❌ Link save nahi hua!');
            }
        };
        
        // Bulk Generate
        document.getElementById('bulkBtn').onclick = async () => {
            const previewMode = document.querySelector('input[name="previewMode"]:checked').value;
            const destination = document.getElementById('destination').value;
            const prefix = document.getElementById('bulkPrefix').value || '';
            let title = '', description = '', imageUrl = '';
            
            if (previewMode === 'custom') {
                title = document.getElementById('title').value;
                description = document.getElementById('description').value;
                imageUrl = document.getElementById('imageUrl').value;
                if (!destination || !title || !description || !imageUrl) {
                    alert('❌ Pehle saare fields bharo (destination, title, description, image)');
                    return;
                }
            } else if (!destination) {
                alert('❌ Pehle destination URL daalo!');
                return;
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
                let html = '';
                for (const slug of data.slugs) {
                    html += '<div class="bg-black/40 p-2 rounded-lg mb-1 flex justify-between items-center"><code>' + window.location.origin + '/' + slug + '</code><button onclick="copyText(\'' + window.location.origin + '/' + slug + '\')" class="bg-gray-700 hover:bg-cyan-600 px-2 py-1 rounded text-xs">📋 Copy</button></div>';
                }
                document.getElementById('bulkList').innerHTML = html;
                document.getElementById('bulkResult').classList.remove('hidden');
                setTimeout(() => location.reload(), 3000);
            }
            btn.innerHTML = '🔥 Generate 15 Short Links';
            btn.disabled = false;
        };
        
        function copyText(text) {
            navigator.clipboard.writeText(text);
            alert('✅ Copied: ' + text);
        }
        
        function showTab(tab) {
            document.getElementById('tabCreate').classList.add('hidden');
            document.getElementById('tabLinks').classList.add('hidden');
            document.getElementById('tabImages').classList.add('hidden');
            document.getElementById('tabCreateBtn').classList.remove('tab-active');
            document.getElementById('tabLinksBtn').classList.remove('tab-active');
            document.getElementById('tabImagesBtn').classList.remove('tab-active');
            document.getElementById('tabCreateBtn').classList.add('tab-inactive');
            document.getElementById('tabLinksBtn').classList.add('tab-inactive');
            document.getElementById('tabImagesBtn').classList.add('tab-inactive');
            
            if(tab === 'create') {
                document.getElementById('tabCreate').classList.remove('hidden');
                document.getElementById('tabCreateBtn').classList.add('tab-active');
                document.getElementById('tabCreateBtn').classList.remove('tab-inactive');
            } else if(tab === 'links') {
                document.getElementById('tabLinks').classList.remove('hidden');
                document.getElementById('tabLinksBtn').classList.add('tab-active');
                document.getElementById('tabLinksBtn').classList.remove('tab-inactive');
            } else if(tab === 'images') {
                document.getElementById('tabImages').classList.remove('hidden');
                document.getElementById('tabImagesBtn').classList.add('tab-active');
                document.getElementById('tabImagesBtn').classList.remove('tab-inactive');
            }
        }
        
        async function logout() {
            await fetch('/api/logout');
            window.location.href = '/login';
        }
        
        // Initialize
        togglePreviewMode();
    </script>
</body>
</html>`);
  } catch(e) {
    return c.redirect('/login');
  }
});

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
    method: 'POST',
    body: cloudFormData
  });
  const cloudData = await cloudRes.json();
  await c.env.DB.prepare(`INSERT INTO images (id, url, filename, size, created_at) VALUES (?, ?, ?, ?, ?)`).bind(nanoid(), cloudData.secure_url, file.name, file.size, Date.now()).run();
  return c.json({ url: cloudData.secure_url });
});

app.post('/api/shorten', async (c) => {
  const token = getCookie(c, 'token');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  const { destination, title, description, imageUrl, previewMode } = await c.req.json();
  const slug = nanoid(8);
  const mode = previewMode || 'custom';
  await c.env.DB.prepare(`INSERT INTO short_links (id, slug, destination, title, description, image_url, clicks, created_at, preview_mode) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`).bind(nanoid(), slug, destination, title || '', description || '', imageUrl || '', Date.now(), mode).run();
  return c.json({ slug });
});

app.post('/api/bulk', async (c) => {
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

// Redirect with OG Tags
app.get('/:slug', async (c) => {
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
    return c.html(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta property="og:title" content="${escapeHtml(ogTitle)}" /><meta property="og:description" content="${escapeHtml(ogDescription)}" /><meta property="og:image" content="${escapeHtml(ogImage)}" /><meta property="og:url" content="${c.req.url}" /><meta property="og:type" content="website" /><title>${escapeHtml(ogTitle)}</title></head><body style="background:#0a0f1c;color:#ccc;text-align:center;padding:3rem"><h2>${escapeHtml(ogTitle)}</h2><p>${escapeHtml(ogDescription)}</p>${ogImage ? '<img src="' + escapeHtml(ogImage) + '" style="max-width:300px;border-radius:20px;margin:20px auto"/>' : ''}<p>Redirecting...</p></body></html>`);
  }
  
  await c.env.DB.prepare('UPDATE short_links SET clicks = clicks + 1 WHERE slug = ?').bind(slug).run();
  return c.redirect(link.destination, 302);
});

app.get('/api/logout', async (c) => {
  deleteCookie(c, 'token');
  return c.json({ success: true });
});

export default app;