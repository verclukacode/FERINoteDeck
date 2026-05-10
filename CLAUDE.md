# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

NoteDeck — a simple notes app with an Express REST API backend and a Vite + React frontend.

## Repository layout

- `backend/` — Node.js + Express API (CommonJS)
- `frontend/` — Vite + React app (ESM)
- Each side has its own `package.json` and is installed/run independently.

## Common commands

Backend (`cd backend`):
- `npm run dev` — start Express with nodemon (default port `3000`)
- `npm start` — start Express without watch mode

Frontend (`cd frontend`):
- `npm run dev` — start Vite dev server on port `5173`
- `npm run build` — production build to `dist/`
- `npm run preview` — preview the production build
- `npm run lint` — run ESLint

There is no test runner configured yet on either side.

## Architecture

- **Backend** (`backend/src/index.js`) wires up `cors`, `express.json()`, and mounts the notes router at `/api/notes`. Notes are stored in-memory in `backend/src/routes/notes.js` (no persistence layer); restarting the server clears them. CRUD endpoints: `GET /api/notes`, `GET /api/notes/:id`, `POST /api/notes`, `PUT /api/notes/:id`, `DELETE /api/notes/:id`.
- **Frontend** (`frontend/src/App.jsx`) is a single-page client that fetches the notes list and supports create/delete. The API base URL is read from `VITE_API_URL` and falls back to `http://localhost:3000/api`.
- **Dev proxy**: `frontend/vite.config.js` proxies `/api` → `http://localhost:3000`, so the frontend can call `/api/...` directly when both servers run locally.
- **Config**: backend reads `PORT` from `.env` (see `backend/.env.example`).
