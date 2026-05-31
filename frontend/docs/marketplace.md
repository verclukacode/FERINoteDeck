# NoteDeck marketplace (publish, browse, clone) + direct sharing

This doc covers three related flows:

1. **Marketplace** — publish a note/deck publicly so anyone can browse and clone it.
2. **Direct note sharing** — invite a specific `@username` to **collaborate** on a note
   (shared content; both users edit the same `Page`).
3. **Direct deck sharing + leaderboard** — invite a specific `@username` to **study** a deck.
   On accept the backend clones the deck and back-links it (`Deck.sharedFromDeckId`); all
   members appear on a per-deck leaderboard ranked by avg SM-2 ease.

Frontend code lives in `frontend/src/features/marketplace/` and `frontend/src/features/notes/` /
`frontend/src/features/flashcards/`; the share modal is `frontend/src/components/ShareModal.jsx`
(reused for all three flows); the backend routers are `backend/src/routes/marketplace.ts`,
`backend/src/routes/invites.ts`, and `backend/src/routes/deck-invites.ts`.

**Marketplace** clones are fully independent — un-publishing the source hides the listing but
does not affect existing clones, and they do **not** appear on the source's leaderboard
(`sharedFromDeckId` is null for marketplace clones, non-null only for deck-invite clones).

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

## Direct note sharing

Mirror UX for true shared content (both users see and edit the same `Page`).

Schema: `NoteInvite { id, senderId, recipientId, pageId, status, createdAt, updatedAt }` with
`@@unique([recipientId, pageId])`.

### Backend (`backend/src/routes/invites.ts`)

| Endpoint | Purpose |
|---|---|
| `POST /api/invites` body `{ pageId, username }` | Sender must own the page. Upserts a pending invite (re-invites flip back to `pending`). |
| `GET /api/invites` | Pending invites where I'm the recipient — used to populate `NotificationsModal`. |
| `GET /api/invites/sent?pageId=` | Accepted recipients for a page I own — drives the "People with access" list in `ShareModal`. |
| `GET /api/invites/sent/all` | Compact map of `{pageId → accepted recipients}` for sidebar avatars (`PageItem`). |
| `PATCH /api/invites/:id` body `{ action: "accept"|"decline" }` | Recipient transitions status. |
| `DELETE /api/invites/:id` | Owner revokes a previously-accepted invite. |

`PATCH /api/pages/:id` allows the owner to edit all fields. **Collaborators** (accepted invitees)
may only patch `title`/`content`; if a non-owner tries to set `isPublic`/`publicDescription` the
handler silently drops those fields (the path is read-only for marketplace).

### Frontend

- `NotesContext` owns `sharedPages` (notes shared with me), `pendingInvites` (pending received),
  `pageShares` (map `pageId → recipients` for my owned pages), and the actions `acceptInvite`,
  `declineInvite`, `revokeShare`.
- `NotePanel` hides the paperplane button when the selected page is in `sharedPages` (collaborator
  view).
- `ShareModal` (for `kind="note"`) shows a "Direct share" input + "People with access" list with
  Remove buttons. The list is passed in as the `sharedWith` prop + `onRevoke` callback (owner-only
  view).
- `PageItem` in the sidebar renders up to 3 collaborator avatars next to each shared note title.
- Shared notes appear in the sidebar's "Shared" section (`SharedPageItem` rows) on the recipient's
  side.

## Direct deck sharing + leaderboard

Clone-on-accept model. Each accepted invitee gets their own copy of the deck (independent
`FlashCard` rows + fresh scheduling), back-linked via `Deck.sharedFromDeckId`. The leaderboard
endpoint walks this lineage to rank every member by their average SM-2 ease.

Schema:
- `Deck.sharedFromDeckId String?` (`@@index([sharedFromDeckId])`) — null for originals and
  marketplace clones; set on every clone produced by a `DeckInvite` accept.
- `DeckInvite { id, senderId, recipientId, deckId, status, createdAt, updatedAt }` with
  `@@unique([recipientId, deckId])`.

### Backend (`backend/src/routes/deck-invites.ts`, `decks.ts`)

| Endpoint | Purpose |
|---|---|
| `POST /api/deck-invites` body `{ deckId, username }` | Sender must own the deck. **403** if the deck is itself a shared clone (`sharedFromDeckId !== null`). Upserts a pending invite. |
| `GET /api/deck-invites` | Pending invites where I'm the recipient. |
| `PATCH /api/deck-invites/:id` body `{ action: "accept"|"decline" }` | On accept: in a transaction, flip status + call `cloneDeckForUser(tx, …)` to copy the deck into the recipient's first folder (auto-creates a "Shared decks" folder if none exists) with `sharedFromDeckId = sourceDeckId`. Returns `{ invite, deck, cards }`. |
| `GET /api/decks/:id/leaderboard` | Members-only. Resolves the canonical source via `sharedFromDeckId`, finds every deck whose `sharedFromDeckId = sourceDeckId` (plus the source itself), aggregates `AVG(FlashCard.ease)` and card count per member, and returns `[{userId, username, avatarUrl, avgEase, cardCount, isOwner, isMe}]` sorted by `avgEase` desc. `avgEase` is permille — divide by 1000 for display. |

`PATCH /api/decks/:id`: when a non-owner sets `isPublic` or `publicDescription` on a clone, the
handler returns **403** — only the original owner can publish a deck to the marketplace.

The shared `cloneDeckForUser(tx, …)` helper in `backend/src/lib/cloneDeck.ts` is also used by the
marketplace deck clone endpoint (with `sharedFromDeckId: null`).

### Frontend

- `flashcardsService.js` exposes `sendDeckInvite`, `getDeckInvites`, `respondDeckInvite`,
  `getDeckLeaderboard`.
- `FlashcardsContext` owns `pendingDeckInvites` + `acceptDeckInvite` / `declineDeckInvite`.
  Accept hydrates the freshly-cloned deck and cards into local state via the existing
  `addDeckFromClone` (creating the "Shared decks" folder locally if the server made one).
- `NotificationsModal` lists both note and deck invites; the bell badge in `SidebarHeader` sums
  both counts.
- `ShareModal` (for `kind="deck"`) shows the same "Direct share" input as notes (routing through
  `sendDeckInvite`). The "People with access" list is **note-only**; deck members are surfaced via
  the Leaderboard instead.
- `DeckPanel` prefetches the leaderboard on deck change to learn the member count, and renders the
  **Leaderboard** button only when `members >= 2`. Clicking it opens `DeckLeaderboardModal` with
  avatar, `@username`, avg ease (`(ease / 1000).toFixed(2)`), and card count per member; `isMe` is
  highlighted, `isOwner` shows an "Owner" pill.
- `DeckPanel` hides the paperplane (Share) button when the selected deck has `sharedFromDeckId !==
  null` — members can't re-share someone else's deck via their clone.
- `DeckFolderItem` renders a small paperplane badge next to shared clones in the sidebar.

## Known limitations

- Marketplace search is `LIKE %q%` over title/description/username — no full-text or ranking.
- Pagination is offset-based with an over-fetch+interleave merge on the server; fine for the
  current scale, would want keyset for large volumes.
- Deck clones drift: the owner adding/removing cards does **not** propagate to existing member
  clones. Each member has their own static copy. True shared deck content would require moving
  scheduling off `FlashCard` into a per-user `CardProgress` table — separate, larger effort.
- The leaderboard's avg ease is computed across whatever cards each member currently has, so
  drift in card counts is visible only as the `cardCount` column.
