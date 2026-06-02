# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

NoteDeck — a personal knowledge app combining markdown notes, an Anki-style flashcards/spaced-repetition system, a calendar, a public marketplace, and direct user-to-user sharing for both notes and decks. Express REST API backend + Vite + React frontend, single MySQL database via Prisma, Firebase auth.

## Repository layout

- `backend/` — Node.js + Express API, TypeScript, CommonJS output
- `frontend/` — Vite + React app, ESM, Tailwind CSS v4, Storybook (FE-only)
- `db/` — Docker Compose file for MySQL 8; data volume lives in `db/data/` (gitignored)
- `package.json` (root) — Yarn workspaces monorepo; run all commands from here

## Common commands

Run from the **repo root** with Yarn:
- `yarn dev` — auto-starts the MySQL container (`predev`), then starts backend (:3001), frontend (:5173), and Storybook (:6006) concurrently
- `yarn build` — compile backend TypeScript to `backend/dist/`, then Vite production build to `frontend/dist/`
- `yarn install` — install all workspace dependencies
- `yarn setup` — **first-time setup**: installs all dependencies, starts MySQL (waits until healthy), and runs `prisma db push` to create tables
- `yarn db:up` — start the MySQL Docker container in the background (also called by `predev`)
- `yarn db:ready` — start the MySQL container and wait until it passes its healthcheck
- `yarn db:down` — stop the MySQL Docker container (data is preserved in `db/data/`)
- `yarn db:logs` — stream MySQL container logs

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

- **Backend** (`backend/src/index.ts`) — Express, persists to **MySQL via Prisma** (`backend/prisma/schema.prisma`, client singleton `src/lib/prisma.ts`). Routers (all behind `requireAuth`):
  - `routes/folders.ts` (`/api/folders`), `routes/pages.ts` (`/api/pages`) — notes
  - `routes/flashcard-folders.ts`, `routes/decks.ts`, `routes/cards.ts` — flashcards
  - `routes/images.ts` (`/api/images`), `routes/users.ts` (`/api/users` — profile, avatar, study-settings)
  - `routes/marketplace.ts` (`/api/marketplace`) — public publish/browse/clone
  - `routes/invites.ts` (`/api/invites`) — direct note-share invites + sent-list + revoke
  - `routes/deck-invites.ts` (`/api/deck-invites`) — direct deck-share invites; **accept clones the deck and back-links via `Deck.sharedFromDeckId`**
  - `routes/search.ts` (`/api/search`) — weighted cross-entity search
  - `routes/calendar-tags.ts` + `routes/calendar-events.ts` — calendar
  - `routes/import.ts` (`/api/import`) — AI file-to-note import (PDF/DOCX/PPTX/TXT/MD/images
    + prompt → gpt-4o-mini → structured `{title, content}`); gated by `IMPORT_AI_PASSWORD`
    env var (503 if unset). File extraction in `src/lib/fileExtraction.ts`, OpenAI client in
    `src/lib/openai.ts`.
  - `GET /api/decks/:id/leaderboard` (on `decks.ts`) — ranks deck members by average SM-2 ease

  Uploaded images live under `backend/uploads/` and are served statically; security headers via `helmet` (`X-Content-Type-Options: nosniff` + `Content-Disposition: inline` + cross-origin CORP + no-referrer). Upload validation lives in `src/lib/imageValidation.ts` (mimetype + extension allowlist + post-write magic-byte verification; URL allowlist enforced for `User.avatarUrl` and images inside published notes). Spaced-repetition scheduling lives in `src/lib/srs.ts`; `src/lib/serialize.ts` converts `BigInt` (unix-ms) fields for JSON. Deck cloning (used by both marketplace and deck-invite accept) lives in `src/lib/cloneDeck.ts`.
