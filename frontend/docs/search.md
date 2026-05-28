# NoteDeck search

A single search input — opened from the magnifying-glass icon next to the
Notes/Flashcards toggle — that matches across the caller's **notes, decks and
flashcards** at once, ranks the hits, and on click switches the view, expands the
parent folder, and selects the target. Frontend lives in
`frontend/src/features/search/`; the backend route is `backend/src/routes/search.ts`.

## Why backend-side

Search is server-side so the data never has to be fully loaded on the client and so
results are always scoped to the authenticated user. The client just debounces and
renders.

## Backend (`GET /api/search?q=…`)

Behind `requireAuth`. Returns `{ items: Result[] }` (max 30). For each model the
endpoint pulls the top 50 most-recently-updated rows whose searchable fields
`contains: q` (Prisma case-insensitive `LIKE`), then scores them in Node.

Searched fields:

| Kind | Fields searched |
|---|---|
| **Note** (Page) | `title`, `content` |
| **Deck** | `name` |
| **Card** (FlashCard) | `question`, `answer` |

For cards, the deck's `folderId` is fetched via a `select:` join (no `include:`, so
the BigInt scheduling fields never enter the response and crash `res.json`).

### Relevance scoring

`scoreField(field, term)` returns:

- `1000` if the field equals the term
- `500` if the field **starts with** the term
- `100 − position` (floored at 10) for an interior substring match
- `0` otherwise

Per-kind weights:

- Note: `title × 5 + content × 1`
- Deck: `name × 5`
- Card: `question × 3 + answer × 1`

All matches are merged into one list, sorted by total score descending, capped at
30 results.

### Result shape

```ts
{ kind: "note" | "deck" | "card",
  id: string,
  title: string,           // note title / deck name / card question
  subtitle: string,        // ~100-char snippet around the matched substring
  folderId?: string,       // for notes/decks: own folderId; for cards: deck.folderId
  deckId?: string,         // cards only
  score: number }
```

## Frontend (`features/search/SearchModal.jsx`)

A Spotlight-style modal opened from the search icon in `SidebarHeader` (the open
state is held in `NotesWorkspace` and threaded down via an `onOpenSearch` prop).

- Autofocused input at the top, 200 ms debounce → `searchService.search(q)`.
- Results list below: each row shows an icon (`document` for notes, `flashcards`
  for decks/cards), the title, the snippet, and a small Note / Deck / Card pill.
- Empty / loading / error states are explicit; Esc and the close button dismiss.

### Clicking a result

Reads `setView`, `editFolder`, `selectPage` from `useNotes()` and `editFolder`,
`selectDeck`, `selectCard` from `useFlashcards()` (aliased to disambiguate):

- **Note** → `setView("notes")` + `editNoteFolder(folderId, {collapsed: false})` +
  `selectPage(id)`.
- **Deck** → `setView("flashcards")` + `editFlashcardFolder(folderId, {collapsed: false})`
  + `selectDeck(id)`.
- **Card** → flashcards view, expand the parent deck's folder, `selectDeck(deckId)`,
  `selectCard(id)`.

## Known limitations

- Matches are simple `LIKE %q%`; no multi-word AND, no stemming, no full-text
  ranking. Adequate for personal-scale data.
- Pagination isn't implemented — first 30 results only.
