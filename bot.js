const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('🔄 Menghubungkan ke Chrome yang sudah terbuka...');

  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
  });

  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('labs.google/fx/id/tools/image-fx'));

  if (!page) {
    console.log('⚠️ Halaman ImageFX belum terbuka. Silakan buka secara manual.');
    return;
  }

  console.log('✅ Berhasil terhubung ke halaman ImageFX');

  const prompts = [
    'Cute cat wearing black sunglasses on the beach',
    'A dragon flying over a futuristic city',
    'A robot watering plants in a garden',
  ];

  const results = [];

  for (const prompt of prompts) {
    console.log(`🧠 Prompt: ${prompt}`);

    await page.waitForSelector('div[contenteditable="true"]', { timeout: 10000 });

    await page.evaluate((text) => {
      const editor = document.querySelector('div[contenteditable="true"]');
      if (editor) {
        editor.focus();
        document.execCommand('selectAll', false);
        document.execCommand('insertText', false, text);
      }
    }, prompt);

    console.log('📌 Mencari tombol "Buat"...');

    await page.waitForSelector('button', { timeout: 10000 });

    const buatButtonHandle = await page.evaluateHandle(() => {
      return [...document.querySelectorAll('button')].find(btn => btn.innerText.includes('Buat'));
    });

    const buatButton = buatButtonHandle.asElement();
    if (!buatButton) {
      console.log('⚠️ Gagal menemukan tombol "Buat"');
      continue;
    }

    await buatButton.click();
    console.log('✅ Tombol "Buat" berhasil diklik');

    console.log('⏳ Menunggu hasil gambar...');

    await page.waitForSelector('img[src*="googleusercontent"]', { timeout: 30000 });

    const images = await page.evaluate(() => {
      return [...document.querySelectorAll('img')]
        .map(img => img.src)
        .filter(src => src.includes('googleusercontent') && !src.includes('=s96-c'));
    });

    console.log(`🎨 Ditemukan ${images.length} gambar`);

    const saveDir = path.join(__dirname, 'generated_images');
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir);
    }

    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i];
      const fileName = `${prompt.replace(/[^a-z0-9]/gi, '_')}_${i + 1}.jpg`;
      const filePath = path.join(saveDir, fileName);

      const response = await fetch(imageUrl);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(filePath, Buffer.from(buffer));

      console.log(`📸 Gambar disimpan: ${filePath}`);
    }

    results.push({ prompt, images });

    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  fs.writeFileSync('imagefx_results.json', JSON.stringify(results, null, 2));
  console.log('✅ Done! Hasil tersimpan di imagefx_results.json');

  await browser.disconnect();
})();