- **Auth** is **Firebase Authentication**: the frontend signs in with the Firebase JS SDK; the backend verifies the Firebase ID token with `firebase-admin` (`src/lib/firebase.ts`, `src/middleware/requireAuth.ts`), which also upserts the MySQL `User` row.
- **Setup**: full local setup (Docker/MySQL, Prisma, Firebase) is in `backend/docs/SETUP.md`. MySQL runs in Docker via `db/docker-compose.yml`; `yarn dev` starts it automatically.
- **Frontend** is a feature-organized React app (react-router). Routes: `/` (notes/flashcards/calendar UI, behind `ProtectedRoute`), `/login`, `/register`, `/verify-email`, `/choose-username`. Entry `frontend/src/main.jsx` → `routes/router.jsx`. See `frontend/ARCHITECTURE.md` for the full `src/` layout.
- **Data layer**: per-feature service facades in `frontend/src/services/` — `notesService.js`, `flashcardsService.js`, `marketplaceService.js`, `calendarService.js`, `searchService.js`. All `fetch` with a `Bearer` Firebase ID token via a shared `apiRequest` helper. Entities: `Folder {id,name,color,order,collapsed}`, `Page {id,folderId,title,content,order,isPublic,publicDescription,publishedAt}` — scoped per user, ids assigned by the server.
- **Notes UI state**: `features/notes/NotesContext.jsx` (React Context) holds folders, owned pages, **`sharedPages`** (accepted note invites where I'm a collaborator), **`pendingInvites`** + accept/decline, **`pageShares`** (recipients-with-access per page) + revoke, and the view/selection state. `useNotes()` consumes it.
- **Note editor**: `features/notes/editor/` — a block-based editor (h1/h2/text/bullet/numbered/checklist/image/separator). A note's body is one markdown string in `Page.content` (`<<<NoteDeckMD>>>` sentinel); `editor/markdown.js` parses/serializes it. The editor **does not auto-save** — `NotePanel` has a Save button that calls `updatePageContent`. Images upload to `/api/images` and are referenced by URL. See `frontend/docs/editor.md`.
- **Flashcards (SRS)**: `features/flashcards/` — folder → deck → card, persisted in MySQL (`FlashcardFolder`/`Deck`/`FlashCard` + a `Review` revlog + per-user `StudySettings`). Studying uses an **Anki-style SM-2** scheduler (`backend/src/lib/srs.ts`); all scheduling times are **unix ms (`BigInt`)**, durations seconds, ease permille — responses pass through `backend/src/lib/serialize.ts`. `StudySession` loads `GET /api/decks/:id/queue` (daily limits) and persists each answer via `POST /api/cards/:id/answer`. State lives in `FlashcardsContext`, which also owns **`pendingDeckInvites`** + accept/decline. See `frontend/docs/flashcards.md`.
- **Sharing model — note invites**: `features/notes/` — direct invites by `@username`. `POST /api/invites` (sender, recipient, page), `GET /api/invites` (pending), `PATCH /:id` (accept/decline), `GET /sent?pageId=` (people-with-access for a page), `DELETE /:id` (revoke). Accepted invitees see the note under a **Shared** sidebar section (`SharedPageItem`) and can edit title/content; they **cannot** toggle marketplace publish or invite others. The owner sees collaborator avatars on each shared `PageItem` and manages the access list in `ShareModal`'s "People with access" block.
- **Sharing model — deck invites + leaderboard**: `features/flashcards/` — direct deck invites by `@username` mirror note invites at `/api/deck-invites`. **On accept, the backend clones the deck** (independent `FlashCard` rows + fresh scheduling, via `src/lib/cloneDeck.ts`) into the recipient's first folder (auto-creates a "Shared decks" folder if they have none) and stamps `Deck.sharedFromDeckId = sourceDeckId` for lineage. `GET /api/decks/:id/leaderboard` resolves the canonical source (the row itself if it's the original; `sharedFromDeckId` if it's a clone), aggregates each member's average `FlashCard.ease`, and returns a sorted list with isOwner/isMe flags. The Leaderboard button (`DeckLeaderboardModal`) only appears when `members >= 2`. **Owner-only restriction**: the share paperplane is hidden on shared clones (`sharedFromDeckId !== null`); backend `PATCH /api/decks/:id` returns 403 if a non-owner tries to set `isPublic`/`publicDescription`, and `POST /api/deck-invites` returns 403 if a clone is the source.
- **Marketplace**: `features/marketplace/` — users opt-in publish notes/decks (`Page.isPublic` / `Deck.isPublic` + `publicDescription` + `publishedAt`; PATCH on the existing routes), browse via `GET /api/marketplace`, preview via `GET /api/marketplace/notes/:id` / `/decks/:id`, and clone into one of their own folders. **Marketplace clones are fully independent** (`sharedFromDeckId` is null) — un-publishing the source does not affect them, and they don't appear on any leaderboard. The store icon in the sidebar header opens `MarketplaceModal`; the paperplane on each note/deck opens `components/ShareModal.jsx`. Deep links like `/?market=note:<id>` open the marketplace pre-selected (parsed by `NotesPage`; auth state is preserved via `routes/ProtectedRoute` + `lib/postAuthDest.js`). See `frontend/docs/marketplace.md`.
- **Calendar**: `features/calendar/` — `CalendarTag` (name + color) and `CalendarEvent` (name, date, optional description + tag) per user, exposed via `/api/calendar-tags` and `/api/calendar-events`. `CalendarContext` provides state; UI in `CalendarModal` (month + week views), event CRUD in `EventFormModal`. `GET /api/calendar-events/upcoming` returns warning/urgent buckets for the next 3 days, surfaced via `CalendarToasts`.
- **Search**: `features/search/SearchModal.jsx` — Spotlight-style overlay opened from the search icon in `SidebarHeader`. Hits `GET /api/search?q=…` (`backend/src/routes/search.ts`), which searches the caller's notes (title + content), decks (name), and cards (question + answer) with weighted relevance scoring (exact > prefix > earlier-substring). Clicking a result switches `view`, expands the parent folder, and selects the page/deck/card. See `frontend/docs/search.md`.
- **Notifications**: `features/notes/NotificationsModal.jsx` is a single inbox for both pending note invites (from `useNotes`) and pending deck invites (from `useFlashcards`); the bell badge in `SidebarHeader` sums both counts.
- **Drag-and-drop**: `@dnd-kit` — a single `DndContext` in `FolderList` reorders folders and reorders/moves pages within and across folders; drag logic lives in `NotesContext` (`handleDndOver`/`handleDndEnd`). The flashcards sidebar mirrors this in `DeckList`/`FlashcardsContext`.
- **Dev proxy**: `frontend/vite.config.js` proxies `/api` → `http://localhost:3001`, so the frontend can call `/api/...` directly when both servers run locally.
- **Tailwind**: v4 via `@tailwindcss/vite` plugin — no `tailwind.config.js`. Design tokens (colors, fonts) live in an `@theme {}` block in `frontend/src/styles/index.css`. Per-folder colors are applied via inline `style` (dynamic) using `folderHex()` from `lib/constants.js`.
- **Icons**: SVGs in `frontend/src/assets/icons/` (fill `currentColor`); render via the `components/Icon.jsx` wrapper.
- **Storybook**: `@storybook/react-vite` at port 6006. Config in `frontend/.storybook/`. Storybook is **development-only** and **frontend-only** — it is never part of `yarn build`. Component stories live alongside components as `*.stories.jsx` with `@storybook/test` interaction tests (play functions). Backend docs live in `frontend/src/stories/Backend.mdx`. **Every new frontend component must have a `*.stories.jsx` file with interaction tests. Every time a backend route is added/removed, the data model changes, or the auth flow is modified, update `frontend/src/stories/Backend.mdx`.**
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
