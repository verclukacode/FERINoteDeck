# Frontend architecture

NoteDeck frontend — Vite + React 19, Tailwind v4, react-router. Feature-organized: notes
(block editor + direct sharing), flashcards (Anki-style spaced repetition + leaderboard),
calendar (month/week views), marketplace (public publish + clone), and Firebase auth.
Data is persisted to MySQL via the backend, behind a per-feature service layer.

## Directory layout (`src/`)

```
main.jsx              entry — mounts <RouterProvider>
routes/
  router.jsx          createBrowserRouter route table
  RootLayout.jsx      shared shell (<Outlet/>)
  ProtectedRoute.jsx  redirects to /login if no Firebase user
pages/
  NotesPage.jsx           "/"                 main shell with sidebar + view-switch
  LoginPage.jsx           "/login"            Firebase email/password sign-in
  RegisterPage.jsx        "/register"         Firebase sign-up
  VerifyEmailPage.jsx     "/verify-email"     post-signup verification
  ChooseUsernamePage.jsx  "/choose-username"  one-time username picker
features/auth/        AuthContext (Firebase) + firebaseError helper
features/notes/       everything specific to the notes feature
  NotesContext.jsx    state provider + useNotes() hook — owns pages, sharedPages,
                      pendingInvites, pageShares (people-with-access per page)
  Sidebar / SidebarHeader / ViewToggle / UserProfileRow
  FolderList / FolderItem / PageList / PageItem (with collaborator avatars)
  SharedPageItem.jsx          row used in the sidebar's "Shared" section
  NotificationsModal.jsx      unified inbox for note + deck invites
  FolderPreview / PagePreview static rows for the drag overlay/placeholder
  AddFolderButton / FolderModal / AccountModal
  NotePanel                   paperplane hidden when the page is a shared collaborator view
  editor/                     block-based note editor (see "Note editor" below)
features/flashcards/  spaced-repetition flashcards (see frontend/docs/flashcards.md)
  FlashcardsContext.jsx   state provider + useFlashcards() hook — owns decks, cards,
                          pendingDeckInvites
  DeckList / DeckFolderItem / DeckPanel / CardDetails
  StudySession.jsx        full-screen Anki-style study overlay
  DeckLeaderboardModal.jsx  members ranked by avg SM-2 ease (button shown if ≥2 members)
features/marketplace/ public share + clone flow (see frontend/docs/marketplace.md)
  MarketplaceModal / MarketplaceCard / MarketplacePreview / NoteReadView
  CloneFolderPickerDialog.jsx  destination picker (with inline "new folder")
  marketplaceLink.js           build / parse `?market=kind:id` deep links
features/calendar/    event + tag CRUD with month/week views
  CalendarContext.jsx     state provider + useCalendar() hook
  CalendarModal.jsx       overlay shell switching between views
  CalendarMonthView.jsx / CalendarWeekView.jsx
  EventFormModal.jsx / EventItem.jsx
  CalendarToasts.jsx      "warning/urgent" upcoming-event toasts (next 3 days)
features/search/      cross-feature search (see frontend/docs/search.md)
  SearchModal.jsx       Spotlight-style overlay; switches view + selects on pick
components/            shared, feature-agnostic UI
                       Icon, Modal, Pill, ContextMenu, ConfirmDialog, DuoButton, ShareModal
services/
  notesService.js        notes + note invites (send, list pending, list sent, revoke, accept/decline)
  flashcardsService.js   folders/decks/cards/queue/answer/settings + deck invites + leaderboard
  marketplaceService.js  list/get/clone for public notes & decks
  calendarService.js     tags + events + upcoming buckets
  searchService.js       relevance-sorted hits across notes/decks/cards
hooks/                reusable hooks — useContextMenu, useResizableWidth
lib/                  constants.js (tokens, enums), id.js, firebase.js, postAuthDest.js
assets/               Logo.png, icons/*.svg, avatars/*, userProfilePic.svg, pencil.svg
styles/index.css      Tailwind import + @theme design tokens
stories/Backend.mdx   Storybook reference page for the backend surface
```

## Data flow

