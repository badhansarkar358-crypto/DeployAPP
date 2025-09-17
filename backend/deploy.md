# Deploying Backend to Render

1. Push your backend code to GitHub.
2. Create a new Web Service on Render:
   - Connect your GitHub repo.
   - Set build command: `npm install`
   - Set start command: `npm start`
   - Add environment variables from `.env.example`.
   - Upload your service account JSON as a secret file if needed.
3. Set CORS to allow your frontend domain (see `FRONTEND_ORIGIN` in `.env`).
4. Deploy!
