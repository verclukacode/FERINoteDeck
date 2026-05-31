# NoteDeck

A full-stack personal knowledge app — Express REST API + MySQL backend with a React + Vite
frontend. Notes use a block-based markdown editor; flashcards use an Anki-style spaced-repetition
scheduler with per-deck leaderboards when shared with others. Includes a calendar for events,
a public marketplace for browsing/cloning others' notes & decks, and direct user-to-user sharing
(with collaborator avatars on notes and clone-on-accept for decks). Accounts are handled with
Firebase Authentication.

## Design
[Figma design](https://www.figma.com/design/6tgxbVBCI2aQEKWJ6ljoyo/NoteDeck?node-id=2028-172&t=TxnQ93y2De1SI7VC-1)

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express 5, TypeScript, tsx |
| Database | MySQL 8 via Prisma (Docker Compose in `db/`) |
| Auth | Firebase Authentication (`firebase-admin` verifies ID tokens) |
| Frontend | React 19, Vite, Tailwind CSS v4, react-router |
| Component docs | Storybook 10 (React + Vite) |
| API docs | Swagger UI (swagger-jsdoc + swagger-ui-express) |
| Linting | Biome (lint + format, whole monorepo) |
| Monorepo | Yarn workspaces (Yarn 4 via Corepack) + concurrently |

## Getting started

**Prerequisites**: Node.js ≥ 18, a local MySQL server, and a Firebase project.
Full setup (MySQL user/db, Prisma, Firebase service account + web config) is in
**[backend/docs/SETUP.md](backend/docs/SETUP.md)** — start there.

```bash
yarn                                            # install all workspace deps
cp backend/.env.example backend/.env            # then fill in DB + Firebase
cp frontend/.env.example frontend/.env          # Firebase web config
yarn workspace notedeck-backend prisma:push     # create the MySQL tables
yarn dev                                         # backend + frontend + Storybook
```

| Service | URL |
|---|---|
| Backend API | http://localhost:3001 |
| Swagger UI | http://localhost:3001/api-docs |
| Frontend | http://localhost:5173 |
| Storybook | http://localhost:6006 |

## Scripts

From the **repo root**:

```bash
yarn dev        # backend (tsx watch), frontend (Vite), Storybook — concurrently
yarn build      # compile backend TS (prisma generate + tsc) + Vite production build
yarn lint       # Biome checks across the whole monorepo
```

Per workspace:

```bash
yarn workspace notedeck-backend dev          # backend only (tsx watch)
yarn workspace notedeck-backend prisma:push  # sync schema.prisma into MySQL
yarn workspace notedeck-frontend dev         # frontend only (Vite)
yarn workspace notedeck-frontend storybook   # Storybook dev server
```

To auto-fix lint/format: `./node_modules/.bin/biome check --fix .`

## Project structure

```
FERINoteDeck/
├── package.json          # Yarn workspaces root
├── biome.json            # Biome lint/format config
├── backend/
│   ├── prisma/schema.prisma   # MySQL schema (notes, flashcards, users)
│   ├── docs/SETUP.md          # local setup + ER diagram + API overview
│   └── src/
│       ├── index.ts           # Express app + Swagger + route mounting
│       ├── lib/               # prisma client, firebase, srs (SM-2), serialize
│       ├── middleware/        # requireAuth (Firebase token)
│       └── routes/            # folders, pages, images, users, flashcard-folders, decks, cards, marketplace, search
└── frontend/
    ├── ARCHITECTURE.md        # frontend src/ layout
    ├── docs/                  # editor.md, flashcards.md, marketplace.md, search.md
    └── src/
        ├── routes/router.jsx
        ├── pages/             # NotesPage, Login, Register, VerifyEmail, ChooseUsername
        ├── features/notes/    # sidebar, folders/pages, block editor, invites, account modal
        ├── features/flashcards/   # decks, cards, study session (SM-2), deck invites, leaderboard
        ├── features/marketplace/  # browse, preview, clone public notes/decks
        ├── features/calendar/     # month/week views, events with tags, upcoming-event toasts
        ├── features/search/       # Spotlight-style cross-feature search
        └── services/          # notesService, flashcardsService, marketplaceService, calendarService, searchService
```

## API

Base URL `http://localhost:3001/api`. Every route requires an
`Authorization: Bearer <Firebase ID token>` header and is scoped to the authenticated user.
Browse the full, live spec at **`/api-docs`** (Swagger). Route groups:

- **Notes**: `/folders`, `/pages` (incl. `/pages/shared`), `/images` (helmet-secured, magic-byte verified)
- **Flashcards**: `/flashcard-folders`, `/decks` (incl. `/decks/:id/queue`, `/decks/:id/leaderboard`),
  `/cards` (incl. `/cards/:id/answer`, `/cards/:id/reset`)
- **Direct sharing**:
  - `/invites` — note-share invites (POST/GET pending, `/sent`, PATCH accept/decline, DELETE revoke)
  - `/deck-invites` — deck-share invites (accept clones the deck and links via `Deck.sharedFromDeckId`)
- **Marketplace**: `/marketplace` (search public notes + decks), `/marketplace/notes/:id`,
  `/marketplace/decks/:id`, `/marketplace/*/clone`
- **Calendar**: `/calendar-tags`, `/calendar-events` (incl. `/calendar-events/upcoming` for the 3-day warning/urgent buckets)
- **Search**: `/search?q=` (cross-feature, relevance-sorted, scoped to the caller)
- **Account**: `/users/me`, `/users/me/avatar`, `/users/me/study-settings`

Data is persisted in MySQL (see the ER diagram in [backend/docs/SETUP.md](backend/docs/SETUP.md)).

## Documentation

- [backend/docs/SETUP.md](backend/docs/SETUP.md) — local setup, ER diagram, SM-2 state diagram, use-case diagram, API overview
- [frontend/ARCHITECTURE.md](frontend/ARCHITECTURE.md) — frontend structure & data flow
- [frontend/docs/editor.md](frontend/docs/editor.md) — the block-based note editor
- [frontend/docs/flashcards.md](frontend/docs/flashcards.md) — flashcards, SM-2 spaced repetition, deck invites + leaderboard
- [frontend/docs/marketplace.md](frontend/docs/marketplace.md) — sharing + marketplace + clone flow
- [frontend/docs/search.md](frontend/docs/search.md) — cross-feature search + relevance scoring
- [docs/deployment.md](docs/deployment.md) — Docker / GHCR / Nginx CI-CD pipeline

## Configuration

Backend `backend/.env` (see `backend/.env.example`): `PORT`, `DATABASE_URL`, `FIREBASE_PROJECT_ID`,
`FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `CORS_ORIGIN`. Frontend `frontend/.env`
(see `frontend/.env.example`): `VITE_FIREBASE_*` web config.

## Linting

```bash
yarn lint                                  # check everything (exit 1 on errors)
./node_modules/.bin/biome check --fix .    # auto-fix safe issues
```

Biome covers `backend/` and `frontend/` from the repo root via `biome.json` — recommended lint
rules, import sorting, tabs, and double quotes for JS/TS.

## Tailwind CSS

Tailwind v4 via the `@tailwindcss/vite` plugin — no `tailwind.config.js`. Design tokens live in an
`@theme {}` block in `frontend/src/styles/index.css`.
