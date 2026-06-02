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

// Escape helper function
function escapeHtml(str: string): string {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
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
</head>
<body class="bg-gradient-to-br from-purple-600 to-pink-500 min-h-screen flex items-center justify-center">
    <div class="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        <div class="text-center mb-8">
            <div class="text-6xl mb-4">🎭</div>
            <h1 class="text-3xl font-bold">URL Shortner</h1>
            <p class="text-gray-500 mt-2">(Sirf Admin ke liye)</p>
        </div>
        
        <form id="loginForm" class="space-y-4">
            <input type="text" id="username" placeholder="Username" class="w-full p-2 border rounded" required>
            <input type="password" id="password" placeholder="Password" class="w-full p-2 border rounded" required>
            <button type="submit" class="w-full bg-purple-600 text-white py-2 rounded">Login Karo</button>
        </form>
        
        <div class="mt-4 text-center">
            <button id="fakeRegisterBtn" class="text-gray-500 text-sm">🔒 Register? (Press kar)</button>
        </div>
        
        <div id="messageBox" class="mt-4 hidden">
            <div id="messageText" class="p-3 rounded-lg text-center"></div>
        </div>
    </div>
    
    <script>
        function showMessage(msg, isSuccess = false) {
            const box = document.getElementById('messageBox');
            const text = document.getElementById('messageText');
            text.innerHTML = msg;
            box.classList.remove('hidden');
            text.className = isSuccess ? 'bg-green-100 text-green-700 p-3 rounded-lg' : 'bg-red-100 text-red-700 p-3 rounded-lg';
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
    <title>Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100">
    <div class="container mx-auto p-6">
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-3xl font-bold">🎭 Dashboard</h1>
            <button onclick="logout()" class="bg-red-600 text-white px-4 py-2 rounded">Logout</button>
        </div>
        
        <div class="bg-white rounded-lg shadow p-6 mb-6">
            <h2 class="text-xl font-bold mb-4">🔗 Naya Link Banao</h2>
            <form id="shortenForm" class="space-y-4">
                <input type="url" id="destination" placeholder="Destination URL" class="w-full p-2 border rounded" required>
                <input type="text" id="title" placeholder="OG Title" class="w-full p-2 border rounded" required>
                <textarea id="description" placeholder="OG Description" class="w-full p-2 border rounded" rows="2" required></textarea>
                
                <div>
                    <label class="font-bold">🖼️ Image (Cloudinary)</label>
                    <input type="file" id="newImage" accept="image/*" class="w-full p-2 border rounded mt-1">
                    <div id="uploadStatus" class="text-sm mt-1 hidden"></div>
                    <div id="gallery" class="grid grid-cols-6 gap-2 mt-3">
                        ${images.map((img: any) => `<div class="cursor-pointer border-2 hover:border-blue-500 rounded" onclick="selectImage('${img.url}')"><img src="${img.url}" class="w-full h-20 object-cover rounded"></div>`).join('')}
                    </div>
                    <input type="hidden" id="imageUrl" required>
                </div>
                
                <button type="submit" class="bg-green-600 text-white px-6 py-2 rounded">Short Karo</button>
            </form>
            <div id="result" class="mt-4 hidden">
                <p class="font-bold">Short URL:</p>
                <code id="shortUrl" class="bg-gray-100 p-2 block rounded"></code>
            </div>
        </div>
        
        <div class="bg-white rounded-lg shadow p-6">
            <h2 class="text-xl font-bold mb-4">📊 Links</h2>
            ${links.length === 0 ? '<p>No links yet</p>' : links.map((link: any) => `<div class="border-b py-2"><code>/${link.slug}</code> - ${link.title} (${link.clicks} clicks)</div>`).join('')}
        </div>
    </div>
    
    <script>
        let selectedImage = '';
        
        async function uploadImage(file) {
            const formData = new FormData();
            formData.append('image', file);
            const statusDiv = document.getElementById('uploadStatus');
            statusDiv.classList.remove('hidden');
            statusDiv.innerHTML = 'Uploading...';
            statusDiv.className = 'text-sm mt-1 text-blue-600';
            try {
                const res = await fetch('/api/upload', { method: 'POST', body: formData });
                const data = await res.json();
                if (data.url) {
                    statusDiv.innerHTML = '✅ Uploaded!';
                    statusDiv.className = 'text-sm mt-1 text-green-600';
                    setTimeout(() => statusDiv.classList.add('hidden'), 2000);
                    return data.url;
                }
            } catch(e) {
                statusDiv.innerHTML = '❌ Failed';
                statusDiv.className = 'text-sm mt-1 text-red-600';
                return null;
            }
        }
        
        function selectImage(url) {
            selectedImage = url;
            document.getElementById('imageUrl').value = url;
            document.querySelectorAll('#gallery > div').forEach(div => {
                div.classList.remove('border-blue-500');
                div.classList.add('border-transparent');
            });
            event.currentTarget.classList.remove('border-transparent');
            event.currentTarget.classList.add('border-blue-500');
        }
        
        document.getElementById('newImage').onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                const url = await uploadImage(file);
                if (url) {
                    selectedImage = url;
                    document.getElementById('imageUrl').value = url;
                    const gallery = document.getElementById('gallery');
                    const newImg = document.createElement('div');
                    newImg.className = 'cursor-pointer border-2 border-blue-500 rounded';
                    newImg.onclick = () => selectImage(url);
                    newImg.innerHTML = '<img src="' + url + '" class="w-full h-20 object-cover rounded">';
                    gallery.insertBefore(newImg, gallery.firstChild);
                }
                document.getElementById('newImage').value = '';
            }
        };
        
        document.getElementById('shortenForm').onsubmit = async (e) => {
            e.preventDefault();
            const imageUrl = document.getElementById('imageUrl').value;
            if(!imageUrl) { 
                alert('Image select karo!');
                return; 
            }
            const res = await fetch('/api/shorten', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    destination: document.getElementById('destination').value,
                    title: document.getElementById('title').value,
                    description: document.getElementById('description').value,
                    imageUrl: imageUrl
                })
            });
            if (res.ok) {
                const data = await res.json();
                if(data.slug) {
                    document.getElementById('shortUrl').textContent = window.location.origin + '/' + data.slug;
                    document.getElementById('result').classList.remove('hidden');
                    setTimeout(() => location.reload(), 3000);
                }
            } else {
                alert('Error saving link!');
            }
        };
        
        async function logout() {
            await fetch('/api/logout');
            window.location.href = '/login';
        }
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
  const { destination, title, description, imageUrl } = await c.req.json();
  const slug = nanoid(8);
  await c.env.DB.prepare(`INSERT INTO short_links (id, slug, destination, title, description, image_url, clicks, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)`).bind(nanoid(), slug, destination, title, description, imageUrl, Date.now()).run();
  return c.json({ slug });
});

