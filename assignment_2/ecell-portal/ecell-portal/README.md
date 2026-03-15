# E-Cell IIT Bombay — Query & Issue Management Portal

A production-grade internal query and issue management system with real-time WebSocket communication, hierarchical RBAC, and auto-escalation.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django 5.0 + Django REST Framework |
| Real-time | Django Channels 4 + Redis (WebSockets) |
| Frontend | React 18 + Vite + Tailwind CSS + Lucide Icons |
| Database | PostgreSQL 16 |
| Auth | JWT (SimpleJWT) with custom role claims |
| Background Jobs | Celery + Celery Beat |
| Containerization | Docker + Docker Compose |

---

## Architecture Overview

```
                        ┌─────────────┐
                        │    Nginx    │  :80
                        │ (Reverse P.)│
                        └──────┬──────┘
               ┌───────────────┼───────────────┐
               ▼               ▼               ▼
        ┌─────────────┐ ┌─────────────┐ ┌──────────────┐
        │   React     │ │  Daphne     │ │   Static /   │
        │  Frontend   │ │  (ASGI)     │ │   Media      │
        │  :3000      │ │  :8000      │ │   Files      │
        └─────────────┘ └──────┬──────┘ └──────────────┘
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
             ┌──────────┐ ┌────────┐ ┌────────┐
             │PostgreSQL│ │ Redis  │ │Celery  │
             │   :5432  │ │ :6379  │ │Worker  │
             └──────────┘ └────────┘ └────────┘
```

---

## Role Hierarchy

```
OC (max 2)
 ├── Global visibility across all departments
 ├── Can create Departments
 ├── Can promote any USER → MANAGER / COORDINATOR
 └── Receives all escalation alerts

MANAGER (per Department)
 ├── Sees tickets only in their department
 ├── Can promote USER → COORDINATOR (own dept only)
 ├── Can assign tickets to Coordinators
 └── Receives new ticket notifications

COORDINATOR (per Department)
 ├── Sees only tickets assigned to them
 ├── Can update ticket status (IN_PROGRESS, RESOLVED)
 └── Can chat with ticket creator

USER
 ├── Creates tickets
 ├── Views own ticket history
 └── Chats on their own tickets
```

---

## Ticket Lifecycle

```
OPEN ──(Manager/OC)──► ASSIGNED ──(Coordinator/Manager)──► IN_PROGRESS
  ▲                        │                                      │
  │                        ▼                                      ▼
  └──── (auto, 24h) ─── OVERDUE                              RESOLVED
```

Status transition rules are enforced at **both** the serializer and permission layer.

---

## Quick Start (Docker)

### Prerequisites
- Docker ≥ 24.0
- Docker Compose ≥ 2.20

### 1. Clone and configure
```bash
git clone <repo>
cd ecell-portal
cp .env.example .env
# Edit .env — set DJANGO_SECRET_KEY, POSTGRES_PASSWORD at minimum
```

### 2. Start all services
```bash
docker-compose up -d --build
```

### 3. Run migrations and seed data
```bash
# Migrations run automatically on web container startup.
# Seed initial users (with demo flag for sample tickets):
docker-compose exec web python manage.py seed_data --demo
```

### 4. Access
| Service | URL |
|---------|-----|
| Frontend | http://localhost |
| API | http://localhost/api/ |
| Django Admin | http://localhost/admin/ |
| API Direct | http://localhost:8000/api/ |

### Default login credentials (after seed_data --demo)
| Role | Email | Password |
|------|-------|----------|
| OC | oc@ecell.in | OC@secure2024! |
| Manager | manager.tech@ecell.in | Manager123! |
| Coordinator | coordinator.tech@ecell.in | Coord123! |
| User | user1@ecell.in | User1234! |

---

## Local Development (without Docker)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start local PostgreSQL and Redis, then:
export DJANGO_SETTINGS_MODULE=config.settings
export DEBUG=1
export POSTGRES_HOST=localhost
export REDIS_HOST=localhost

python manage.py migrate
python manage.py seed_data --demo
python manage.py runserver

