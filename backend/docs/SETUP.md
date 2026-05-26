# NoteDeck backend setup

Everything needed to run the NoteDeck backend locally: a **MySQL** database (accessed via
**Prisma**) for notes data, and **Firebase Authentication** for accounts. Folders and pages
are stored in MySQL and scoped per user; Firebase issues the ID token that every API request
must carry.

---

## 1. Prerequisites

- Node 20+ and Yarn (via Corepack) — already used by the monorepo.
- MySQL 8+.
- Access to the Firebase project (`ferinotedeck`) as an admin.

---

## 2. MySQL — local setup

1. Install and start MySQL:
   ```sh
   brew install mysql
   brew services start mysql
   ```
2. Create the database and a dedicated user (run inside `mysql -u root`):
   ```sql
   CREATE DATABASE notedeck;
   CREATE USER 'notedeck'@'localhost' IDENTIFIED BY 'notedeck';
   GRANT ALL PRIVILEGES ON notedeck.* TO 'notedeck'@'localhost';
   FLUSH PRIVILEGES;
   ```
3. The connection string goes in `backend/.env` (next section) as:
   ```
   DATABASE_URL="mysql://notedeck:notedeck@localhost:3306/notedeck"
   ```
4. Create the tables and the typed Prisma client:
   ```sh
   yarn workspace notedeck-backend prisma:push      # syncs schema.prisma into MySQL
   yarn workspace notedeck-backend prisma:generate  # generates the Prisma client
   ```
   `prisma generate` also runs automatically on `yarn install` and `yarn build`.

> We use `prisma db push` rather than `prisma migrate dev` because the local `notedeck` user
> has no permission to create Prisma's migration "shadow database". `db push` syncs the
> schema directly — fine for development.

The schema lives in `backend/prisma/schema.prisma`.

---

## 3. Firebase — connecting the project