// FIXED: Better bot detection for Facebook Debugger
app.get('/:slug', async (c) => {
  const slug = c.req.param('slug');
  const userAgent = c.req.header('User-Agent') || '';
  
  // Improved bot detection - Facebook Debugger, bots, crawlers
  const isBot = /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|WhatsApp|curl|wget|python|bot|crawler|spider|scraper|facebook/i.test(userAgent);
  
  const link = await c.env.DB.prepare('SELECT * FROM short_links WHERE slug = ?').bind(slug).first();
  
  if (!link) {
    return c.text('404 - Link not found', 404);
  }
  
  // If bot → show OG meta tags page (NO redirect!)
  if (isBot) {
    return c.html(`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta property="og:title" content="${escapeHtml(link.title)}" />
    <meta property="og:description" content="${escapeHtml(link.description)}" />
    <meta property="og:image" content="${escapeHtml(link.image_url)}" />
    <meta property="og:url" content="${c.req.url}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="URL Shortner" />
    <meta name="twitter:card" content="summary_large_image" />
    <title>${escapeHtml(link.title)}</title>
</head>
<body>
    <h1>${escapeHtml(link.title)}</h1>
    <p>${escapeHtml(link.description)}</p>
    <img src="${escapeHtml(link.image_url)}" alt="Preview" style="max-width: 300px;" />
    <p>You will be redirected to <a href="${escapeHtml(link.destination)}">${escapeHtml(link.destination)}</a></p>
</body>
</html>`);
  }
  
  // Real users → 302 redirect
  await c.env.DB.prepare('UPDATE short_links SET clicks = clicks + 1 WHERE slug = ?').bind(slug).run();
  return c.redirect(link.destination, 302);
});

app.get('/api/logout', async (c) => {
  deleteCookie(c, 'token');
  return c.json({ success: true });
});

export default app;