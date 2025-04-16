import express from 'express';
import serverless from 'serverless-http';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// Setup __dirname di ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Konfigurasi API dan token (ganti BEARER_TOKEN dengan token Anda yang valid)
const API_URL = "https://aisandbox-pa.googleapis.com/v1:runImageFx";
const BEARER_TOKEN = process.env.BEARER_TOKEN;

// Inisialisasi Express
const app = express();
const PORT = process.env.PORT || 3001;

// Gunakan middleware untuk parsing form URL encoded dan JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Batch Image Generator Async</title>
        <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono&display=swap" rel="stylesheet">
        <style>
          /* Reset dasar */
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html, body {
            height: 100%;
          }
          body {
            font-family: 'Roboto Mono', monospace;
            background: linear-gradient(135deg, #1c1d2f 0%, #2d1d49 40%, #341c5e 80%);
            color: #e0e0e0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          h1 {
            margin-bottom: 20px;
            font-size: 2.5em;
            font-weight: bold;
            text-align: center;
            background: linear-gradient(to right, #8A2387, #E94057, #F27121);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
          }
          /* Container form dengan efek glass */
          .glass-form {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 16px;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            padding: 20px;
            max-width: 500px;
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 15px;
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
          }
          .glass-form p {
            font-size: 1.1em;
          }
          /* Textarea dan select dengan efek glass */
          .glass-form textarea,
          .glass-form select {
            width: 100%;
            background: rgba(255, 255, 255, 0.2);
            border: none;
            border-radius: 8px;
            padding: 10px;
            font-size: 16px;
            color: #e0e0e0;
            outline: none;
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
          }
          .glass-form textarea {
            height: 120px;
            resize: none;
          }
          /* Container select khusus untuk menambahkan ikon panah */
          .select-container {
            position: relative;
            width: 100%;
          }
          .select-container select {
            appearance: none;
            -webkit-appearance: none;
            -moz-appearance: none;
            padding-right: 35px;
            cursor: pointer;
          }
          .select-container::after {
            content: '▼';
            position: absolute;
            top: 50%;
            right: 10px;
            transform: translateY(-50%);
            pointer-events: none;
            color: #e0e0e0;
          }
          /* Tombol */
          .glass-form button {
            padding: 12px;
            font-size: 16px;
            border: none;
            border-radius: 8px;
            background-color: #ffa726;
            color: #1e1e2f;
            font-weight: bold;
            cursor: pointer;
            transition: background 0.3s ease;
          }
          .glass-form button:hover {
            background-color: #ffb74d;
          }
          /* Area log & hasil */
          #log {
            margin-top: 30px;
            max-width: 800px;
            width: 100%;
          }
          .log-entry {
            margin-bottom: 10px;
            padding: 10px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            box-shadow: 0 0 10px rgba(0,0,0,0.3);
          }
          /* Tampilan gambar secara horizontal */
          .image-row {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: center;
            margin-top: 10px;
          }
          .image-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
          }
          .image-item img {
            max-width: 200px;
            height: auto;
            border: 2px solid #ffa726;
            border-radius: 8px;
            box-shadow: 0 0 15px rgba(255, 167, 38, 0.4);
          }
          /* Footer */
          footer {
            margin-top: 40px;
            text-align: center;
            color: #cccccc;
            font-size: 0.9em;
          }
          /* Spinner */
          .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top-color: #ffa726;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-left: 10px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <h1>Batch Image Generator Mahesa ❤️ Mia</h1>
        <div class="glass-form">
          <p>Masukkan satu prompt per baris:</p>
          <textarea id="prompts" placeholder="Prompt 1\nPrompt 2\nPrompt 3"></textarea>
          <p>Pilih Aspect Ratio:</p>
          <div class="select-container">
            <select id="aspectRatio">
              <option value="IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE">Landscape 4:3</option>
              <option value="IMAGE_ASPECT_RATIO_LANDSCAPE">Landscape</option>
              <option value="IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR">Portrait 3:4</option>
              <option value="IMAGE_ASPECT_RATIO_PORTRAIT">Portrait</option>
              <option value="IMAGE_ASPECT_RATIO_SQUARE">Square</option>
            </select>
          </div>
          <button id="startBtn">Generate dan Download</button>
        </div>
        <div id="log"></div>
        <footer>
          <p>&copy; 2025 Image Generator. All rights reserved.</p>
        </footer>
        
        <script>
          document.getElementById('startBtn').addEventListener('click', async function() {
            const textarea = document.getElementById('prompts');
            const aspectRatioSelect = document.getElementById('aspectRatio');
            const logDiv = document.getElementById('log');
            logDiv.innerHTML = '';
            const promptLines = textarea.value.split('\\n').map(s => s.trim()).filter(s => s);
            
            if(promptLines.length === 0) {
              logDiv.innerHTML += '<div class="log-entry">Tidak ada prompt yang dimasukkan.</div>';
              return;
            }
            
            const aspectRatio = aspectRatioSelect.value;
            
            for (let i = 0; i < promptLines.length; i++) {
              const prompt = promptLines[i];
              const logEntry = document.createElement('div');
              logEntry.className = 'log-entry';
              logEntry.innerHTML = 'Memproses prompt [' + (i + 1) + ']: ' + prompt + ' <span class="spinner"></span>';
              logDiv.appendChild(logEntry);
              
              try {
                const response = await fetch('/generatePrompt', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ prompt, aspectRatio })
                });
                
                if (!response.ok) {
                  logEntry.innerHTML += ' <span style="color:red;">Gagal: ' + response.statusText + '</span>';
                  continue;
                }
                
                const data = await response.json();
                const spinner = logEntry.querySelector('.spinner');
                if (spinner) spinner.remove();
                
                logEntry.innerHTML += ' - Selesai. Menampilkan ' + data.images.length + ' gambar.';
                
                // Container baris gambar
                const imageRow = document.createElement('div');
                imageRow.className = 'image-row';
                
                data.images.forEach((img, index) => {
                  const imageItem = document.createElement('div');
                  imageItem.className = 'image-item';
                  
                  // Elemen image
                  const imgElement = document.createElement('img');
                  imgElement.src = img.url;
                  imgElement.alt = 'Generated Image ' + (index + 1);
                  
                  // Tombol download manual
                  const downloadButton = document.createElement('button');
                  downloadButton.textContent = 'Download';
                  downloadButton.addEventListener('click', () => {
                    const a = document.createElement('a');
                    a.href = img.url;
                    a.download = img.filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  });
                  
                  imageItem.appendChild(imgElement);
                  imageItem.appendChild(downloadButton);
                  imageRow.appendChild(imageItem);
                  
                  // Auto-download (opsional)
                  const a = document.createElement('a');
                  a.href = img.url;
                  a.download = img.filename;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                });
                
                logEntry.appendChild(imageRow);
              } catch (error) {
                logEntry.innerHTML += ' <span style="color:red;">Error: ' + error.message + '</span>';
              }
            }
            logDiv.innerHTML += '<div class="log-entry"><strong>Semua prompt selesai diproses.</strong></div>';
          });
        </script>
      </body>
    </html>
  `);
});



/**
 * Endpoint /generatePrompt
 * Menerima satu prompt dan memanggil API eksternal untuk menghasilkan gambar.
 * Menggunakan AbortController untuk menghindari request yang menggantung lebih dari 30 detik.
 */
app.post("/generatePrompt", async (req, res) => {
  const prompt = req.body.prompt;
  const aspectRatio = req.body.aspectRatio; // Nilai aspect ratio didapat dari request body
  if (!prompt) {
    return res.status(400).json({ error: "Prompt harus diisi!" });
  }

  console.log(`Memproses prompt: ${prompt}`);

  const requestBody = {
    userInput: {
      candidatesCount: 4, // Menghasilkan 4 gambar per prompt
      prompts: [prompt],
      seed: 602603
    },
    clientContext: {
      sessionId: ";1743205828841",
      tool: "IMAGE_FX"
    },
    modelInput: {
      modelNameType: "IMAGEN_3_1"
    },
    aspectRatio: aspectRatio // Gunakan aspect ratio dari request body
  };

  // Setup AbortController untuk timeout request 30 detik
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 30000);

  try {
    console.log(`Mengirim request ke API eksternal untuk prompt: ${prompt}`);
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "accept": "*/*",
        "authorization": `Bearer ${BEARER_TOKEN}`,
        "content-type": "application/json"
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    const responseText = await response.text();
    if (!response.ok) {
      throw new Error(`Gagal: ${response.statusText}`);
    }
    
    const data = JSON.parse(responseText);
    if (!data.imagePanels || data.imagePanels.length === 0) {
      throw new Error("Tidak ada gambar yang dihasilkan.");
    }

    // Ambil panel gambar pertama untuk prompt ini
    const panel = data.imagePanels[0];
    const images = panel.generatedImages.map((img, index) => {
      const dataUrl = `data:image/jpeg;base64,${img.encodedImage}`;
      const sanitizedPrompt = prompt.replace(/[^a-z0-9]/gi, '_').substring(0, 20);
      const filename = `${sanitizedPrompt}_${Date.now()}_${index + 1}.jpg`;
      return { filename, url: dataUrl };
    });
    
    console.log(`Selesai proses prompt: ${prompt}`);
    res.json({ prompt, images });
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error("Request timeout untuk prompt: " + prompt);
      res.status(408).json({ error: "Request ke API eksternal timeout (30 detik)." });
    } else {
      console.error(`Error pada prompt ${prompt}: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
});

// Jalankan server dan tampilkan petunjuk penggunaan Ngrok pada console
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
  console.log(`Untuk membuat server online, jalankan: ngrok http ${PORT}`);
});