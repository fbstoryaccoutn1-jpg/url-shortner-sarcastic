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
            statusDiv.innerHTML = 'Uploading to Cloudinary...';
            statusDiv.className = 'text-sm mt-1 text-blue-600';
            
            try {
                const res = await fetch('/api/upload', { 
                    method: 'POST', 
                    body: formData 
                });
                const data = await res.json();
                if (data.url) {
                    statusDiv.innerHTML = '✅ Upload successful!';
                    statusDiv.className = 'text-sm mt-1 text-green-600';
                    setTimeout(() => {
                        statusDiv.classList.add('hidden');
                    }, 2000);
                    return data.url;
                }
                throw new Error('Upload failed');
            } catch(e) {
                statusDiv.innerHTML = '❌ Upload failed! Try again.';
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
                    // Refresh gallery only
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
                alert('Image select karo! Pehle image upload karo ya gallery se select karo');
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
                    document.getElementById('shortenForm').reset();
                    document.getElementById('imageUrl').value = '';
                    selectedImage = '';
                    setTimeout(() => location.reload(), 3000);
                }
            } else {
                const error = await res.text();
                alert('Error: ' + error);
            }
        };
        
        async function logout() {
            await fetch('/api/logout');
            window.location.href = '/login';
        }
    </script>
</body>
</html>`);