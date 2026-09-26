# Couple Calendar

A full-stack shared calendar application built for two people. Both users share a single calendar space with real-time sync — when one person adds or edits an event, the other sees it instantly without refreshing.

**Live app (Railway — cloud hosted):** [couple-calendar-frontend-production.up.railway.app](https://couple-calendar-frontend-production.up.railway.app)

---

## Features

- **Shared calendar space** — two users paired via a 6-character invite code
- **Real-time sync** — changes appear instantly on both screens via WebSockets
- **Three calendar views** — month, week, and day
- **Full event management** — create, edit, and delete events with title, description, date/time, location, and colour tag
- **Email + password auth** — simple account creation, JWT-based sessions
- **In-app reminders** — toast notifications 30 and 10 minutes before upcoming events
- **Responsive design** — works on mobile and desktop
- **Persistent data** — PostgreSQL database, all events saved permanently

---

## How It Works (the simple version)

1. **You make an account** with your email and a password. The server gives your browser a "pass" (a JWT token) that proves who you are, so you don't have to log in every time.
2. **You pair up.** One person clicks *Create space* and gets a 6-letter code like `K7QX2M`. They send it to their partner, who types it into *Join with code*. Now both accounts point at the same "couple", and a couple can only have 2 people.
3. **You add events.** Events belong to the couple, not to one person, so both of you see and can edit everything.
4. **Changes show up live.** While the calendar is open, each browser keeps a WebSocket connection to the server (like an open phone line). When someone adds, edits or deletes an event, the server tells everyone on that couple's line and their calendar updates without a refresh.
5. **Reminders.** While the tab is open, the app checks every minute and pops up a message 30 and 10 minutes before an event.

The frontend (what you see, in `frontend/`) and the backend (the server + database, in `backend/`) are separate apps that talk over HTTP. The frontend never touches the database directly.

---

## Deployment Options

The app supports two deployment modes:

### ☁️ Cloud (Railway) — recommended
Hosted on [Railway](https://railway.app). Both users can access the app from anywhere in the world on any device — no local machine needed, no same WiFi requirement. Pushes to the `main` GitHub branch automatically redeploy the app.

- **Frontend:** Next.js service on Railway
- **Backend:** FastAPI service on Railway
- **Database:** Railway-managed PostgreSQL (persistent, never wiped)
- **Access:** Public HTTPS URL, works on any device anywhere

### 🖥️ Local (Docker Compose) — first version
Runs entirely on your own machine. Originally built before cloud deployment was added. Useful for development or if you want full local control with no external services.

- **Limitation:** Only accessible on your local machine (or home network via LAN)
- **Requirement:** Docker Desktop installed, machine must be running
- **Data:** Stored in a local Docker volume — persists between restarts unless you run `docker compose down -v`

---

## Tech Stack

### Backend
| Technology | Purpose |
|---|---|
| **Python / FastAPI** | REST API framework — handles all business logic and HTTP endpoints |
| **SQLAlchemy (async)** | ORM — maps Python classes to database tables, handles all queries |
| **Alembic** | Database migrations — version-controls the schema |
| **PostgreSQL** | Primary database — stores users, couples, and events |
| **WebSockets (FastAPI)** | Real-time sync — pushes event changes to connected clients instantly |
| **python-jose** | JWT token creation and validation for auth sessions |
| **passlib + bcrypt** | Secure password hashing |
| **Pydantic** | Request/response validation and serialisation |
| **Uvicorn** | ASGI server that runs the FastAPI app |

### Frontend
| Technology | Purpose |
|---|---|
| **Next.js 14 (App Router)** | React framework — handles routing, server/client components |
| **React** | UI component library |
| **TypeScript** | Type safety across all frontend code |
| **Tailwind CSS** | Utility-first CSS framework for styling |
| **date-fns** | Date manipulation — calendar grid generation, formatting, comparisons |
| **lucide-react** | Icon library |
| **react-hot-toast** | In-app toast notifications for reminders and feedback |
| **WebSocket API (browser)** | Connects to the FastAPI WebSocket endpoint for real-time updates |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Railway** | Cloud hosting for backend, frontend, and database |
| **Docker / Docker Compose** | Local development environment — one command to run everything |
| **GitHub** | Source control and Railway deployment trigger |

---

## Running Locally (Docker)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Start everything with one command

```bash
git clone https://github.com/ddcn-ware/couple-calendar.git
cd couple-calendar

# docker compose needs these env files to exist (the defaults work for local)
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API + docs: http://localhost:8000/docs
- Migrations run automatically on startup

### Load test data (optional)

```bash
docker compose exec backend python scripts/seed.py
```

Creates two paired accounts with 8 sample events over the next two weeks:

| Email | Password |
|---|---|
| `alice@example.com` | `password123` |
| `bob@example.com` | `password123` |

⚠️ The seed script **deletes all existing users, couples and events** first, so only run it on a local database.

### Stop

```bash
docker compose down        # stop (data preserved)
docker compose down -v     # stop and wipe database
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                  │
│  Login → Pair → Calendar (Month / Week / Day views)      │
│  WebSocket client for real-time event updates            │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS REST + WebSocket
┌──────────────────────▼──────────────────────────────────┐
│                    Backend (FastAPI)                      │
│  /auth  — register, login, JWT session                   │
│  /couple — create space, join with code                  │
│  /events — CRUD, broadcasts changes via WebSocket        │
│  /ws/{couple_id} — WebSocket connection per couple       │
└──────────────────────┬──────────────────────────────────┘
                       │ SQLAlchemy async
┌──────────────────────▼──────────────────────────────────┐
│                   PostgreSQL Database                     │
│  users · couples · events  (+ unused magic_tokens)       │
└─────────────────────────────────────────────────────────┘
```

### Data model

```
User ──── couple_id ──▶ Couple ◀──── invite_code (6 chars)
                           │
Event ──── couple_id ──────┘
      ──── creator_id ──▶ User
```

- A **User** has no couple until they create or join one (`couple_id` is null).
- A **Couple** has at most 2 members. This is checked in `POST /couple/join`, not by the database.
- **Events** belong to the couple, so either partner can edit or delete any event. `creator_id` is only used to show "Created by …".
- `magic_tokens` is left over from the first version, which used email magic-link login. Nothing uses it now, but it stays because it's part of the first migration.

### Real-time sync flow

1. Both users connect to `/ws/{couple_id}` with their JWT token on page load
2. When any user creates, edits, or deletes an event via the REST API, the backend broadcasts a WebSocket message to all connected clients in that couple space
3. The frontend WebSocket hook receives the message and updates the calendar state instantly — no polling, no refresh needed

### Auth flow

1. User submits email + password to `POST /auth/register` or `POST /auth/login`
2. Backend returns a signed JWT (30-day expiry)
3. Token stored in `localStorage`, sent as `Authorization: Bearer <token>` on every request
4. `get_current_user` FastAPI dependency validates the token on every protected endpoint

---

## Cloud Deployment (Railway)

Three Railway services all connected to one PostgreSQL database:

| Service | Source | Notes |
|---|---|---|
| **Backend** | `couple-calendar` repo, root: `backend/` | Runs `start.sh` — migrates then starts uvicorn |
| **Frontend** | `couple-calendar-frontend` repo | Runs `npm run start` on Railway-assigned port |
| **Database** | Railway PostgreSQL plugin | `DATABASE_URL` auto-injected into backend |

**Environment variables required on backend service:**

| Variable | Value |
|---|---|
| `DATABASE_URL` | Auto-injected by Railway Postgres |
| `DATABASE_URL_SYNC` | Reference to `${{Postgres.DATABASE_URL}}` |
| `SECRET_KEY` | Any long random string |
| `FRONTEND_URL` | Your Railway frontend URL |

**Environment variables required on frontend service:**

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your Railway backend URL |

Pushes to `main` on GitHub trigger automatic redeployment of both services.

---

## Project Structure

```
couple-calendar/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entry point, CORS config
│   │   ├── core/
│   │   │   ├── config.py        # Environment variables via Pydantic Settings
│   │   │   ├── security.py      # JWT creation/validation, password hashing
│   │   │   ├── deps.py          # get_current_user FastAPI dependency
│   │   │   └── ws_manager.py    # WebSocket connection manager (broadcast)
│   │   ├── db/session.py        # Async SQLAlchemy engine + session factory
│   │   ├── models/models.py     # Database tables: User, Couple, Event, MagicToken (unused)
│   │   ├── schemas/schemas.py   # Pydantic schemas for request/response
│   │   └── routers/
│   │       ├── auth.py          # Register, login, /me endpoints
│   │       ├── couples.py       # Create/join/leave couple space
│   │       ├── events.py        # Event CRUD + WebSocket broadcast
│   │       └── ws.py            # WebSocket endpoint
│   ├── alembic/versions/        # Database migrations (0001 tables, 0002 password_hash)
│   ├── scripts/seed.py          # Seed script for test data
│   ├── start.sh                 # Production startup (migrate then serve)
│   └── requirements.txt
│
├── docker-compose.yml           # Local setup: postgres + backend + frontend
│
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx                  # Login / register page
        │   ├── pair/page.tsx             # Create or join couple space
        │   ├── calendar/page.tsx         # Main calendar app (holds all the state)
        │   └── auth/verify/page.tsx      # Old magic-link page, just redirects to /
        ├── components/calendar/
        │   ├── MonthView.tsx             # Month grid view
        │   ├── WeekView.tsx              # 7-column time grid
        │   ├── DayView.tsx               # Single day hour grid
        │   └── EventModal.tsx            # Create / edit / delete modal
        ├── hooks/
        │   ├── useCalendarWs.ts          # WebSocket hook with auto-reconnect
        │   └── useReminders.ts           # Reminder toast notifications
        └── lib/
            ├── api.ts                    # Typed fetch client for all endpoints
            └── types.ts                  # Shared TypeScript interfaces
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create account, returns JWT |
| `POST` | `/auth/login` | Login, returns JWT |
| `GET` | `/auth/me` | Get current user |
| `PATCH` | `/auth/me` | Change display name (no UI for this yet) |
| `POST` | `/couple/create` | Create a new couple space |
| `POST` | `/couple/join` | Join with invite code |
| `GET` | `/couple/me` | Get current couple + members (404 = not paired yet) |
| `DELETE` | `/couple/leave` | Leave your couple space (no UI for this yet) |
| `GET` | `/events?start=&end=` | List events that overlap a date range |
| `POST` | `/events` | Create event |
| `GET` | `/events/{id}` | Get one event |
| `PATCH` | `/events/{id}` | Update event (only the fields you send) |
| `DELETE` | `/events/{id}` | Delete event |
| `WS` | `/ws/{couple_id}?token=<jwt>` | WebSocket connection for real-time sync |
| `GET` | `/health` | Health check used by Railway |

Everything except register, login and health needs an `Authorization: Bearer <token>` header. Full interactive docs are at `/docs` (Swagger UI) when running locally.

WebSocket messages the server sends:

```json
{ "type": "event_created", "event": { ...event } }
{ "type": "event_updated", "event": { ...event } }
{ "type": "event_deleted", "event_id": "..." }
```

---

## Known Issues / Future Improvements

- **Week and day views** only draw an event on the day it starts, and overlapping events draw on top of each other.
- **Reminders** only work while the calendar tab is open. There are no email or push notifications.
- **CORS is open to all origins** (`allow_origins=["*"]`). It should be limited to `FRONTEND_URL`.
- The WebSocket manager keeps connections in memory, so it only works with a single backend process.
- No UI yet for leaving a couple or changing your display name, although the endpoints exist.
- No automated tests.

---

## What I Learned / Built

- Designed and implemented a full-stack application from scratch with a decoupled frontend and backend
- Built a real-time sync system using WebSockets — the backend maintains a connection registry per couple space and broadcasts mutations to all connected clients
- Implemented JWT auth without a third-party auth library, first as passwordless magic links, then switched to email + password with bcrypt hashing
- Used SQLAlchemy's async interface with PostgreSQL for non-blocking database access
- Managed database schema changes with Alembic migrations, including production deployment where migrations run automatically before the server starts
- Built three calendar view modes (month, week, day) with a custom grid layout using CSS Grid and date-fns for all date arithmetic
- Containerised the full stack with Docker Compose for reproducible local development
- Deployed to Railway with environment-specific configuration via environment variables