For the **Firebase project admin** ([console.firebase.google.com](https://console.firebase.google.com)).

### 3a. Enable Email/Password sign-in
**Authentication → Sign-in method →** enable **Email/Password**.

### 3b. Frontend web config → `frontend/.env`
**Project settings → General → Your apps →** open (or add) a **Web app** and copy its config
into `frontend/.env` (template: `frontend/.env.example`):
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```
These values are public (they ship in the browser bundle) — that's expected for Firebase web
apps.

### 3c. Backend service account → `backend/.env`
**Project settings → Service accounts → Generate new private key →** download the JSON. Copy
three values from it into `backend/.env`:
```
FIREBASE_PROJECT_ID=<project_id>
FIREBASE_CLIENT_EMAIL=<client_email>
FIREBASE_PRIVATE_KEY=<private_key>
```
Paste the private key as a **single line**, keeping its literal `\n` sequences (the backend
un-escapes them at startup). The service account is **secret** — `backend/.env` is gitignored;
never commit it.

---

## 4. Environment files

`backend/.env` (copy from `backend/.env.example`):
```
PORT=3001
DATABASE_URL="mysql://notedeck:notedeck@localhost:3306/notedeck"
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
CORS_ORIGIN=http://localhost:5173
```

`frontend/.env` — the `VITE_FIREBASE_*` values from step 3b.

Both `.env` files are gitignored; the committed `.env.example` files are templates.

---

## 5. Run

From the repo root:
```sh
yarn install   # once
yarn dev       # backend :3001, frontend :5173, Storybook :6006
```
Open http://localhost:5173 → register an account at `/register` → notes persist to MySQL.

Swagger API docs: http://localhost:3001/api-docs

Quick check that data is persisting:
```sh
mysql -u notedeck -pnotedeck notedeck -e "SELECT title FROM Page;"
```

---

## 6. Data model (ER diagram)

```mermaid
erDiagram
    User ||--o{ Folder : owns
    User ||--o{ Page : owns
    User ||--o{ FlashcardFolder : owns
    User ||--o{ Deck : owns
    User ||--o{ FlashCard : owns
    User ||--o{ Review : owns
    User ||--o| StudySettings : has
    Folder ||--o{ Page : contains
    FlashcardFolder ||--o{ Deck : contains
    Deck ||--o{ FlashCard : contains
    FlashCard ||--o{ Review : logs

    User {
        string id PK "Firebase UID"
        string email
        string username "unique, nullable"
        string avatarUrl "nullable"
        datetime createdAt
    }
    Folder {
        string id PK "uuid"
        string userId FK
        string name
        string color
        int order
        boolean collapsed
    }
    Page {
        string id PK "uuid"
        string userId FK
        string folderId FK
        string title
        longtext content
        int order
    }
    FlashcardFolder {
        string id PK "uuid"
        string userId FK
        string name
        string color
        boolean collapsed
        int order
    }
    Deck {
        string id PK "uuid"
        string userId FK
        string folderId FK
        string name
        int order
    }
    FlashCard {
        string id PK "uuid"
        string userId FK
        string deckId FK
        string type "rate | boolean | input"
        text question
        text answer
        int order
        string state "new|learning|review|relearning"
        bigint due "unix ms, nullable"
        bigint intervalSec
        int ease "permille"
        int reps
        int lapses
        int learningStep
        bigint lastReviewedAt "unix ms, nullable"
    }
    Review {
        string id PK "uuid"
        string userId FK
        string cardId FK
        string deckId
        bigint reviewedAt "unix ms"
        int grade "1-4"
        string prevState
        string newState
        bigint prevIntervalSec
        bigint newIntervalSec
        int prevEase
        int newEase
        bigint prevDue "nullable"
        bigint newDue
        int elapsedMs "nullable"
    }
    StudySettings {
        string id PK "uuid"
        string userId FK "unique"
        int newCardsPerDay
        int maxReviewsPerDay
        json learningStepsSec
        json relearningStepsSec
        int graduatingIntervalDays
        int easyIntervalDays
        int startingEase "permille"
        int easyBonusPermille
        int hardMultiplierPermille
        int intervalModifierPermille
        int maxIntervalDays
        int newDayStartsAtHour
    }
```

- **Cascade deletes**: deleting a `User` removes all their rows; deleting a `Folder`
  removes its pages; deleting a `FlashcardFolder` → its decks → their cards; deleting a
  `Deck` removes its cards; deleting a `FlashCard` removes its `Review` rows.
- `Page.content` is the note body as one markdown string (the block editor's
  `<<<NoteDeckMD>>>` format).
- **Flashcard scheduling** (the `FlashCard` SM-2 fields, `Review` revlog, `StudySettings`)
  is documented in `frontend/docs/flashcards.md`. All scheduling timestamps are **unix
  milliseconds** stored as `BigInt`; durations are seconds; ease is permille (2500 = 2.5×).
- **Images / avatars are not in the database** — they upload to `POST /api/images` /
  `POST /api/users/me/avatar`, are stored as files under `backend/uploads/<uid>/`
  (gitignored), and referenced by URL (in `Page.content` / `User.avatarUrl`).

---

## 7. API overview

All `/api/*` routes require an `Authorization: Bearer <Firebase ID token>` header
(verified by `firebase-admin`); requests are scoped to the authenticated user. Interactive
docs are at `http://localhost:3001/api-docs` (Swagger, generated from `@openapi` JSDoc).

Notes:
- `GET/POST /api/folders`, `PATCH/DELETE /api/folders/:id`, `PUT /api/folders/order`
- `GET/POST /api/pages`, `GET/PATCH/DELETE /api/pages/:id`, `PUT /api/pages/order`
- `POST /api/images` — image upload (multipart); files served from `GET /api/images/...`

Flashcards:
- `GET/POST /api/flashcard-folders`, `PATCH/DELETE /api/flashcard-folders/:id`, `PUT /api/flashcard-folders/order`
- `GET/POST /api/decks`, `PATCH/DELETE /api/decks/:id`, `PUT /api/decks/order`
- `GET /api/decks/:id/queue` — due study queue + counts (daily limits); `POST /api/decks/:id/reset`
- `GET/POST /api/cards`, `PATCH/DELETE /api/cards/:id`
- `POST /api/cards/:id/answer` — grade a card (SM-2 + revlog); `POST /api/cards/:id/reset`

Account:
- `GET/PATCH /api/users/me`, `GET /api/users/check-username/:username`, `POST /api/users/me/avatar`
- `GET/PATCH /api/users/me/study-settings` — spaced-repetition defaults
