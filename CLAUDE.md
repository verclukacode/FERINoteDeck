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
- `yarn workspace notedeck-frontend lint` — ESLint (project-wide lint/format is Biome — see below)

There is no test runner configured yet on either side.

Yarn 4 (via Corepack); `.yarnrc.yml` pins `nodeLinker: node-modules` so Vite/Storybook/Biome resolve normally (not PnP).

## Architecture

- **Backend** (`backend/src/index.ts`) wires up `cors`, `express.json()`, and mounts the notes router at `/api/notes`. Notes are stored in-memory in `backend/src/routes/notes.ts` (no persistence layer); restarting the server clears them. CRUD endpoints: `GET /api/notes`, `GET /api/notes/:id`, `POST /api/notes`, `PUT /api/notes/:id`, `DELETE /api/notes/:id`.
- **Frontend** is a feature-organized React app (react-router). Routes: `/` (notes UI), `/login`, `/register` (stubs). Entry `frontend/src/main.jsx` → `routes/router.jsx`. The notes feature currently runs on **dummy data** — see `frontend/ARCHITECTURE.md` for the full `src/` layout and conventions.
- **Data layer / backend swap point**: all data access goes through `frontend/src/services/notesService.js`, an API-shaped facade. It currently delegates to `localStorageRepo.js` (localStorage, seeded from `data/seed.js`). Connecting the real backend = rewriting only `notesService.js`; no component changes. Entities: `Folder {id,name,color,order,collapsed}`, `Page {id,folderId,title,content,order}`.
- **Notes UI state**: `features/notes/NotesContext.jsx` (React Context) holds folders/pages/view/selection and exposes action callbacks; `useNotes()` consumes it.
- **Drag-and-drop**: `@dnd-kit` — a single `DndContext` in `FolderList` reorders folders and reorders/moves pages within and across folders; drag logic lives in `NotesContext` (`handleDndOver`/`handleDndEnd`).
- **Dev proxy**: `frontend/vite.config.js` proxies `/api` → `http://localhost:3000`, so the frontend can call `/api/...` directly when both servers run locally.
- **Tailwind**: v4 via `@tailwindcss/vite` plugin — no `tailwind.config.js`. Design tokens (colors, fonts) live in an `@theme {}` block in `frontend/src/styles/index.css`. Per-folder colors are applied via inline `style` (dynamic) using `folderHex()` from `lib/constants.js`.
- **Icons**: SVGs in `frontend/src/assets/icons/` (fill `currentColor`); render via the `components/Icon.jsx` wrapper.
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
