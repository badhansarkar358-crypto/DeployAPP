# Deploying Frontend

## GitHub Pages
1. Build the app:
   ```sh
   npm run build
   ```
2. Push the `dist/` folder to the `gh-pages` branch or use a deploy tool (e.g., `gh-pages` npm package).

## Render Static Site
1. Connect your repo to Render.
2. Set build command: `npm install && npm run build`
3. Set publish directory: `dist`
4. Set environment variable: `VITE_API_URL` to your backend URL.
