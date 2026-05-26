# NoteDeck flashcards & spaced repetition

Flashcards are organised **folder → deck → card**, scoped per user and persisted in
MySQL via Prisma. The Notes/Flashcards toggle in the sidebar swaps the notes UI for the
flashcards UI. Frontend code lives in `frontend/src/features/flashcards/`; the
scheduling logic is in `backend/src/lib/srs.ts`.

Studying uses an **Anki-style SM-2** scheduler: every answer reschedules the card and is
logged. **All scheduling timestamps are unix milliseconds (`BigInt`); durations are
seconds; ease is permille** (2500 = 2.5×). Backend responses run through
`backend/src/lib/serialize.ts` to turn `BigInt` into `Number` (otherwise `res.json`
throws).

## Data model (`backend/prisma/schema.prisma`)

- **FlashcardFolder** / **Deck** — grouping, each with `order` for drag-and-drop.
- **FlashCard** — `type`, `question`, `answer`, `order`, plus SM-2 state:
  `state` (`new|learning|review|relearning`), `due` (unix ms, null for new),
  `intervalSec`, `ease` (permille, floor 1300), `reps`, `lapses`, `learningStep`,
  `lastReviewedAt`.
- **Review** — the revlog: one row per answer (`grade`, `reviewedAt`, prev/new
  state·interval·ease·due, `elapsedMs`). Kept even after a card is reset.
- **StudySettings** — one row per user (profile-wide defaults; see below).

## Card types and grades

The scheduler is **type-agnostic** — it only takes a grade `1=Again 2=Hard 3=Good
4=Easy`. Each card type produces grades differently in the study UI:

| Type | How you answer | Grades emitted |
|---|---|---|
| `rate` | Reveal answer, self-rate Bad / Meh / Good / Amazing | 1 / 2 / 3 / 4 |
| `boolean` | Reveal answer, Wrong / Correct | 1 / 3 |
| `input` | Type the answer; auto-checked (trimmed, case-insensitive) | wrong→1, correct→3 |

## Scheduling (SM-2) — `backend/src/lib/srs.ts`

`schedule(card, grade, settings, nowMs)` is pure and deterministic (now is passed in).

- **New / learning** — walk `learningStepsSec` (default `1m, 10m`). Good advances a
  step; the last step **graduates** to `review` at `graduatingIntervalDays` (Easy
  graduates immediately at `easyIntervalDays`). Again restarts the steps.
- **Review** — Again → **lapse**: ease −20%, go to `relearning` (`relearningStepsSec`),
  `lapses++`. Hard → interval ×1.2, ease −15%. Good → interval ×ease. Easy → interval
  ×ease×easyBonus, ease +15%. Interval is multiplied by `intervalModifierPermille`,
  grows at least +1 day, and is capped at `maxIntervalDays`. Ease never drops below 1300.
- **Relearning** — walk the relearning steps, then re-graduate to `review`.

## Study flow

1. **Deck panel** shows `Study {n}` where `n` is the due count from
   `GET /api/decks/:id/queue` (disabled at 0).
2. The queue returns due cards + `{ new, learning, review }` counts, respecting daily
   limits: `newCardsPerDay` new and `maxReviewsPerDay` reviews per **study day**. The day
   boundary rolls over at `newDayStartsAtHour` (server-local time). "Done today" counts
   come from the revlog.
3. `StudySession.jsx` runs front → reveal → answer. Each answer calls
   `POST /api/cards/:id/answer`, which reschedules the card and writes a Review row in a
   transaction. The stats header shows **New | Learning | Review**.
4. **In-session learning steps**: a card whose next step is < 20 min out is re-shown
   later in the same session (re-queued a few cards back); longer intervals leave the
   session. Finishes when the queue empties ("You are done!").

## Reset ("Forget")

- **Card** — "Reset progress" in the card editor (`CardDetails.jsx`).
- **Deck** — "Reset deck" in the deck right-click menu (`DeckFolderItem.jsx`).

Both clear scheduling back to a new card (`POST /api/cards/:id/reset` /
`POST /api/decks/:id/reset`) but **keep the review history**.

## Study settings (profile-wide)

Edited in Account → **Study settings** (`AccountModal.jsx`), stored on `StudySettings`,
read/written via `GET`/`PATCH /api/users/me/study-settings` (created on first read with
defaults): new cards/day (20), max reviews/day (200), learning steps (`1m 10m`),
relearning steps (`10m`), graduating interval (1d), easy interval (4d), starting ease
(2.5), easy bonus (1.3), hard interval (1.2), interval modifier (100%), max interval
(36500d), new-day rollover hour (4). The UI shows minutes / multipliers / percent and
converts to the stored seconds / permille.

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/decks/:id/queue` | Due queue + counts (daily limits) |
| POST | `/api/cards/:id/answer` | Grade a card (SM-2 + revlog) |
| POST | `/api/cards/:id/reset` | Reset one card to new |
| POST | `/api/decks/:id/reset` | Reset every card in a deck |
| GET/PATCH | `/api/users/me/study-settings` | Read / update study defaults |

Plus the existing folder/deck/card CRUD and `/order` reorder routes.

## Known limitations

- Day rollover uses **server-local** time (no per-user timezone yet).
- Classic SM-2 only (no FSRS); interval fuzz is off (deterministic).
- The frontend data layer is `frontend/src/services/flashcardsService.js`; in-memory
  state + optimistic updates live in `FlashcardsContext.jsx`.