Components never touch the network directly. They call the relevant feature Context's actions,
which call the corresponding `services/*.js` facade. Each facade `fetch`es the Express backend
with the current Firebase user's ID token as a `Bearer` header. The backend persists to MySQL
(see `backend/docs/SETUP.md`).

Per-feature service files:
- `notesService.js` → `/api/folders`, `/api/pages`, `/api/images`, `/api/invites/*`
- `flashcardsService.js` → `/api/flashcard-folders`, `/api/decks`, `/api/cards`,
  `/api/decks/:id/leaderboard`, `/api/deck-invites/*`, `/api/users/me/study-settings`
- `marketplaceService.js` → `/api/marketplace/*`
- `calendarService.js` → `/api/calendar-tags`, `/api/calendar-events`
- `searchService.js` → `/api/search`

Entities (ids assigned by the server, data scoped per user):
- `Folder { id, name, color, order, collapsed }` — `color` is a key (`"red"`…`"purple"`).
- `Page { id, folderId, title, content, order, isPublic, publicDescription, publishedAt }` —
  `content` is the note body as one markdown string, edited by the block editor.
- `Deck { id, folderId, name, order, isPublic, publicDescription, publishedAt, sharedFromDeckId }`
  — `sharedFromDeckId` is non-null when the deck is a clone produced by accepting a `DeckInvite`;
  it back-links to the source row and is what the leaderboard endpoint walks.
- `CalendarEvent { id, name, date, description, tagId }` paired with `CalendarTag { id, name, color }`.

## Auth

`features/auth/AuthContext.jsx` wraps Firebase Authentication (`lib/firebase.js`): `login` /
`register` / `logout` and `{ user, loading }` from `onAuthStateChanged`. `ProtectedRoute`
gates `/` on `user`. `notesService` reads the ID token straight from the Firebase SDK
(`auth.currentUser.getIdToken()`), so it stays free of React context.

## State — NotesContext

`features/notes/NotesContext.jsx` is a React Context provider holding `folders`, `pages` (owned),
`sharedPages` (notes shared with me), `pendingInvites` (note invites awaiting my response),
`pageShares` (recipients-with-access per page, for owner views), `view`, `selectedPageId`,
`loading`, and account fields (`username`, `avatarUrl`). It loads everything in parallel on mount
and exposes action callbacks for folder/page CRUD + drag-drop, plus invite ops (`acceptInvite`,
`declineInvite`, `revokeShare`) and marketplace publishing (`updatePageShare`). Consume it with
`useNotes()`. The `view` toggle (notes/flashcards) lives here; flashcards have their own
`FlashcardsContext` under `features/flashcards/` (see `frontend/docs/flashcards.md`).

`features/flashcards/FlashcardsContext.jsx` mirrors the shape: `folders`, `decks`, `cards`,
`pendingDeckInvites`, selection state, plus actions including `acceptDeckInvite` /
`declineDeckInvite` (which push the freshly-cloned deck + cards into local state via the existing
`addDeckFromClone`), `updateDeckShare` (marketplace), and the SM-2 hooks (`resetCard`, `resetDeck`).

`features/calendar/CalendarContext.jsx` holds tags + events with `add` / `update` / `delete` /
`refreshUpcoming` and is consumed by both the modal and the toaster.

## Sharing model

**Notes** — true shared content. `NoteInvite` flips to `accepted` and the recipient sees the
**same** `Page` row (under the "Shared" sidebar section via `SharedPageItem`). They can edit
title/content; they **cannot** publish to the marketplace or invite others. `PageItem` in the
sidebar shows up to 3 collaborator avatars next to each owner's shared page, sourced from
`pageShares` in `NotesContext`. The owner manages the access list inside `ShareModal`'s "People
with access" block (with per-recipient Remove buttons backed by `revokeShare`).

