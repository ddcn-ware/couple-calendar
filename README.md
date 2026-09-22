# Couple Calendar

A full-stack shared calendar application built for two people. Both users share a single calendar space with real-time sync — when one person adds or edits an event, the other sees it instantly without refreshing.

**Live app:** [couple-calendar-frontend-production.up.railway.app](https://couple-calendar-frontend-production.up.railway.app)

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
│  users · couples · events · magic_tokens                 │
└─────────────────────────────────────────────────────────┘
```

### Data model

```
User ──── couple_id ──▶ Couple ◀──── invite_code (6 chars)
                           │
Event ──── couple_id ──────┘
      ──── creator_id ──▶ User
```

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
│   │   ├── models/models.py     # ORM models: User, Couple, Event, MagicToken
│   │   ├── schemas/schemas.py   # Pydantic schemas for request/response
│   │   └── routers/
│   │       ├── auth.py          # Register, login, /me endpoints
│   │       ├── couples.py       # Create/join/leave couple space
│   │       ├── events.py        # Event CRUD + WebSocket broadcast
│   │       └── ws.py            # WebSocket endpoint
│   ├── alembic/                 # Database migration files
│   ├── scripts/seed.py          # Seed script for test data
│   ├── start.sh                 # Production startup (migrate then serve)
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx                  # Login / register page
        │   ├── pair/page.tsx             # Create or join couple space
        │   └── calendar/page.tsx         # Main calendar app
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

## Running Locally

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

### Start everything with one command

```bash
git clone https://github.com/ddcn-ware/couple-calendar.git
cd couple-calendar
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API + docs: http://localhost:8000/docs
- Database migrations run automatically on startup

### Load test data (optional)

```bash
docker compose exec backend python scripts/seed.py
```

Creates two paired accounts:
- `alice@example.com` / `bob@example.com`
- Invite code: `TESTXY`
- 8 sample events across the next two weeks

### Stop

```bash
docker compose down        # stop (data preserved)
docker compose down -v     # stop and wipe database
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create account, returns JWT |
| `POST` | `/auth/login` | Login, returns JWT |
| `GET` | `/auth/me` | Get current user |
| `POST` | `/couple/create` | Create a new couple space |
| `POST` | `/couple/join` | Join with invite code |
| `GET` | `/couple/me` | Get current couple + members |
| `GET` | `/events` | List events (filterable by date range) |
| `POST` | `/events` | Create event |
| `PATCH` | `/events/{id}` | Update event |
| `DELETE` | `/events/{id}` | Delete event |
| `WS` | `/ws/{couple_id}` | WebSocket connection for real-time sync |

Full interactive docs available at `/docs` (Swagger UI) when running locally.

---

## Deployment

Deployed on [Railway](https://railway.app) as three services:

- **Backend** — Python/FastAPI service, migrations run on startup via `start.sh`
- **Frontend** — Next.js service
- **Database** — Railway-managed PostgreSQL

Pushes to the `main` branch on GitHub trigger automatic redeployment of both services.

---

## What I Learned / Built

- Designed and implemented a full-stack application from scratch with a decoupled frontend and backend
- Built a real-time sync system using WebSockets — the backend maintains a connection registry per couple space and broadcasts mutations to all connected clients
- Implemented JWT-based passwordless and password auth flows from first principles without a third-party auth library
- Used SQLAlchemy's async interface with PostgreSQL for non-blocking database access
- Managed database schema changes with Alembic migrations, including production deployment where migrations run automatically before the server starts
- Built three calendar view modes (month, week, day) with a custom grid layout using CSS Grid and date-fns for all date arithmetic
- Containerised the full stack with Docker Compose for reproducible local development
- Deployed to Railway with environment-specific configuration via environment variables
