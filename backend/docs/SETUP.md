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

## 2. MySQL — Docker Compose

The repo ships a `db/docker-compose.yml` that runs **MySQL 8** in a container. Data is
persisted in `db/data/` (gitignored, so it survives restarts but is not committed).

1. Make sure **Docker** (Desktop or Engine) is installed and running.
2. Start the container:
   ```sh
   yarn db:up          # from the repo root
   ```
   This is also run automatically as a `predev` hook, so `yarn dev` starts the database
   for you.
3. The connection string (already set in `backend/.env.example`) is:
   ```
   DATABASE_URL="mysql://notedeck:notedeck@localhost:3306/notedeck"
   ```
4. Create the tables and the typed Prisma client:
   ```sh
   yarn workspace notedeck-backend prisma:push      # syncs schema.prisma into MySQL
   yarn workspace notedeck-backend prisma:generate  # generates the Prisma client
   ```
   `prisma generate` also runs automatically on `yarn install` and `yarn build`.

**Other useful DB commands** (all run from the repo root):
```sh
yarn db:ready   # start container and wait until MySQL is healthy (used by yarn setup)
yarn db:logs    # stream MySQL container logs
yarn db:down    # stop the container (data is preserved in db/data/)
```

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

# AI Import (optional — leave empty to disable the feature)
OPENAI_API_KEY=...                    # platform.openai.com → API keys, server-only
```

`frontend/.env` — the `VITE_FIREBASE_*` values from step 3b.

Both `.env` files are gitignored; the committed `.env.example` files are templates.

**AI Import notes.** The "Import files (AI)" button in the notes sidebar lets users upload
PDFs / DOCX / PPTX / TXT / MD / images plus a prompt and get a generated NoteDeck note back.
Access is gated by **`User.tier`** in the database — every account starts at `basic` and is
blocked from the feature (the button is hidden in the UI and `POST /api/import` returns
403). Raising a user to `pro` or `premium` unlocks the feature:

```sql
UPDATE User SET tier = 'pro' WHERE username = '<their-username>';
```

If `OPENAI_API_KEY` is unset the endpoint returns 503 regardless of tier. Calls use
`gpt-4o-mini` with structured output; per-file cap is 10 MB, total cap is 20 MB, prompt cap
is 1500 characters.

---

## 5. Run

From the repo root — **first time only**:
```sh
yarn setup     # installs deps, starts MySQL (waits until healthy), creates tables via prisma db push
```

Every time after that:
```sh
yarn dev       # starts the MySQL container (predev), then backend :3001, frontend :5173, Storybook :6006
```
Open http://localhost:5173 → register an account at `/register` → notes persist to MySQL.

Swagger API docs: http://localhost:3001/api-docs

Quick check that data is persisting:
```sh
mysql -u notedeck -pnotedeck -h 127.0.0.1 -P 3306 notedeck -e "SELECT title FROM Page;"
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
    User ||--o{ NoteInvite : "sends/receives"
    User ||--o{ DeckInvite : "sends/receives"
    User ||--o{ CalendarTag : owns
    User ||--o{ CalendarEvent : owns
    Folder ||--o{ Page : contains
    FlashcardFolder ||--o{ Deck : contains
    Deck ||--o{ FlashCard : contains
    Deck ||--o{ DeckInvite : "is invited from"
    Page ||--o{ NoteInvite : "is invited from"
    FlashCard ||--o{ Review : logs
    CalendarTag ||--o{ CalendarEvent : "tags"

    User {
        string id PK "Firebase UID"
        string email
        string username "unique, nullable"
        string avatarUrl "nullable"
        string tier "basic | pro | premium — gates AI import"
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
        boolean isPublic "marketplace"
        text publicDescription "nullable"
        datetime publishedAt "nullable"
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
        boolean isPublic "marketplace"
        text publicDescription "nullable"
        datetime publishedAt "nullable"
        string sharedFromDeckId "nullable; lineage from a deck-invite clone"
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
    NoteInvite {
        string id PK "uuid"
        string senderId FK
        string recipientId FK
        string pageId FK
        string status "pending | accepted | declined"
        datetime createdAt
        datetime updatedAt
    }
    DeckInvite {
        string id PK "uuid"
        string senderId FK
        string recipientId FK
        string deckId FK "source (owner's) deck"
        string status "pending | accepted | declined"
        datetime createdAt
        datetime updatedAt
    }
    CalendarTag {
        string id PK "cuid"
        string userId FK
        string name
        string color
        datetime createdAt
    }
    CalendarEvent {
        string id PK "cuid"
        string userId FK
        string tagId FK "nullable; SetNull on tag delete"
        string name
        text description "nullable"
        datetime date
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
- **Marketplace sharing** is denormalised on `Page` and `Deck` (`isPublic`,
  `publicDescription`, `publishedAt`) — see `frontend/docs/marketplace.md`. Cloning a
  public note/deck creates an independent row owned by the cloner; unsharing the source
  hides the listing but does not affect existing clones.
- **Direct sharing** — notes use `NoteInvite` (true shared content: collaborators edit
  the same `Page` row). Decks use `DeckInvite` plus a **clone-on-accept** model: when a
  recipient accepts, the backend creates an independent `Deck` row + fresh `FlashCard`
  rows (per-user scheduling) and stamps `Deck.sharedFromDeckId = sourceDeckId` to track
  lineage. The leaderboard endpoint walks this lineage to rank all members of the source
  deck by average `FlashCard.ease` (see §8 SM-2 state diagram and §9 use-case diagram).
- **Calendar** — `CalendarTag` (name + color) and `CalendarEvent` (name, date, optional
  description + tag). Tag deletion sets `CalendarEvent.tagId = NULL` (SetNull) rather
  than cascading, so events survive when their colour-coding is removed.

---

## 7. API overview

All `/api/*` routes require an `Authorization: Bearer <Firebase ID token>` header
(verified by `firebase-admin`); requests are scoped to the authenticated user. Interactive
docs are at `http://localhost:3001/api-docs` (Swagger, generated from `@openapi` JSDoc).

Notes:
- `GET/POST /api/folders`, `PATCH/DELETE /api/folders/:id`, `PUT /api/folders/order`
- `GET/POST /api/pages`, `GET/PATCH/DELETE /api/pages/:id`, `PUT /api/pages/order`
- `GET /api/pages/shared` — notes shared with me (accepted invites). `PATCH` lets owners edit any
  field; collaborators may only patch `title`/`content`, never marketplace fields.
- `POST /api/images` — image upload (multipart, multer); enforces mimetype + extension allowlist
  and verifies magic bytes after write. Files served from `GET /api/images/...` with `helmet`
  headers (`X-Content-Type-Options: nosniff`, `Content-Disposition: inline`).

Flashcards:
- `GET/POST /api/flashcard-folders`, `PATCH/DELETE /api/flashcard-folders/:id`, `PUT /api/flashcard-folders/order`
- `GET/POST /api/decks`, `PATCH/DELETE /api/decks/:id`, `PUT /api/decks/order`
- `GET /api/decks/:id/queue` — due study queue + counts (daily limits); `POST /api/decks/:id/reset`
- `GET /api/decks/:id/leaderboard` — members-only ranking of `AVG(FlashCard.ease)` per member;
  resolves the canonical source via `Deck.sharedFromDeckId` and aggregates everyone whose deck
  points back at it.
- `GET/POST /api/cards`, `PATCH/DELETE /api/cards/:id`
- `POST /api/cards/:id/answer` — grade a card (SM-2 + revlog); `POST /api/cards/:id/reset`

Direct sharing:
- `POST /api/invites` — send a note invite by `@username`. `GET /api/invites` lists my pending
  ones; `GET /api/invites/sent?pageId=` lists accepted recipients for a page I own;
  `PATCH /api/invites/:id` accepts or declines; `DELETE /api/invites/:id` lets the owner revoke.
- `POST /api/deck-invites` — send a deck invite. `GET /api/deck-invites` lists pending;
  `PATCH /api/deck-invites/:id` accepts (server clones the deck into the recipient's first
  folder — auto-creates a "Shared decks" folder if needed — and stamps
  `sharedFromDeckId = sourceDeckId`) or declines. **Owner-only**: 403 if the source deck is
  itself a clone (`sharedFromDeckId !== null`).

Account:
- `GET/PATCH /api/users/me`, `GET /api/users/check-username/:username`, `POST /api/users/me/avatar`
- `GET/PATCH /api/users/me/study-settings` — spaced-repetition defaults

Marketplace (public notes + decks):
- `PATCH /api/pages/:id` / `PATCH /api/decks/:id` also accept `{ isPublic, publicDescription }` to publish/unpublish.
  **Owner-only**: for decks, 403 if the row is a shared clone; for pages, collaborators are blocked
  by the patch handler (only `title`/`content` allowed).
- `GET /api/marketplace?q=&kind=note|deck|all&offset=&limit=` — paginated mixed listing
- `GET /api/marketplace/notes/:id` / `/decks/:id` — fetch a public item for preview
- `POST /api/marketplace/notes/:id/clone` / `/decks/:id/clone` — clone into a folder you own.
  Deck clones via this endpoint have `sharedFromDeckId = null` (fully independent — they do **not**
  appear on the source's leaderboard).

Calendar:
- `GET/POST /api/calendar-tags`, `PATCH/DELETE /api/calendar-tags/:id`
- `GET /api/calendar-events?from=&to=`, `POST /api/calendar-events`,
  `PATCH/DELETE /api/calendar-events/:id`
- `GET /api/calendar-events/upcoming` — warning/urgent buckets for the next 3 days
  (consumed by `CalendarToasts`).

Search:
- `GET /api/search?q=` — mixed, relevance-sorted matches across the caller's notes
  (title + content), decks (name), and cards (question + answer). See `frontend/docs/search.md`.

---

## 8. Flashcard scheduler (SM-2 state diagram)

Card transitions in `backend/src/lib/srs.ts`. Grades are **1=Again, 2=Hard, 3=Good, 4=Easy**.
`learningStepsSec`/`relearningStepsSec` (per-user from `StudySettings`) drive how many short
steps a card takes before graduating; `easyBonusPermille`, `hardMultiplierPermille`, and
`intervalModifierPermille` shape the review interval; `ease` is permille (starts at 2500).

```mermaid
stateDiagram-v2
    [*] --> new : card created
    new --> learning : grade 1-3 (start at step 0)
    new --> review : grade 4 (Easy — skips learning, uses easyIntervalDays)

    learning --> learning : grade 1 (reset to step 0) / grade 2-3 (advance one step)
    learning --> review : final step graded Good, OR grade 4 (Easy)

    review --> review : grade 2-4 (interval grows by ease + multiplier; ease adjusts)
    review --> relearning : grade 1 (lapse — interval reset, lapses++, drops ease)

    relearning --> relearning : grade 1 (reset to step 0) / grade 2-3 (advance)
    relearning --> review : final relearning step graded Good
```

Notes:
- Every grade also writes a `Review` row capturing prev/new state, interval, ease, due, and
  client-reported `elapsedMs`. The revlog is the audit trail and the source for analytics.
- `POST /api/decks/:id/reset` and `POST /api/cards/:id/reset` send affected cards back to `new`
  but keep the `Review` rows untouched.
- The study day rolls over at `StudySettings.newDayStartsAtHour` (default 4am local) — daily
  `newCardsPerDay` and `maxReviewsPerDay` caps reset at that boundary.

---

## 9. Use-case diagram

High-level capabilities by actor. (Mermaid `flowchart` standing in for UML use-cases.)

```mermaid
flowchart LR
    Guest((Guest))
    User((Authenticated User))
    Owner((Note/Deck Owner))
    Member((Shared Member))

    Guest --> UC_Register[Register / Verify email]
    Guest --> UC_Login[Log in]
    Guest --> UC_Username[Choose username]

    User --> UC_Notes[Manage notes — folders, pages, block editor]
    User --> UC_Decks[Manage decks & cards]
    User --> UC_DnD[Drag-and-drop reorder — folders, pages, decks]
    User --> UC_Study[Study deck — SM-2 grading]
    User --> UC_StudyStats[View today's study stats — count, avg grade, time]
    User --> UC_Streak[View study streak]
    User --> UC_Activity[View 30-day activity chart]
    User --> UC_CardBar[See card-state distribution bar]
    User --> UC_Calendar[Manage calendar events & tags]
    User --> UC_Upcoming[Get upcoming-event toasts — 3-day buckets]
    User --> UC_Search[Search across notes, decks, cards]
    User --> UC_Browse[Browse marketplace]
    User --> UC_Clone[Clone a public note / deck]
    User --> UC_Image[Upload images — validated mimetype + magic bytes]
    User --> UC_PDF[Export note as PDF]
    User --> UC_Account[Edit profile, avatar, study settings]
    User --> UC_AvatarDel[Delete avatar locally]
    User --> UC_Notif[Open notifications inbox — note + deck invites]

    Owner --> UC_Publish[Publish to marketplace — isPublic, publicDescription]
    Owner --> UC_Invite[Invite by username — note or deck]
    Owner --> UC_RevokeNote[Revoke note collaborator]
    Owner --> UC_RevokeDeck[Revoke deck collaborator]
    Owner --> UC_AvatarsNote[See collaborator avatars on shared notes]
    Owner --> UC_AvatarsDeck[See member avatars on shared decks]
    Owner --> UC_Leader[View deck leaderboard]

    Member --> UC_Edit[Edit shared note title / content]
    Member --> UC_StudyShared[Study a shared deck clone]
    Member --> UC_Leader
    Member --> UC_Presence[See live presence on shared note — who else is viewing]
    Owner --> UC_Presence

    UC_Invite -.-> UC_Notif
    UC_Clone -.-> UC_Notes
    UC_Clone -.-> UC_Decks
    UC_Image -.-> UC_Notes
    UC_PDF -.-> UC_Notes
```

Owner vs. Member is a per-resource role: each user is the owner of resources they created and a
member of resources shared with them. The backend enforces this — `PATCH /api/decks/:id` and
`POST /api/deck-invites` return 403 when a non-owner attempts to publish or re-invite from a clone,
and `PATCH /api/pages/:id` restricts collaborators to `title`/`content` only.

---

## 10. Sequence diagram — deck invite, accept, study, leaderboard

End-to-end cross-feature flow exercising authentication, the invite router, the shared
`cloneDeckForUser` transaction, SRS scheduling, and the leaderboard endpoint.

```mermaid
sequenceDiagram
    autonumber
    actor A as User A (Owner)
    actor B as User B (Recipient)
    participant FE as Frontend (React + Vite)
    participant BE as Backend (Express)
    participant DB as MySQL (Prisma)
    participant FB as Firebase Auth

    A->>FE: Open Deck → click paperplane
    FE->>FE: ShareModal: enter @userB, debounced check
    FE->>BE: POST /api/deck-invites { deckId, username }
    Note over BE,DB: requireAuth verifies Firebase ID token<br/>and UPSERTs the User row (id, email)
    BE->>DB: SELECT deck WHERE id=? AND userId=A
    Note over BE: 403 if deck.sharedFromDeckId !== null<br/>(owner-only: members can't re-share a clone)
    BE->>DB: SELECT user WHERE username=?
    Note over BE: 400 if recipient is the sender (self-invite)
    BE->>DB: UPSERT DeckInvite (status=pending)
    BE-->>FE: 201 { invite }

    B->>FE: Open NotificationsModal (bell)
    FE->>BE: GET /api/deck-invites
    BE->>DB: SELECT pending invites for B
    BE-->>FE: [{ invite, sender, deck }]

    B->>FE: Click Accept
    FE->>BE: PATCH /api/deck-invites/:id { action:"accept" }
    BE->>DB: SELECT first FlashcardFolder for B (orderBy order asc)
    alt B has no folders
        BE->>DB: INSERT FlashcardFolder { name:"Shared decks", color:"purple" }
    end
    Note over BE,DB: prisma.$transaction (atomic from here)
    BE->>DB: UPDATE DeckInvite status=accepted
    BE->>DB: cloneDeckForUser: INSERT Deck (sharedFromDeckId=source)
    BE->>DB: createMany FlashCard (fresh scheduling — defaults)
    BE-->>FE: 200 { invite, deck, cards }
    FE->>FE: FlashcardsContext.addDeckFromClone

    B->>FE: Open cloned deck → Study
    FE->>BE: GET /api/decks/:id/queue
    BE->>DB: SELECT due cards (daily caps via StudySettings)
    BE-->>FE: { counts, cards }
    loop For each card
        B->>FE: Reveal + grade (1..4)
        FE->>BE: POST /api/cards/:id/answer { grade }
        BE->>BE: schedule() — SM-2
        BE->>DB: UPDATE FlashCard, INSERT Review
        BE-->>FE: serialized updated card
    end

    A->>FE: Open source deck → click Leaderboard
    FE->>BE: GET /api/decks/:id/leaderboard
    BE->>DB: SELECT deck (id, userId, sharedFromDeckId)
    Note over BE: resolve sourceDeckId = sharedFromDeckId ?? id
    Note over BE: 404 "Not a member" unless caller<br/>owns source OR owns a clone of it
    BE->>DB: findMany Deck WHERE id=source OR sharedFromDeckId=source
    BE->>DB: groupBy FlashCard.deckId, AVG(ease), COUNT
    BE-->>FE: [{ userId, username, avgEase, cardCount, isOwner, isMe }]
    FE->>FE: DeckLeaderboardModal renders ranked list
```

Key design choices visible here: ID-token verification happens **per request** (stateless backend),
the accept handler is a **single Prisma transaction** so a partial clone never leaks, and the
leaderboard endpoint is **read-only aggregation** over each member's local `FlashCard` rows — no
need for a shared scheduling table.

---

## 11. Activity diagram — grading one flashcard

Flow inside `POST /api/cards/:id/answer`, illustrating the branching that the SM-2 scheduler
performs and the daily-cap interaction with the revlog. Drawn as a Mermaid flowchart with
decision diamonds (Mermaid does not have a native UML activity notation, but the spec allows
"druge tehnike" so long as the activity is conveyed).

```mermaid
flowchart TD
    Start([User reveals card, picks grade 1..4]) --> Auth[requireAuth verifies Firebase token]
    Auth --> Load[Load FlashCard + StudySettings]
    Load --> State{Card state?}

    State -->|new / learning / relearning| NewSeed{First time seen?<br/>(state = new)}
    NewSeed -->|yes| AdoptEase[ease = settings.startingEase]
    NewSeed -->|no| LearnGrade
    AdoptEase --> LearnGrade{Grade?}
    LearnGrade -->|1 Again| ResetSteps[Reset to step 0, due = now + step duration]
    LearnGrade -->|2 Hard| RepeatStep[Repeat current step, due = now + step duration]
    LearnGrade -->|3 Good| AdvanceStep[Advance one step]
    LearnGrade -->|4 Easy| GraduateEasy[Graduate to review, interval = easyIntervalDays, reps++]
    AdvanceStep --> LastStep{Past final step?}
    LastStep -->|yes| GraduateGood[Graduate to review, interval = graduatingIntervalDays, reps++]
    LastStep -->|no| StayLearning[Stay in steps, due = now + next step]
    ResetSteps --> WriteCard
    RepeatStep --> WriteCard
    StayLearning --> WriteCard
    GraduateEasy --> Modifier
    GraduateGood --> Modifier

    State -->|review| ReviewGrade{Grade?}
    ReviewGrade -->|1 Again| Lapse[Lapse: state=relearning, lapses++, ease -= 200 permille, restart relearning steps]
    ReviewGrade -->|2 Hard| Hard[interval x hardMultiplier, ease -= 150 permille, reps++]
    ReviewGrade -->|3 Good| Good[interval x ease/1000, ease unchanged, reps++]
    ReviewGrade -->|4 Easy| Easy[interval x ease/1000 x easyBonus, ease += 150 permille, reps++]
    Lapse --> WriteCard
    Hard --> Modifier
    Good --> Modifier
    Easy --> Modifier
    Modifier["Apply intervalModifierPermille<br/>ensure +1d minimum vs previous interval<br/>cap at maxIntervalDays<br/>clamp ease ≥ 1300<br/>(review intervals only — learning/relearning steps bypass this)"] --> WriteCard

    WriteCard[Transaction: UPDATE FlashCard with new state/due/ease/reps/lapses] --> WriteReview[INSERT Review row with prev/new snapshot + elapsedMs]
    WriteReview --> Serialize[serialize BigInt fields → JSON]
    Serialize --> Resp([Return updated card])
```

The revlog write is inside the same transaction as the card update, so a crashed request can
never leave a card scheduled forward without an audit row — and `Review.reviewedAt` is what the
queue endpoint counts against `newCardsPerDay` / `maxReviewsPerDay`, so the cap honours the
revlog as the source of truth.

---

## 12. Deployment diagram — production topology + CI/CD

Production runs in a single VM, fronted by Nginx, with backend and frontend each shipped as
Docker images published to GHCR by GitHub Actions. Firebase Auth is consumed by **both** sides
(frontend SDK for sign-in; backend Admin SDK for verification).

```mermaid
flowchart LR
    subgraph Dev["Developer workstation"]
        git[git push origin main]
    end

    subgraph GH["GitHub"]
        repo[(Repository)]
        actions[Actions workflow]
        ghcr[(GHCR<br/>container registry)]
    end

    subgraph VM["Production VM (Linux)"]
        sysnginx["System Nginx<br/>(TLS terminator, public :80/:443)"]
        subgraph Compose["docker-compose.prod.yml"]
            fe["notedeck-frontend container<br/>nginx:alpine + Vite static build<br/>published as 127.0.0.1:8080 → :80<br/>proxies /api/* → backend:3001"]
            be["notedeck-backend container<br/>Node + Express + Prisma<br/>:3001 (internal only)"]
            mysql[(notedeck-db container<br/>MySQL 8 + named volume db_data)]
            uploads[(named volume<br/>uploads → /app/backend/uploads)]
        end
    end

    subgraph Ext["External services"]
        fbauth[Firebase Authentication]
    end

    user((End user<br/>Browser))

    git --> repo
    repo --> actions
    actions -->|build + push images| ghcr
    actions -->|SSH deploy| Compose
    Compose -->|docker pull| ghcr

    user -->|HTTPS| sysnginx
    sysnginx -->|reverse proxy to 127.0.0.1:8080| fe
    fe -->|/api/* via Docker network| be
    fe -->|/ → SPA index.html fallback| user
    be -->|Prisma over Docker network| mysql
    be -->|read/write uploaded files| uploads
    be -->|verifyIdToken| fbauth
    user -->|sign-in JS SDK| fbauth

    classDef ext fill:#ffe4b5,stroke:#cc8800,color:#000
    class fbauth ext
```

Key choices:
- **Two-layer nginx** — the VM's **system nginx** is the public TLS entry point; it reverse-proxies
  to the frontend container which itself runs **nginx:alpine** (from the multi-stage Dockerfile)
  to serve the static React build and forward `/api/*` to the Node container on the Docker
  network. The frontend container is bound to `127.0.0.1` so it can't be reached directly from
  outside. The **system nginx config is not tracked in this repo** — it's manually provisioned
  by the operator on the VM and points at `127.0.0.1:8080`.
- **Single VM, docker-compose** — no Kubernetes; the project's scale doesn't justify the
  operational overhead, and rollback is `docker pull <prev-sha> && docker-compose up -d`.
- **GHCR for image storage** — same auth as the repo; no separate registry credentials.
- **Browser sees one origin** — `/` serves the SPA, `/api/*` reaches the backend through the
  same hostname (both layers of nginx preserve the path), so CORS is a non-issue in prod.
- **Firebase Auth as the only external dependency** — keeps the VM stateless except for the
  MySQL data volume; tokens are verified per-request, no session store.
- **MySQL inside docker-compose, not managed** — fine for a school project; data lives on a
  named Docker volume that survives container restarts. For real production you'd move the DB
  to RDS / Cloud SQL.

The end-to-end CI/CD narrative (workflow file paths, secrets, rollback) is in
[`docs/deployment.md`](../../docs/deployment.md); this diagram is the visual companion.
