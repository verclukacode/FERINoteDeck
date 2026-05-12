# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

NoteDeck — a simple notes app with an Express REST API backend and a Vite + React frontend.

## Repository layout

- `backend/` — Node.js + Express API, TypeScript, CommonJS output
- `frontend/` — Vite + React app, ESM, Tailwind CSS v4, Storybook
- `package.json` (root) — Yarn workspaces monorepo; run all commands from here

## Common commands

Run from the **repo root** with Yarn:
- `yarn dev` — start backend (:3000), frontend (:5173), and Storybook (:6006) concurrently
- `yarn build` — compile backend TypeScript to `backend/dist/`, then Vite production build to `frontend/dist/`
- `yarn install` — install all workspace dependencies

Per-workspace (if needed):
- `yarn workspace notedeck-backend dev` — backend only (`tsx watch`)
- `yarn workspace notedeck-backend build` — backend only (`tsc`)
- `yarn workspace notedeck-frontend dev` — frontend only (Vite)
- `yarn workspace notedeck-frontend build` — frontend only (Vite build)
- `yarn workspace notedeck-frontend storybook` — Storybook only
- `yarn workspace notedeck-frontend lint` — ESLint

There is no test runner configured yet on either side.

## Architecture

- **Backend** (`backend/src/index.ts`) wires up `cors`, `express.json()`, and mounts the notes router at `/api/notes`. Notes are stored in-memory in `backend/src/routes/notes.ts` (no persistence layer); restarting the server clears them. CRUD endpoints: `GET /api/notes`, `GET /api/notes/:id`, `POST /api/notes`, `PUT /api/notes/:id`, `DELETE /api/notes/:id`.
- **Frontend** (`frontend/src/App.jsx`) is a single-page client that fetches the notes list and supports create/delete. The API base URL is read from `VITE_API_URL` and falls back to `http://localhost:3000/api`.
- **Dev proxy**: `frontend/vite.config.js` proxies `/api` → `http://localhost:3000`, so the frontend can call `/api/...` directly when both servers run locally.
- **Tailwind**: v4 via `@tailwindcss/vite` plugin — no `tailwind.config.js`; configured via `@theme {}` in CSS if needed. Imported with `@import "tailwindcss"` in `frontend/src/index.css`.
- **Storybook**: `@storybook/react-vite` at port 6006. Config in `frontend/.storybook/`. Component stories live alongside components as `*.stories.jsx`.
- **Config**: backend reads `PORT` from `.env` (see `backend/.env.example`).

## Backend TypeScript

- Source: `backend/src/*.ts` — compiled to `backend/dist/` via `tsc`
- Dev runner: `tsx watch` (esbuild-based, no compile step needed in dev)
- `backend/tsconfig.json`: target ES2022, module CommonJS, strict, esModuleInterop

## Swagger / API docs

- `swagger-jsdoc` parses `@openapi` JSDoc comments in `backend/src/routes/*.ts`
- Swagger UI served at `http://localhost:3000/api-docs` when the backend is running

## Linting

- **Biome** is used for linting and formatting across the entire monorepo (BE + FE)
- Config: `biome.json` at the repo root
- `yarn lint` — run `biome check .` (reports errors; exit 1 if any found)
- To auto-fix: `./node_modules/.bin/biome check --fix .`
- Biome enforces: recommended lint rules, import sorting, consistent formatting (tabs, double quotes for JS)
