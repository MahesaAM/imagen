import express from 'express';
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

/**
 * Halaman utama:
 * Menampilkan textarea untuk masukkan prompt secara batch (satu per baris)
 * serta log progress dengan tampilan animasi loading per prompt.
 */
app.get("/", (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Batch Image Generator Async</title>
        <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono&display=swap" rel="stylesheet">
        <style>
          body {
            font-family: 'Roboto Mono', monospace;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #1e1e2f, #27293d);
            color: #e0e0e0;
          }
          h1 {
            text-align: center;
            margin-bottom: 20px;
            color: #ffa726;
          }
          textarea {
            width: 100%;
            max-width: 400px;
            height: 200px;
            padding: 10px;
            font-size: 16px;
            border: none;
            border-radius: 4px;
            resize: none;
          }
          button {
            padding: 10px 20px;
            font-size: 16px;
            border: none;
            border-radius: 4px;
            background-color: #ffa726;
            color: #1e1e2f;
            cursor: pointer;
            margin-top: 10px;
            transition: background-color 0.3s;
          }
          button:hover {
            background-color: #ffb74d;
          }
          #log {
            margin-top: 20px;
            max-width: 600px;
          }
          .log-entry {
            margin-bottom: 8px;
            padding: 6px 10px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 4px;
          }
          .spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 3px solid rgba(255,255,255,0.3);
            border-top-color: #ffa726;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-left: 10px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          a {
            color: #ffa726;
          }
        </style>
      </head>
      <body>
        <h1>Batch Image Generator Mahesa ❤️ Mia</h1>
        <p>Masukkan satu prompt per baris:</p>
        <textarea id="prompts" placeholder="Prompt 1\nPrompt 2\nPrompt 3"></textarea><br>
        <button id="startBtn">Generate dan Download</button>
        <div id="log"></div>
        <script>
          document.getElementById('startBtn').addEventListener('click', async function() {
            const textarea = document.getElementById('prompts');
            const logDiv = document.getElementById('log');
            logDiv.innerHTML = '';
            const promptLines = textarea.value.split('\\n').map(s => s.trim()).filter(s => s);
            if(promptLines.length === 0) {
              logDiv.innerHTML += '<div class="log-entry">Tidak ada prompt yang dimasukkan.</div>';
              return;
            }
            // Proses tiap prompt secara asinkron
            for (let i = 0; i < promptLines.length; i++) {
              const prompt = promptLines[i];
              // Buat log entry dengan spinner untuk prompt ini
              const logEntry = document.createElement('div');
              logEntry.className = 'log-entry';
              logEntry.innerHTML = 'Memproses prompt [' + (i+1) + ']: ' + prompt + ' <span class="spinner"></span>';
              logDiv.appendChild(logEntry);
              
              try {
                // Panggil endpoint /generatePrompt via AJAX (fetch)
                const response = await fetch('/generatePrompt', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ prompt })
                });
                if (!response.ok) {
                  logEntry.innerHTML += ' <span style="color:red;">Gagal: ' + response.statusText + '</span>';
                  continue;
                }
                const data = await response.json();
                // Hapus spinner dari log entry prompt
                const spinner = logEntry.querySelector('.spinner');
                if (spinner) spinner.remove();
                logEntry.innerHTML += ' - Selesai. Mulai download ' + data.images.length + ' gambar.';
                // Trigger download otomatis tiap gambar
                for (let j = 0; j < data.images.length; j++) {
                  const img = data.images[j];
                  const a = document.createElement('a');
                  a.href = img.url;
                  a.download = img.filename;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  logDiv.innerHTML += '<div class="log-entry">Download gambar: ' + img.filename + ' selesai.</div>';
                  // Delay antar download (500ms)
                  await new Promise(resolve => setTimeout(resolve, 500));
                }
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
  if (!prompt) {
    return res.status(400).json({ error: "Prompt harus diisi!" });
  }

  console.log(`Memproses prompt: ${prompt}`);

  const requestBody = {
    userInput: {
      candidatesCount: 4, // Contoh: menghasilkan 4 gambar per prompt
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
    aspectRatio: "IMAGE_ASPECT_RATIO_LANDSCAPE"
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