**Decks** — clone-on-accept. `DeckInvite` accept triggers the backend `cloneDeckForUser` helper:
the recipient gets an independent `Deck` row + fresh `FlashCard` rows + `sharedFromDeckId` set to
the source. Each member's progress is private; the leaderboard endpoint walks the lineage to rank
everyone by `AVG(FlashCard.ease)`. The Leaderboard button (`DeckLeaderboardModal`) appears in
`DeckPanel` only when `memberCount >= 2` — `DeckPanel` prefetches the leaderboard on deck change
to know. The paperplane is hidden on shared clones (`sharedFromDeckId !== null`) so members can't
re-share someone else's content; the backend enforces the same restriction with 403s.

`NotificationsModal` is one bell-icon inbox listing both kinds of pending invites — sources
`pendingInvites` from `useNotes()` and `pendingDeckInvites` from `useFlashcards()` and renders
them through a shared `InviteCard`. `SidebarHeader`'s badge sums both counts.

## Note editor

`features/notes/editor/` is a block-based editor mounted in `NotePanel` (keyed by page id so
it remounts per page). It edits `Page.content`, which is **one markdown string** — there is no
per-block storage.

- 8 block types: `h1`, `h2`, `text`, `bullet`, `numbered`, `task`, `image`, `separator`.
- `markdown.js` `parse()`/`serialize()` convert between the string and the block array. The
  string is wrapped in a `<<<NoteDeckMD>>>` sentinel; plain text lines that look like a marker
  are backslash-escaped for a clean round-trip.
- `BlockEditor.jsx` owns the block array + all cross-block keyboard logic; `EditorBlock.jsx`
  is one `contentEditable` block with auto-format, inline bold (`**…**`) and auto-linked URLs
  (`inlineFormat.js` helpers).
- **No auto-save**: `BlockEditor` exposes `save()` (via `ref`) and reports a `dirty` flag;
  `NotePanel`'s Save button calls `save()` → `updatePageContent`. Switching pages discards
  unsaved edits.
- Images are uploaded to `/api/images` (`uploadImage`) and stored as files server-side; the
  markdown holds a `![](/api/images/…)` URL, not base64.
- Full UX and storage details: `docs/editor.md`.

## Drag-and-drop

`@dnd-kit`. A **single** `DndContext` in `FolderList` drives everything:
- Folders are sortable among themselves.
- Each expanded folder renders a `SortableContext` for its pages (nested in the same
  `DndContext`), so pages reorder within a folder **and move between folders**.

Each sortable carries `data.current.type` (`"folder"` / `"page"`). `handleDndOver` relocates a
page live as it's dragged over another folder; `handleDndEnd` settles the final order with
`arrayMove`, recomputes each page's per-folder `order`, and persists.

A `DragOverlay` shows the held item: `FolderItem`/`PageItem` render a dimmed fixed-height
placeholder while dragging, and the overlay renders `FolderPreview`/`PagePreview` following the
cursor — so a held (possibly expanded) folder keeps a stable size instead of stretching.

## Styling

Tailwind v4 via the `@tailwindcss/vite` plugin — no `tailwind.config.js`. Design tokens are
defined in an `@theme {}` block in `styles/index.css`, yielding utilities like `text-title`,
`bg-bg-secondary`, `border-border-soft`, `text-folder-blue`.

Per-folder colors are **dynamic**, so they are applied via inline `style={{ color: hex }}`
using `folderHex(colorKey)` from `lib/constants.js` — never via constructed class names (Tailwind's
JIT would purge them).

`components/DuoButton.jsx` is the Duolingo-style button — flat color, 2.5px border, and a solid
offset shadow that the button sinks into on press. Pass the bg/text/shadow via `className`
(e.g. `bg-body text-bg shadow-[0_2.5px_0_#5b5b5b]`). Modals use a matching flat `0 5px 0` card
shadow.

The sidebar width is user-resizable: `hooks/useResizableWidth.js` tracks a drag handle and
persists the width to `localStorage`.

## Icons

SVGs live in `assets/icons/` with `fill="currentColor"` so they recolor via CSS `color`.
`components/Icon.jsx` imports them with Vite's `?raw` query and renders by name:
`<Icon name="folder" size={20} style={{ color: hex }} />`.

## Conventions

- All files `.jsx`. Minimal comments — only where intent is non-obvious.
- Lint/format: Biome (repo root `biome.json`) — tabs, double quotes, import sorting.
