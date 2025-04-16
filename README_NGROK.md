# Running the Image Generation Server with Ngrok

This project runs an Express server for image generation on port 3000 by default.

## Steps to run locally

1. Install dependencies:
   ```
   npm install
   ```

2. Start the server:
   ```
   node get.js
   ```

3. Open your browser and go to:
   ```
   http://localhost:3000
   ```

## Expose server online using ngrok

1. Download and install ngrok from https://ngrok.com/

2. Run ngrok to expose port 3000:
   ```
   ngrok http 3000
   ```

3. Ngrok will provide a public URL (e.g., https://abcd1234.ngrok.io) that tunnels to your local server.

4. Share this URL to allow others to access your image generation website online.

## Notes

- Keep the ngrok process running while you want the server to be accessible online.
- You can stop ngrok anytime by pressing Ctrl+C in the terminal running ngrok.
