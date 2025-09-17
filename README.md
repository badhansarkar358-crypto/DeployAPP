# MAA TARA LOTTERY AGENCIES — Full Stack Web App

## Overview
A production-ready, real-time lottery agency management app using React + Tailwind (frontend) and Node.js + Express (backend) with Google Sheets as the only database.

---

## Directory Structure

```
maataralottery/
  backend/         # Node.js + Express server, Google Sheets API, Socket.io
  frontend/        # React + Tailwind app
```

---

## Local Development

### Backend
1. Copy `backend/.env.example` to `backend/.env` and fill in your Google credentials and sheet ID.
2. Install dependencies:
   ```sh
   cd backend
   npm install
   ```
3. Start server:
   ```sh
   npm run dev
   ```

### Frontend
1. Copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL` to your backend URL.
2. Install dependencies:
   ```sh
   cd frontend
   npm install
   ```
3. Start dev server:
   ```sh
   npm run dev
   ```

---

## Deployment

- **Backend:** Deploy to Render as a Node.js web service. See `backend/deploy.md`.
- **Frontend:** Deploy to GitHub Pages or Render Static. See `frontend/deploy.md`.

---

## Google Sheets Setup
1. Create a Google Sheet with two tabs:
   - `CurrentData` (columns: id, name, purchase, return, sell, rate_per_pc, net_value, vc, previous_due, total, date, created_at, updated_at)
   - `SavedReports` (columns: reportId, reportDate, sheetTabName, created_at, downloadLinks)
2. Share the sheet with your service account email.

---

## API Endpoints
See backend `index.js` for all endpoints. Main ones:
- `/api/customers` (GET, POST, DELETE, clear)
- `/api/reports` (GET, POST, DELETE, clear-all)
- `/api/exports` (PDF/Excel)
- Real-time updates via Socket.io

---


## Features Checklist (Final)
- [x] Replicate screenshot UI with Tailwind, PT Sans, gradient background
- [x] Inline editable table, real-time calculations, field-level validation
- [x] Google Sheets as real-time DB (no MongoDB)
- [x] REST API for all CRUD/report/export endpoints
- [x] Real-time sync with Socket.io (push + polling fallback)
- [x] PDF/Excel export (server-side, SheetJS + Puppeteer)
- [x] Render + GitHub Pages deploy scripts
- [x] README and .env.example
- [x] Accessible, responsive, modern UI
- [x] Toasts/snackbars for errors and success
- [x] Animations, transitions, and accessibility improvements
- [x] All code modular, commented, and production-ready

---


---

## Local Development Quickstart

**Backend:**
1. Copy `backend/.env.example` to `backend/.env` and fill in your Google credentials and sheet ID.
2. Install dependencies:
   ```sh
   cd backend
   npm install
   ```
3. Start server:
   ```sh
   npm run dev
   ```

**Frontend:**
1. Copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL` to your backend URL.
2. Install dependencies:
   ```sh
   cd frontend
   npm install
   ```
3. Start dev server:
   ```sh
   npm run dev
   ```

---

## Deployment

**Backend (Render):**
1. Push your backend code to GitHub.
2. Create a new Web Service on Render:
   - Connect your GitHub repo.
   - Set build command: `npm install`
   - Set start command: `npm start`
   - Add environment variables from `.env.example`.
   - Upload your service account JSON as a secret file if needed.
3. Set CORS to allow your frontend domain.
4. Deploy!

**Frontend (GitHub Pages or Render Static):**
1. Build the app:
   ```sh
   npm run build
   ```
2. Push the `dist/` folder to the `gh-pages` branch or use a deploy tool.
3. Or, connect your repo to Render Static, set build command and publish directory as in `frontend/deploy.md`.

---

## Support
For issues, open a GitHub issue or contact the maintainer.
