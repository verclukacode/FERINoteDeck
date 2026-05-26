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
- `yarn dev` — start backend (:3001), frontend (:5173), and Storybook (:6006) concurrently
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

- **Backend** (`backend/src/index.ts`) — Express, persists to **MySQL via Prisma** (`backend/prisma/schema.prisma`, client singleton `src/lib/prisma.ts`). Routers: `routes/folders.ts` at `/api/folders`, `routes/pages.ts` at `/api/pages`, `routes/images.ts` at `/api/images` — all behind the `requireAuth` middleware. Uploaded images are stored as files under `backend/uploads/` and served statically.
- **Auth** is **Firebase Authentication**: the frontend signs in with the Firebase JS SDK; the backend verifies the Firebase ID token with `firebase-admin` (`src/lib/firebase.ts`, `src/middleware/requireAuth.ts`), which also upserts the MySQL `User` row.
- **Setup**: full local setup (MySQL, Prisma, Firebase) is in `backend/docs/SETUP.md`.
- **Frontend** is a feature-organized React app (react-router). Routes: `/` (notes UI, behind `ProtectedRoute`), `/login`, `/register`. Entry `frontend/src/main.jsx` → `routes/router.jsx`. See `frontend/ARCHITECTURE.md` for the full `src/` layout.
- **Data layer**: all data access goes through `frontend/src/services/notesService.js`, an API-shaped facade that `fetch`es `/api/folders` + `/api/pages` with a `Bearer` Firebase ID token. Entities: `Folder {id,name,color,order,collapsed}`, `Page {id,folderId,title,content,order}` — scoped per user, ids assigned by the server.
- **Notes UI state**: `features/notes/NotesContext.jsx` (React Context) holds folders/pages/view/selection and exposes action callbacks; `useNotes()` consumes it.
- **Note editor**: `features/notes/editor/` — a block-based editor (h1/h2/text/bullet/numbered/checklist/image/separator). A note's body is one markdown string in `Page.content` (`<<<NoteDeckMD>>>` sentinel); `editor/markdown.js` parses/serializes it. The editor **does not auto-save** — `NotePanel` has a Save button that calls `updatePageContent`. Images upload to `/api/images` and are referenced by URL. See `frontend/docs/editor.md`.
- **Flashcards (SRS)**: `features/flashcards/` — folder → deck → card, persisted in MySQL (`FlashcardFolder`/`Deck`/`FlashCard` + a `Review` revlog + per-user `StudySettings`). Studying uses an **Anki-style SM-2** scheduler (`backend/src/lib/srs.ts`); all scheduling times are **unix ms (`BigInt`)**, durations seconds, ease permille — responses pass through `backend/src/lib/serialize.ts`. `StudySession` loads `GET /api/decks/:id/queue` (daily limits) and persists each answer via `POST /api/cards/:id/answer`. State lives in `FlashcardsContext`. See `frontend/docs/flashcards.md`.
- **Drag-and-drop**: `@dnd-kit` — a single `DndContext` in `FolderList` reorders folders and reorders/moves pages within and across folders; drag logic lives in `NotesContext` (`handleDndOver`/`handleDndEnd`). The flashcards sidebar mirrors this in `DeckList`/`FlashcardsContext`.
- **Dev proxy**: `frontend/vite.config.js` proxies `/api` → `http://localhost:3001`, so the frontend can call `/api/...` directly when both servers run locally.
- **Tailwind**: v4 via `@tailwindcss/vite` plugin — no `tailwind.config.js`. Design tokens (colors, fonts) live in an `@theme {}` block in `frontend/src/styles/index.css`. Per-folder colors are applied via inline `style` (dynamic) using `folderHex()` from `lib/constants.js`.
- **Icons**: SVGs in `frontend/src/assets/icons/` (fill `currentColor`); render via the `components/Icon.jsx` wrapper.
- **Storybook**: `@storybook/react-vite` at port 6006. Config in `frontend/.storybook/`. Component stories live alongside components as `*.stories.jsx`.
- **Config**: backend reads `PORT`, `DATABASE_URL`, `FIREBASE_*`, `CORS_ORIGIN` from `backend/.env`; frontend reads `VITE_FIREBASE_*` from `frontend/.env` (see the `.env.example` files and `backend/docs/`).

## Backend TypeScript

- Source: `backend/src/*.ts` — compiled to `backend/dist/` via `tsc`
- Dev runner: `tsx watch` (esbuild-based, no compile step needed in dev)
- `backend/build` runs `prisma generate` then `tsc`; `prisma generate` also runs on `postinstall`
- `backend/tsconfig.json`: target ES2022, module CommonJS, strict, esModuleInterop

## Swagger / API docs

- `swagger-jsdoc` parses `@openapi` JSDoc comments in `backend/src/routes/*.ts`
- Swagger UI served at `http://localhost:3001/api-docs` when the backend is running

## Linting

- **Biome** is used for linting and formatting across the entire monorepo (BE + FE)
- Config: `biome.json` at the repo root
- `yarn lint` — run `biome check .` (reports errors; exit 1 if any found)
- To auto-fix: `./node_modules/.bin/biome check --fix .`
- Biome enforces: recommended lint rules, import sorting, consistent formatting (tabs, double quotes for JS)
