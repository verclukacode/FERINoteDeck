# NoteDeck

A simple full-stack notes app — Express REST API backend with a React + Vite frontend.

## Design
[Figma design](https://www.figma.com/design/6tgxbVBCI2aQEKWJ6ljoyo/NoteDeck?node-id=2028-172&t=TxnQ93y2De1SI7VC-1)

## Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express 5, TypeScript, tsx |
| Frontend | React 19, Vite, Tailwind CSS v4 |
| Component docs | Storybook 10 (React + Vite) |
| API docs | Swagger UI (swagger-jsdoc + swagger-ui-express) |
| Linting | Biome (lint + format, whole monorepo) |
| Monorepo | Yarn workspaces + concurrently |

## Getting started

**Prerequisites**: Node.js ≥ 18, Yarn 1.x

```bash
# Install all workspace dependencies
yarn

# Start everything (backend + frontend + Storybook)
yarn dev
```

| Service | URL |
|---|---|
| Backend API | http://localhost:3000 |
| Swagger UI | http://localhost:3000/api-docs |
| Frontend | http://localhost:5173 |
| Storybook | http://localhost:6006 |

## Scripts

From the **repo root**:

```bash
yarn dev        # Start backend, frontend, and Storybook concurrently
yarn build      # Compile backend TS + Vite production build
yarn lint       # Run Biome checks across the whole monorepo
```

Per workspace (if needed):

```bash
yarn workspace notedeck-backend dev       # Backend only (tsx watch)
yarn workspace notedeck-backend build     # Compile TypeScript → dist/

yarn workspace notedeck-frontend dev      # Frontend only (Vite)
yarn workspace notedeck-frontend build    # Vite production build
yarn workspace notedeck-frontend storybook         # Storybook dev server
yarn workspace notedeck-frontend build-storybook   # Build static Storybook
```

## Project structure

```
FERINoteDeck/
├── package.json          # Yarn workspaces root + Biome config
├── biome.json            # Biome lint/format config
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts      # Express app entry point + Swagger setup
│       └── routes/
│           └── notes.ts  # Notes CRUD router (with @openapi JSDoc)
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── .storybook/
    │   ├── main.ts
    │   └── preview.ts
    └── src/
        ├── App.jsx
        ├── main.jsx
        ├── index.css     # Tailwind entry (@import "tailwindcss")
        └── components/
            ├── NoteCard.jsx          # Reusable note card component
            └── NoteCard.stories.jsx  # Storybook stories
```

## API

Base URL: `http://localhost:3000/api`

| Method | Path | Description |
|---|---|---|
| `GET` | `/notes` | List all notes |
| `GET` | `/notes/:id` | Get a note by ID |
| `POST` | `/notes` | Create a note `{ title, content? }` |
| `PUT` | `/notes/:id` | Update a note `{ title?, content? }` |
| `DELETE` | `/notes/:id` | Delete a note |

> Notes are stored **in-memory** — data is lost when the backend restarts.

## Swagger / API docs

Swagger UI is available at **http://localhost:3000/api-docs** when the backend is running.

API documentation is generated from `@openapi` JSDoc comments in `backend/src/routes/notes.ts` using `swagger-jsdoc`. The OpenAPI 3.0 spec is served by `swagger-ui-express`.

## Linting

```bash
yarn lint                                        # Check everything (exit 1 on errors)
./node_modules/.bin/biome check --fix .          # Auto-fix safe issues
./node_modules/.bin/biome check --fix --unsafe . # Also apply unsafe fixes
```

Biome covers both `backend/` and `frontend/` from the repo root using `biome.json`. It enforces recommended lint rules, import sorting, tab indentation, and double quotes for JS/TS.

## Configuration

Copy `backend/.env.example` to `backend/.env` and adjust as needed:

```env
PORT=3000
```

## Tailwind CSS

Uses Tailwind v4 — no `tailwind.config.js` required. Content scanning is automatic via the `@tailwindcss/vite` plugin. Add custom tokens with `@theme {}` in `src/index.css` if needed.
