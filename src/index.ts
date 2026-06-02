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
<head><meta charset="UTF-8"><title>Sarcastic URL Shortner</title><script src="https://cdn.tailwindcss.com"></script>
<style>
body{background:radial-gradient(circle at top,#0a0f1e,#03050b);min-height:100vh}
.card{background:rgba(15,25,45,0.6);backdrop-filter:blur(14px);border:1px solid #0ff3;border-radius:32px}
input{background:#0a0f1c;border:1px solid #1e2a3e;border-radius:20px;padding:12px 20px;color:white;width:100%}
input:focus{border-color:#0ff;outline:none}
button{background:linear-gradient(95deg,#00c6ff,#0072ff);border-radius:40px;padding:12px;font-weight:bold;color:white;width:100%;cursor:pointer}
</style>
</head>
<body class="flex items-center justify-center p-5">
<div class="card p-8 w-full max-w-md"><div class="text-center mb-7"><div class="text-7xl mb-3">🎭</div><h1 class="text-4xl font-bold text-white">URL Shortner</h1><p class="text-cyan-300/60 text-sm">(Sirf Admin — Sarcasm Mode On)</p></div>
<form id="loginForm" class="space-y-5"><input type="text" id="username" placeholder="Username" required><input type="password" id="password" placeholder="Password" required><button type="submit">Login Karo</button></form>
<div class="mt-5 text-center"><button id="fakeRegisterBtn" class="text-cyan-300/60 text-sm bg-transparent shadow-none">🔒 Register? (Press kar)</button></div>
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
      linksHtml = '<div class="text-center py-12 text-gray-400 border border-dashed border-gray-700 rounded-2xl">✨ No links yet. Create your first link ✨</div>';
    } else {
      for (let i = 0; i < links.length; i++) {
        const link = links[i];
        linksHtml += '<div class="bg-[#0a0f1c] border border-gray-800 rounded-xl p-4 mb-3"><div class="flex flex-wrap justify-between items-center gap-3"><div class="flex-1"><code class="bg-black/50 px-2 py-0.5 rounded text-sm text-cyan-300">/' + link.slug + '</code><div class="text-cyan-300/80 text-sm mt-1">' + escapeHtml(link.title || '') + '</div><div class="text-gray-500 text-xs truncate">' + escapeHtml(link.destination || '') + '</div>' + (link.preview_mode === 'auto' ? '<span class="text-purple-400 text-xs mt-1 inline-block">🌐 Auto Preview Mode</span>' : '') + '</div><div class="flex items-center gap-3"><span class="bg-blue-500/20 px-2 py-0.5 rounded-full text-xs">👆 ' + link.clicks + ' clicks</span><button onclick="copyText(\'' + c.req.url.replace('/dashboard', '') + '/' + link.slug + '\')" class="bg-gray-700 hover:bg-cyan-600 px-2 py-0.5 rounded-full text-xs">📋 Copy</button></div></div></div>';
      }
    }

    let imagesHtml = '';
    if (images.length === 0) {
      imagesHtml = '<div class="text-center py-12 text-gray-400 border border-dashed border-gray-700 rounded-2xl">📸 No images uploaded yet. Upload from Create tab.</div>';
    } else {
      imagesHtml = '<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[550px] overflow-y-auto p-2">';
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        imagesHtml += '<div class="bg-black/40 rounded-xl p-3 border border-gray-800 hover:border-cyan-400 transition"><img src="' + img.url + '" class="w-full h-32 object-cover rounded-lg mb-2"><div class="text-xs text-gray-400 truncate">' + escapeHtml(img.filename || 'image') + '</div><button onclick="copyText(\'' + img.url + '\')" class="copy-btn w-full mt-2 bg-gray-700 hover:bg-cyan-600 px-2 py-1 rounded-full text-xs">📋 Copy URL</button></div>';
      }
      imagesHtml += '</div>';
    }

    let galleryHtml = '';
    for (let i = 0; i < Math.min(images.length, 12); i++) {
      const img = images[i];
      galleryHtml += '<div class="gallery-img cursor-pointer border-2 border-transparent rounded-lg hover:border-cyan-400" onclick="selectImage(\'' + img.url + '\')"><img src="' + img.url + '" class="w-full h-16 object-cover rounded-lg"></div>';
    }

    return c.html(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Sarcastic Dashboard</title><script src="https://cdn.tailwindcss.com"></script>
<style>
body{background:#03050b;font-family:'Inter',sans-serif}
.dark-card{background:rgba(10,18,30,0.95);border:1px solid rgba(0,200,255,0.15);border-radius:28px}
input,textarea{background:#0a0f1c;border:1px solid #1e2a3e;border-radius:18px;padding:12px 16px;color:white;width:100%}
input:focus,textarea:focus{border-color:#0ff;outline:none}
.btn-primary{background:linear-gradient(100deg,#00c6ff,#0072ff);border-radius:40px;padding:12px;font-weight:bold;color:white;width:100%;cursor:pointer}
.btn-secondary{background:#7c3aed;border-radius:40px;padding:12px;font-weight:bold;color:white;width:100%;cursor:pointer}
.tab-active{border-bottom:2px solid #0ff;color:#0ff;padding-bottom:8px;font-weight:600;cursor:pointer}
.tab-inactive{color:#8a9bb5;padding-bottom:8px;font-weight:500;cursor:pointer}
.radio-group{background:#0a0f1c;border-radius:20px;padding:16px;border:1px solid #1e2a3e}
.gallery-img{cursor:pointer;border:2px solid transparent;border-radius:12px}
.gallery-img img{width:100%;height:80px;object-fit:cover;border-radius:12px}
.badge{background:#0072ff20;border-radius:60px;padding:4px 14px;font-size:12px}
.copy-btn{background:#1e2a3e;border-radius:30px;padding:6px 14px;font-size:12px;cursor:pointer;display:inline-block}
</style>
</head>
<body class="text-gray-200">
<div class="max-w-5xl mx-auto px-4 py-6">
<div class="flex justify-between items-center mb-6"><h1 class="text-2xl font-bold bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text text-transparent">🎭 Sarcastic Shortner</h1><button onclick="logout()" class="bg-red-600/70 hover:bg-red-600 px-5 py-2 rounded-full text-sm">🚪 Logout</button></div>

<div class="flex gap-4 mb-6 border-b border-gray-800">
<button onclick="showTab('create')" id="tabCreateBtn" class="tab-active">✨ Create Link</button>
<button onclick="showTab('links')" id="tabLinksBtn" class="tab-inactive">📊 All Links</button>
<button onclick="showTab('images')" id="tabImagesBtn" class="tab-inactive">🖼️ Gallery</button>
</div>

<!-- Create Tab -->
<div id="tabCreate" class="dark-card p-6">
<h2 class="text-xl font-bold mb-4">✨ Naya Link Banao</h2>
<div class="radio-group mb-5"><p class="text-sm text-cyan-300/80 mb-2">🎯 Preview Mode:</p><div class="flex gap-6"><label class="flex items-center gap-2"><input type="radio" name="mode" value="custom" checked> 🎨 Custom Preview</label><label class="flex items-center gap-2"><input type="radio" name="mode" value="auto"> 🌐 Auto Preview (from Destination)</label></div></div>

<form id="shortenForm" class="space-y-4">
<input type="url" id="dest" placeholder="Destination URL" required>
<div id="customFields">
<input type="text" id="title" placeholder="OG Title" class="mb-3" required>
<textarea id="desc" placeholder="OG Description" rows="2" class="mb-3" required></textarea>
<div><label class="text-cyan-300/80 text-sm">🖼️ Image</label><input type="file" id="imageFile" accept="image/*" class="mt-1"><div id="uploadStatus" class="text-sm mt-1 hidden"></div><div id="gallery" class="grid grid-cols-6 gap-2 mt-3">${galleryHtml}</div><input type="hidden" id="imageUrl"></div>
</div>
<div id="autoNote" class="hidden bg-purple-900/30 border border-purple-500/30 rounded-xl p-3 text-sm"><p>🌐 Auto Preview Mode Active</p><p class="text-gray-400 text-xs">Facebook will see destination website's OG tags</p></div>
<button type="submit" class="btn-primary">🚀 Create Short Link</button>
</form>
<div id="result" class="mt-4 hidden p-4 bg-cyan-900/30 rounded-xl"><p class="font-semibold">🔗 Short URL:</p><code id="shortUrl" class="break-all block mt-1"></code></div>

<div class="mt-8 pt-5 border-t border-gray-800"><h3 class="font-semibold mb-3">⚡ Bulk Generate - 15 Links</h3><div class="flex gap-3"><input type="text" id="bulkPrefix" placeholder="Prefix" class="flex-1"><button type="button" id="bulkBtn" class="bg-purple-600/80 hover:bg-purple-600 px-5 py-2 rounded-full">🔥 Generate 15</button></div><div id="bulkResult" class="mt-3 hidden p-3 bg-cyan-900/30 rounded-xl max-h-60 overflow-y-auto"></div></div>
</div>

<!-- Links Tab -->
<div id="tabLinks" class="dark-card p-6 hidden"><div class="flex justify-between items-center mb-4"><h2 class="text-xl font-bold">📊 All Links</h2><span class="badge">Total: ${links.length}</span></div>${linksHtml}</div>

<!-- Images Tab -->
<div id="tabImages" class="dark-card p-6 hidden"><div class="flex justify-between items-center mb-4"><h2 class="text-xl font-bold">🖼️ Image Gallery</h2><span class="badge">Total: ${images.length}</span></div>${imagesHtml}</div>
</div>

<script>
var selectedImage='';
function toggleMode(){var isAuto=document.querySelector('input[name="mode"]:checked').value==='auto';var cf=document.getElementById('customFields');var an=document.getElementById('autoNote');var ti=document.getElementById('title');var de=document.getElementById('desc');var iu=document.getElementById('imageUrl');if(isAuto){cf.style.display='none';an.style.display='block';if(ti)ti.removeAttribute('required');if(de)de.removeAttribute('required');if(iu)iu.removeAttribute('required');}else{cf.style.display='block';an.style.display='none';if(ti)ti.setAttribute('required','required');if(de)de.setAttribute('required','required');if(iu)iu.setAttribute('required','required');}}
document.querySelectorAll('input[name="mode"]').forEach(function(r){r.addEventListener('change',toggleMode);});
window.selectImage=function(url){selectedImage=url;document.getElementById('imageUrl').value=url;var gitems=document.querySelectorAll('#gallery > div');for(var i=0;i<gitems.length;i++){gitems[i].classList.remove('border-cyan-400','border-2');}if(event&&event.currentTarget){event.currentTarget.classList.add('border-cyan-400','border-2');}};
document.getElementById('imageFile').onchange=async function(e){var f=e.target.files[0];if(!f)return;var fd=new FormData();fd.append('image',f);var s=document.getElementById('uploadStatus');s.classList.remove('hidden');s.innerHTML='⏳ Uploading...';s.className='text-sm mt-1 text-cyan-300';try{var r=await fetch('/api/upload',{method:'POST',body:fd});var d=await r.json();if(d.url){s.innerHTML='✅ Uploaded!';s.className='text-sm mt-1 text-green-300';selectedImage=d.url;document.getElementById('imageUrl').value=d.url;setTimeout(function(){s.classList.add('hidden');},1500);setTimeout(function(){location.reload();},1000);}}catch(err){s.innerHTML='❌ Failed';s.className='text-sm mt-1 text-red-300';}};
document.getElementById('shortenForm').onsubmit=async function(e){e.preventDefault();var mode=document.querySelector('input[name="mode"]:checked').value;var dest=document.getElementById('dest').value;var title='',desc='',imgUrl='';if(mode==='custom'){title=document.getElementById('title').value;desc=document.getElementById('desc').value;imgUrl=document.getElementById('imageUrl').value;if(!title||!desc||!imgUrl){alert('📸 Bhai image select kar!');return;}}var res=await fetch('/api/shorten',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({destination:dest,title:title,description:desc,imageUrl:imgUrl,previewMode:mode})});var data=await res.json();if(data.slug){document.getElementById('shortUrl').innerText=window.location.origin+'/'+data.slug;document.getElementById('result').classList.remove('hidden');setTimeout(function(){location.reload();},2000);}else{alert('❌ Link save nahi hua');}};
document.getElementById('bulkBtn').onclick=async function(){var mode=document.querySelector('input[name="mode"]:checked').value;var dest=document.getElementById('dest').value;var prefix=document.getElementById('bulkPrefix').value||'';var title='',desc='',imgUrl='';if(mode==='custom'){title=document.getElementById('title').value;desc=document.getElementById('desc').value;imgUrl=document.getElementById('imageUrl').value;if(!dest||!title||!desc||!imgUrl){alert('❌ Saare fields bharo');return;}}else if(!dest){alert('❌ Destination URL daalo');return;}var btn=document.getElementById('bulkBtn');btn.innerHTML='⏳ Generating...';btn.disabled=true;var res=await fetch('/api/bulk',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({destination:dest,title:title,description:desc,imageUrl:imgUrl,count:15,prefix:prefix,previewMode:mode})});var data=await res.json();if(data.slugs&&data.slugs.length){var html='<p class="font-semibold mb-2">✅ 15 Links Generated:</p>';for(var i=0;i<data.slugs.length;i++){var s=data.slugs[i];html+='<div class="bg-black/40 p-2 rounded-lg mb-1 flex justify-between items-center"><code>'+window.location.origin+'/'+s+'</code><button onclick="copyText(\''+window.location.origin+'/'+s+'\')" class="bg-gray-700 px-2 py-1 rounded text-xs">📋 Copy</button></div>';}document.getElementById('bulkList').innerHTML=html;document.getElementById('bulkResult').classList.remove('hidden');setTimeout(function(){location.reload();},3000);}btn.innerHTML='🔥 Generate 15';btn.disabled=false;};
window.copyText=function(t){navigator.clipboard.writeText(t);alert('✅ Copied: '+t);};
window.showTab=function(tab){var ct=document.getElementById('tabCreate');var lt=document.getElementById('tabLinks');var it=document.getElementById('tabImages');var cb=document.getElementById('tabCreateBtn');var lb=document.getElementById('tabLinksBtn');var ib=document.getElementById('tabImagesBtn');ct.classList.add('hidden');lt.classList.add('hidden');it.classList.add('hidden');cb.classList.remove('tab-active');lb.classList.remove('tab-active');ib.classList.remove('tab-active');cb.classList.add('tab-inactive');lb.classList.add('tab-inactive');ib.classList.add('tab-inactive');if(tab==='create'){ct.classList.remove('hidden');cb.classList.add('tab-active');cb.classList.remove('tab-inactive');}else if(tab==='links'){lt.classList.remove('hidden');lb.classList.add('tab-active');lb.classList.remove('tab-inactive');}else if(tab==='images'){it.classList.remove('hidden');ib.classList.add('tab-active');ib.classList.remove('tab-inactive');}};
window.logout=async function(){await fetch('/api/logout');window.location.href='/login';};
toggleMode();
</script>
</body></html>`);
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
    return c.html(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta property="og:title" content="${escapeHtml(ogTitle)}" /><meta property="og:description" content="${escapeHtml(ogDescription)}" /><meta property="og:image" content="${escapeHtml(ogImage)}" /><meta property="og:url" content="${c.req.url}" /><meta property="og:type" content="website" /><title>${escapeHtml(ogTitle)}</title></head><body style="background:#0a0f1c;color:#ccc;text-align:center;padding:3rem"><h2>${escapeHtml(ogTitle)}</h2><p>${escapeHtml(ogDescription)}</p>${ogImage ? '<img src="' + escapeHtml(ogImage) + '" style="max-width:300px;border-radius:20px;margin:20px auto"/>' : ''}<p>Redirecting...</p></body></html>`);
  }
  
  await c.env.DB.prepare('UPDATE short_links SET clicks = clicks + 1 WHERE slug = ?').bind(slug).run();
  return c.redirect(link.destination, 302);
});

app.get('/api/logout', async c => { deleteCookie(c, 'token'); return c.json({ success: true }); });

export default app;