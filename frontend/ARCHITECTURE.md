# Frontend architecture

NoteDeck frontend — Vite + React 19, Tailwind v4, react-router. Feature-organized so the app
can grow (flashcards, auth, a markdown editor are all planned). The notes feature currently
runs on **dummy data** behind a swappable service layer.

## Directory layout (`src/`)

```
main.jsx              entry — mounts <RouterProvider>
routes/
  router.jsx          createBrowserRouter route table
  RootLayout.jsx      shared shell (<Outlet/>)
pages/
  NotesPage.jsx       "/"          two-panel notes UI (auth-gated)
  LoginPage.jsx       "/login"     Firebase email/password sign-in
  RegisterPage.jsx    "/register"  Firebase sign-up
features/auth/        AuthContext (Firebase) + firebaseError helper
features/notes/       everything specific to the notes feature
  NotesContext.jsx    state provider + useNotes() hook
  Sidebar / SidebarHeader / ViewToggle / UserProfileRow
  FolderList / FolderItem / PageList / PageItem
  FolderPreview / PagePreview   static rows for the drag overlay/placeholder
  AddFolderButton / FolderModal / AccountModal
  NotePanel / FlashcardsPlaceholder
  editor/             block-based note editor (see "Note editor" below)
components/            shared, feature-agnostic UI
                       Icon, Modal, Pill, ContextMenu, ConfirmDialog, DuoButton
services/
  notesService.js     API-shaped facade — fetch() to the backend
hooks/                reusable hooks — useContextMenu, useResizableWidth
lib/                  constants.js (tokens, enums), id.js, firebase.js
assets/               Logo.png, icons/*.svg
styles/index.css      Tailwind import + @theme design tokens
```

## Data flow

Components never touch the network directly. They call `NotesContext` actions, which call
`services/notesService.js` — an API-shaped facade whose functions (`listFolders`,
`createFolder`, `deleteFolder`, `reorderFolders`, `createPage`, `updatePage`, `deletePage`,
`savePages`, `uploadImage`, …) `fetch` the Express backend at `/api/folders`, `/api/pages`,
`/api/images`. Every request carries the current Firebase user's ID token as a
`Bearer` header. The backend persists to MySQL (see `backend/docs/SETUP.md`).

Entities (ids assigned by the server, data scoped per user):
- `Folder { id, name, color, order, collapsed }` — `color` is a key (`"red"`…`"purple"`).
- `Page { id, folderId, title, content, order }` — `content` is the note body as one
  markdown string, edited by the block editor (see "Note editor").

## Auth

`features/auth/AuthContext.jsx` wraps Firebase Authentication (`lib/firebase.js`): `login` /
`register` / `logout` and `{ user, loading }` from `onAuthStateChanged`. `ProtectedRoute`
gates `/` on `user`. `notesService` reads the ID token straight from the Firebase SDK
(`auth.currentUser.getIdToken()`), so it stays free of React context.

## State — NotesContext

`features/notes/NotesContext.jsx` is a React Context provider holding `folders`, `pages`,
`view`, `selectedPageId`, `loading`. It loads data via the service on mount and exposes action
callbacks (`addFolder`, `editFolder`, `removeFolder`, `toggleCollapsed`, `addPage`,
`renamePage`, `updatePageContent`, `removePage`, `selectPage`, `setView`, `handleDndOver`,
`handleDndEnd`). Consume it with `useNotes()`. A future flashcards feature should get its own
context under `features/flashcards/`.

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
- Not built yet: flashcards logic.