# In separate terminals:
celery -A config worker --loglevel=info
celery -A config beat --loglevel=info
```

### Frontend
```bash
cd frontend
npm install
# Create .env.local:
echo "VITE_API_URL=http://localhost:8000/api" > .env.local
echo "VITE_WS_URL=ws://localhost:8000" >> .env.local
npm run dev
```

---

## API Reference

### Authentication
```
POST /api/auth/token/          → { access, refresh }
POST /api/auth/token/refresh/  → { access }
POST /api/auth/token/blacklist/ → logout
```

### Tickets
```
GET    /api/tickets/           → list (filtered by role)
POST   /api/tickets/           → create
GET    /api/tickets/:id/       → detail
PATCH  /api/tickets/:id/       → update (status transitions enforced)
POST   /api/tickets/:id/assign/ → assign coordinator (Manager/OC)
```

### WebSocket Endpoints
```
ws://host/ws/tickets/{ticket_uuid}/?token=<jwt>
ws://host/ws/notifications/?token=<jwt>
```

**Ticket WS — send:**
```json
{ "type": "chat_message", "content": "hello", "is_internal": false }
{ "type": "typing", "is_typing": true }
```

**Ticket WS — receive:**
```json
{ "type": "chat_message", "content": "...", "author_name": "...", "timestamp": "..." }
{ "type": "status_update", "old_status": "OPEN", "new_status": "ASSIGNED" }
{ "type": "notification", "level": "warning", "title": "...", "message": "..." }
```

### Users
```
GET  /api/users/               → list (OC: all, Manager: dept only)
GET  /api/users/me/            → own profile
POST /api/users/:id/promote/   → { role, department? }
```

---

## Auto-Escalation Service

Celery Beat runs `core.tasks.escalate_overdue_tickets` **every hour**. Tickets in `OPEN` status for >24 hours without assignment are automatically:
1. Transitioned to `OVERDUE` status
2. Flagged as `is_overdue_notified = True`
3. Broadcasted via WebSocket to all OC members
4. Logged in the AuditLog as `AUTO_ESCALATE`

To trigger manually:
```bash
docker-compose exec worker celery -A config call core.tasks.escalate_overdue_tickets
```

---

## File Structure

```
ecell-portal/
├── backend/
│   ├── config/
│   │   ├── settings.py       # Django settings
│   │   ├── urls.py           # URL routing
│   │   ├── asgi.py           # ASGI + Channels
│   │   └── celery.py         # Celery app
│   ├── core/
│   │   ├── models.py         # User, Department, Ticket, Comment, Attachment, AuditLog
│   │   ├── serializers.py    # Nested serializers with role-based field visibility
│   │   ├── permissions.py    # IsOC, IsDeptManager, CanViewTicket, CanPromoteUser, etc.
│   │   ├── consumers.py      # TicketConsumer + NotificationConsumer (WebSocket)
│   │   ├── signals.py        # Post-save hooks for notifications
│   │   ├── tasks.py          # Celery: escalate_overdue_tickets, send_daily_digest
│   │   ├── views.py          # DRF ViewSets and APIViews
│   │   ├── urls.py           # API URL patterns
│   │   ├── routing.py        # WebSocket URL patterns
│   │   ├── auth.py           # Custom JWT serializer with role claims
│   │   ├── middleware.py     # JWT WebSocket auth middleware
│   │   ├── admin.py          # Django admin registrations
│   │   └── management/commands/seed_data.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Routes + RoleProtectedRoute
│   │   ├── context/
│   │   │   ├── AuthContext.jsx        # JWT decode, login/logout
│   │   │   └── NotificationContext.jsx # WS notification stream
│   │   ├── components/
│   │   │   ├── Dashboard.jsx   # Role-conditional stats dashboard
│   │   │   ├── Layout.jsx      # Sidebar + notification bell
│   │   │   └── NotificationPanel.jsx
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── TicketList.jsx
│   │   │   ├── TicketDetail.jsx  # Real-time WS chat
│   │   │   ├── CreateTicket.jsx
│   │   │   ├── UsersPage.jsx     # Role promotion UI
│   │   │   ├── DepartmentsPage.jsx
│   │   │   └── AuditPage.jsx
│   │   └── utils/api.js       # Axios + JWT refresh interceptor
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── Dockerfile
├── nginx/nginx.conf
├── docker-compose.yml
└── .env.example
```

---

## Security Notes

- All public-facing IDs use UUIDs to prevent ID enumeration
- JWT tokens include role/dept claims; validated server-side on every request
- OC limit (max 2) enforced in both `User.clean()` and `PromoteUserSerializer.validate()`
- Coordinator can only see their own assigned tickets (DB-level queryset filtering)
- Internal comments (staff notes) are invisible to USER role at serializer level
- AuditLog records all status changes, promotions, and assignments with actor IP
- `django-cleanup` auto-deletes orphaned media files on model deletion
- HTTPS + HSTS enforced in production (`DEBUG=0`)
