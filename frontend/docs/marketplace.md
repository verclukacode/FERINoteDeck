# NoteDeck marketplace (share + clone)

Users can publish any of their **notes** or **flashcard decks** to the marketplace,
browse what others have shared, and **clone** items into their own account where they can
edit them freely. Clones are independent rows — un-publishing the source hides the
listing but does not affect existing clones. Frontend code lives in
`frontend/src/features/marketplace/`; the share toggle lives in
`frontend/src/components/ShareModal.jsx`; the backend router is
`backend/src/routes/marketplace.ts`.

## Data model

Sharing is denormalised on the existing `Page` and `Deck` models — there is no
polymorphic Listing table. The same three fields on each:

- `isPublic` — boolean, default `false`.
- `publicDescription` — nullable text (the author-written blurb shown in listings).
- `publishedAt` — nullable `DateTime`; set when `isPublic` flips on, cleared when off.
  Drives the marketplace recency sort. Editing the description does **not** bump it.

An index `@@index([isPublic, publishedAt])` on both tables backs the marketplace query.

## Privacy

The marketplace router only ever selects `username` + `avatarUrl` from the author —
`email` is **never** queried, so it cannot leak through any response. Avatars are
served by the public static `/api/images/<uid>/<file>` mount (no auth required), so
`<img src={author.avatarUrl}>` works in the modal without a token.

## Backend (`backend/src/routes/marketplace.ts`)

All endpoints behind `requireAuth`. None of them require ownership of the item —
they're public reads — except clone, which validates ownership of the **target folder**.

| Endpoint | Purpose |
|---|---|
| `GET /api/marketplace?q=&kind=note\|deck\|all&offset=&limit=` | Mixed paginated listing, sorted by `publishedAt desc`. `q` matches title/name, public description, **and author username**. |
| `GET /api/marketplace/notes/:id` | Full public note (title, content, author). 404 if not `isPublic`. |
| `GET /api/marketplace/decks/:id` | Public deck + its cards. Selects only `id, type, question, answer, order` on each card to avoid the BigInt scheduling fields. |
| `POST /api/marketplace/notes/:id/clone` body `{ folderId }` | Copies the note into the caller's folder. Returns the new page. |
| `POST /api/marketplace/decks/:id/clone` body `{ folderId }` | In a transaction: creates a fresh deck + copies cards (scheduling fields omitted so Prisma defaults apply ⇒ all `state="new"`). Returns `{ deck, cards }`. |

Publishing/un-publishing rides on the existing `PATCH /api/pages/:id` and
`PATCH /api/decks/:id` — they now also accept `isPublic` and `publicDescription`, and
set/clear `publishedAt` on the transition.

## Frontend

### State + plumbing

- `frontend/src/services/marketplaceService.js` — `listMarketplace`, `getMarketplaceNote`,
  `getMarketplaceDeck`, `cloneMarketplaceNote`, `cloneMarketplaceDeck`. Uses the same
  Firebase-`Bearer` `apiRequest` pattern as `notesService.js` (small helper duplicated for
  now — TODO: extract a shared `services/api.js`).
- `NotesContext` gains `updatePageShare(id, patch)` and `addPageFromClone(page)`.
  `FlashcardsContext` gains `updateDeckShare(id, patch)` and `addDeckFromClone({deck, cards})`.

### UI

- **`MarketplaceModal`** — wide centered modal, list on the left (cards), preview on
  the right. Toolbar has a search input + a tabs strip (All / Notes / Flashcards) that
  matches the main `ViewToggle`. The store icon in `SidebarHeader` opens this modal
  (the open state lives in `NotesWorkspace`).
- **`MarketplaceCard`** — one row: kind icon, title, truncated description, author
  avatar + `@username`.
- **`MarketplacePreview`** — fetches the selected item on `(kind,id)` change and
  renders read-only:
  - Notes via `NoteReadView`, which mirrors `EditorBlock`'s exact styling (headings,
    bullet / numbered / task lists, image, separator) using the editor's `parse` and
    `contentToHtml` helpers.
  - Decks as a list of question/answer cards with a `2.5px` separator between Q and A.
  - Header has **Copy link** (writes the deep link to the clipboard) and **Clone**.
- **`CloneFolderPickerDialog`** — small modal listing the user's folders of the
  matching kind. A **"+ New folder"** option at the top opens the existing
  `FolderModal` / `FlashcardFolderModal` and **auto-clones into the freshly created
  folder** (`addFolder` was extended to return the new row; the modals expose an
  `onCreated(folder)` callback).
- **`ShareModal`** (`components/ShareModal.jsx`) — opens from the paperplane button in
  `NotePanel` / `DeckPanel`. Public toggle + description textarea (max 280) + Save.
  When the toggle is on, a **Shareable link** panel appears with a read-only input and
  a Copy button (with a "Save first" hint if the toggle hasn't been committed yet).

### Deep links + auth-preserved redirects

Listings have shareable URLs of the form `${origin}/?market=<kind>:<id>` built by
`buildMarketplaceLink` (`features/marketplace/marketplaceLink.js`).

- **Signed in:** `NotesPage` reads the `market` query param on mount, opens the
  marketplace modal pre-selected at that item, and strips the param so refreshes don't
  reopen it. Pasting a marketplace URL into the modal's search box jumps straight to
  the referenced item.
- **Signed out:** `ProtectedRoute` redirects to `/login` with
  `state={{ from: location }}`. `LoginPage`, `RegisterPage`, `VerifyEmailPage`, and
  `ChooseUsernamePage` all route back to `from.pathname + from.search` via the shared
  `lib/postAuthDest.js` helper — so the original `/?market=…` URL survives the entire
  sign-up / verification / username flow.

### Visual indicators

Public items show a small `store` icon next to their name in the sidebar (`PageItem`
for notes, `DeckRow` inside `DeckFolderItem` for flashcards).

## Known limitations

- Search is `LIKE %q%` over title/description/username — no full-text or ranking.
- Pagination is offset-based with an over-fetch+interleave merge on the server;
  fine for the current scale, would want keyset for large volumes.
- Clones lose the original's scheduling history (intentional — each user has their own
  study progress) and don't track lineage back to the source.
