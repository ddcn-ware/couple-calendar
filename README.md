# Couple Calendar

A self-hosted shared calendar for two people. Built with FastAPI + Next.js + PostgreSQL, runs entirely on your local machine with a single Docker command.

## Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker + Docker Compose)

### 1 — Copy env files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

> **Optional:** Edit `backend/.env` and change `SECRET_KEY` to a long random string.

### 2 — Start everything

```bash
cd couple-calendar
docker compose up --build
```

This starts three containers:
| Container | URL |
|---|---|
| Frontend (Next.js) | http://localhost:3000 |
| Backend (FastAPI) | http://localhost:8000 |
| PostgreSQL | localhost:5432 |

Migrations run automatically on backend startup. No manual steps needed.

### 3 — Seed test data (optional)

In a second terminal, after the containers are running:

```bash
docker compose exec backend python scripts/seed.py
```

This creates two paired accounts:
- **alice@example.com** — display name: Alice
- **bob@example.com** — display name: Bob
- Couple invite code: `TESTXY`

### 4 — Log in

1. Open http://localhost:3000
2. Enter an email address and click **Send magic link**
3. **Check the backend terminal** — the link is printed there (no email needed)
4. Copy/paste the link into your browser
5. You're in! If first time, you'll be redirected to set up a couple space.

---

## Using the App

### Pairing
- **First user**: Click "Create space" → share the 6-character invite code
- **Second user**: Click "Join with code" → enter the invite code

### Calendar
| Feature | How |
|---|---|
| Switch views | Month / Week / Day buttons (top right) |
| Create event | Click **New event** button, or click any day/time slot |
| Edit/Delete event | Click any event chip |
| Real-time sync | Changes appear instantly on the partner's screen via WebSocket |
| Reminders | Toast notification 30 min and 10 min before an event |

### Event colours
Eight colour options per event to visually distinguish whose event it is or categorise by type.

---

## Development (without Docker)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Start Postgres locally (or adjust DATABASE_URL in .env)
cp .env.example .env

# Run migrations
DATABASE_URL_SYNC=postgresql://couple:couple@localhost:5432/couple_calendar \
  alembic upgrade head

# Start API
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

---

## Architecture

```
couple-calendar/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app + CORS
│   │   ├── core/
│   │   │   ├── config.py     # Pydantic settings
│   │   │   ├── security.py   # JWT + magic token helpers
│   │   │   ├── deps.py       # get_current_user dependency
│   │   │   └── ws_manager.py # WebSocket connection manager
│   │   ├── db/session.py     # SQLAlchemy async engine
│   │   ├── models/models.py  # User, Couple, Event, MagicToken
│   │   ├── schemas/schemas.py# Pydantic request/response models
│   │   └── routers/
│   │       ├── auth.py       # Magic link + JWT auth
│   │       ├── couples.py    # Create/join/leave couple space
│   │       ├── events.py     # Event CRUD + WS broadcast
│   │       └── ws.py         # WebSocket endpoint
│   ├── alembic/              # Database migrations
│   ├── scripts/seed.py       # Test data seeder
│   └── requirements.txt
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx              # Login (magic link request)
        │   ├── auth/verify/page.tsx  # Magic link verify + redirect
        │   ├── pair/page.tsx         # Create/join couple space
        │   └── calendar/page.tsx     # Main calendar app
        ├── components/calendar/
        │   ├── MonthView.tsx
        │   ├── WeekView.tsx
        │   ├── DayView.tsx
        │   └── EventModal.tsx
        ├── hooks/
        │   ├── useCalendarWs.ts     # WebSocket hook (auto-reconnect)
        │   └── useReminders.ts      # In-app reminder toasts
        └── lib/
            ├── api.ts               # Typed API client
            └── types.ts             # Shared TypeScript types
```

### Data model

```
User  ──── couple_id ──▶  Couple
                             │
                             └── invite_code (6 chars, shareable)
                             │
Event ──── couple_id ────────┘
      ──── creator_id ──▶ User
```

---

## Stopping / resetting

```bash
# Stop
docker compose down

# Stop and wipe the database
docker compose down -v
```

---

## Accessing from another device on your home network

Find your machine's local IP (e.g. `192.168.1.42`), then:

1. Edit `frontend/.env.local`: `NEXT_PUBLIC_API_URL=http://192.168.1.42:8000`
2. Update `backend/.env`: `FRONTEND_URL=http://192.168.1.42:3000`
3. Rebuild: `docker compose up --build`
4. Open `http://192.168.1.42:3000` on any device on your network

For remote access from outside your home, set up [Tailscale](https://tailscale.com/) (free, no port-forwarding required).
