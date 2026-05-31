# NoteDeck — Frontend

Vite + React 19 + Tailwind v4 SPA. The full repo overview is at the project root
([../README.md](../README.md)); this file documents the frontend workspace specifically.

## Stack
- **Vite 8** with the React 19 plugin (HMR + production bundling).
- **React Router** — auth-gated SPA routing.
- **Tailwind CSS v4** via `@tailwindcss/vite` — no `tailwind.config.js`; design tokens live in
  an `@theme {}` block in `src/styles/index.css`.
- **Firebase JS SDK** — email/password auth; the ID token is attached as `Bearer` to every API call.
- **Storybook 10** — component sandbox at `:6006` (dev-only; never part of `yarn build`).
- **Biome** — lint/format from the repo root.

## Commands

From the **repo root** (preferred):

```sh
yarn workspace notedeck-frontend dev          # Vite dev server on :5173
yarn workspace notedeck-frontend build        # production build → dist/
yarn workspace notedeck-frontend storybook    # Storybook on :6006
```

The Vite dev server proxies `/api` → `http://localhost:3001` (see `vite.config.js`), so
the frontend calls `/api/...` directly when the backend is running locally.

## Code layout

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full `src/` walkthrough. Headline directories:

- `src/pages/` — top-level routes (NotesPage, LoginPage, RegisterPage, VerifyEmailPage,
  ChooseUsernamePage).
- `src/features/` — feature modules (`notes/`, `flashcards/`, `marketplace/`, `calendar/`,
  `search/`, `auth/`). Each owns its own React Context, components, and stories.
- `src/services/` — typed-ish API facades (notes, flashcards, marketplace, calendar, search).
- `src/components/` — shared primitives (Modal, Icon, Pill, DuoButton, ShareModal, …).
- `src/assets/`, `src/styles/`, `src/lib/`, `src/hooks/` — assets, Tailwind theme, constants,
  shared hooks.

## Feature docs
- [docs/editor.md](docs/editor.md) — block-based note editor (markdown sentinel).
- [docs/flashcards.md](docs/flashcards.md) — SM-2 spaced repetition + deck invites + leaderboard.
- [docs/marketplace.md](docs/marketplace.md) — publish, browse, clone (notes + decks).
- [docs/search.md](docs/search.md) — Spotlight-style cross-feature search.

## Storybook

Every shared component has a `*.stories.jsx` next to it with `@storybook/test` interaction
tests. Backend reference lives in `src/stories/Backend.mdx`. Update it whenever the API
surface or data model changes.
