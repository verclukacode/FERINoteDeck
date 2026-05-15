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
  NotesPage.jsx       "/"          two-panel notes UI
  LoginPage.jsx       "/login"     stub
  RegisterPage.jsx    "/register"  stub
features/notes/       everything specific to the notes feature
  NotesContext.jsx    state provider + useNotes() hook
  Sidebar / SidebarHeader / ViewToggle / UserProfileRow
  FolderList / FolderItem / PageList / PageItem
  FolderPreview / PagePreview   static rows for the drag overlay/placeholder
  AddFolderButton / FolderModal
  NotePanel / FlashcardsPlaceholder
components/            shared, feature-agnostic UI
                       Icon, Modal, Pill, ContextMenu, ConfirmDialog, DuoButton
services/
  notesService.js     API-shaped facade — THE backend swap point
  localStorageRepo.js  localStorage persistence
data/seed.js          initial folders + pages (seeded on first load)
hooks/                reusable hooks — useContextMenu, useResizableWidth
lib/                  constants.js (tokens, enums), id.js
assets/               Logo.png, icons/*.svg
styles/index.css      Tailwind import + @theme design tokens
```

## Data flow & the backend swap

Components never touch storage directly. They call `NotesContext` actions, which call
`services/notesService.js`. The service is an API-shaped facade — every function is async and
named like a REST call (`listFolders`, `createFolder`, `deleteFolder`, `reorderFolders`,
`createPage`, `deletePage`, `savePages`, …).

Today the service delegates to `localStorageRepo.js`. **To connect the real backend, rewrite
only `notesService.js`** (e.g. swap the repo for a `fetch`-based client). No component, context,
or hook changes are needed because the signatures stay the same.

Entities:
- `Folder { id, name, color, order, collapsed }` — `color` is a key (`"red"`…`"purple"`).
- `Page { id, folderId, title, content, order }` — `content` is markdown (renderer not built yet).

Seed data is written to localStorage on first load only; later reorders/deletes/creates persist.

## State — NotesContext

`features/notes/NotesContext.jsx` is a React Context provider holding `folders`, `pages`,
`view`, `selectedPageId`, `loading`. It loads data via the service on mount and exposes action
callbacks (`addFolder`, `editFolder`, `removeFolder`, `toggleCollapsed`, `addPage`,
`removePage`, `selectPage`, `setView`, `handleDndOver`, `handleDndEnd`). Consume it with
`useNotes()`. A future flashcards feature should get its own context under
`features/flashcards/`.

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
- Not built yet: markdown renderer/editor, flashcards logic, auth logic.
