# EventSphere — Event Registration Platform - Question 1

A full-stack Event Registration Platform built with **Django REST Framework**, **React**, and **PostgreSQL**, fully containerised with **Docker Compose** for one-command setup.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Docker Setup (Recommended)](#docker-setup-recommended)
  - [Manual Setup (Without Docker)](#manual-setup-without-docker)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Frontend Routes](#frontend-routes)
- [Database Models](#database-models)
- [Authentication](#authentication)
- [Admin Features](#admin-features)
- [Permissions](#permissions)
- [Docker Services](#docker-services)
- [Useful Commands](#useful-commands)
- [Production Checklist](#production-checklist)

---

## Overview

EventSphere lets users discover and register for events, while giving admins a full management dashboard to create, edit, and delete events. The system uses JWT authentication, and admin status is embedded directly in the token so the frontend can show/hide admin UI without extra API calls.

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11 | Runtime |
| Django | 4.2.7 | Web framework |
| Django REST Framework | 3.14.0 | REST API layer |
| djangorestframework-simplejwt | 5.3.0 | JWT authentication |
| psycopg2-binary | 2.9.9 | PostgreSQL adapter |
| Pillow | 10.1.0 | Image upload handling |
| django-cors-headers | 4.3.1 | CORS management |
| python-decouple | 3.8 | Environment variable management |

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 18.2.0 | UI framework |
| React Router | 6.21.0 | Client-side routing |
| Axios | 1.6.2 | HTTP client |
| Tailwind CSS | 3.4.0 | Utility-first styling |
| Vite | 5.0.8 | Build tool & dev server |

### Infrastructure
| Technology | Purpose |
|---|---|
| Docker | Container runtime |
| Docker Compose | Multi-service orchestration |
| PostgreSQL 15 | Primary database |

---

## Project Structure

```
event-registration-platform/
│
├── docker-compose.yml          # Orchestrates all services
│
├── event_platform/             # Django backend
│   ├── Dockerfile
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   │
│   ├── event_platform/         # Django project config
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   │
│   └── events/                 # Main Django app
│       ├── models.py           # Event & Registration models
│       ├── serializers.py      # DRF serializers
│       ├── views.py            # APIView-based views
│       ├── urls.py             # App URL patterns
│       ├── admin.py            # Django admin config
│       ├── permissions.py      # Custom permission classes
│       └── token_serializers.py # JWT with is_staff claim
│
└── event_frontend/             # React frontend
    ├── Dockerfile
    ├── vite.config.js
    ├── tailwind.config.js
    ├── package.json
    │
    └── src/
        ├── App.jsx             # Router + layout
        ├── main.jsx            # Entry point
        ├── index.css           # Global styles
        │
        ├── components/
        │   ├── Navbar.jsx          # Navigation with admin dropdown
        │   ├── EventCard.jsx       # Event summary card
        │   ├── ProtectedRoute.jsx  # Auth guard
        │   └── AdminRoute.jsx      # Admin-only route guard
        │
        ├── pages/
        │   ├── Login.jsx
        │   ├── Signup.jsx
        │   ├── Dashboard.jsx       # Event listing grid
        │   ├── EventDetails.jsx    # Full event info
        │   ├── RegisterEvent.jsx   # Registration form
        │   ├── MyRegistrations.jsx # User's registered events
        │   ├── ManageEvents.jsx    # Admin: list/delete events
        │   ├── CreateEvent.jsx     # Admin: create event
        │   └── EditEvent.jsx       # Admin: edit event
        │
        ├── context/
        │   └── AuthContext.jsx     # JWT auth state (login/logout/signup)
        │
        └── services/
            └── api.js              # Axios instance + all API functions
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Docker Network                     │
│                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌───────┐  │
│  │   Frontend   │    │   Backend    │    │  DB   │  │
│  │    React     │───▶│    Django    │───▶│ Postgres│ │
│  │  Port: 3000  │    │  Port: 8000  │    │ Port:5432││
│  └──────────────┘    └──────────────┘    └───────┘  │
│                             │                       │
│                      ┌──────────────┐               │
│                      │  Media Files │               │
│                      │   (volume)   │               │
│                      └──────────────┘               │
└─────────────────────────────────────────────────────┘
```

- The **React frontend** runs on port `3000` and proxies all `/api` requests to the Django backend
- The **Django backend** runs on port `8000`, serves the REST API and media files
- **PostgreSQL** runs on port `5432`, accessible only within the Docker network
- A named **media volume** persists uploaded event images across container restarts

---

## Features

### For All Users (Public)
- Browse all upcoming events in a card grid
- View full event details including description, date, time, location, and attendee count

### For Registered Users
- Create an account and log in securely
- Register for events by providing name, phone, college, and academic year
- View all events they have registered for, with full event details
- Duplicate registration is prevented at both the API and database level

### For Admin / Superusers
- **Manage Events dashboard** — view all events in a searchable list with inline actions
- **Create Event** — rich form with image upload, live card preview, and field-level validation
- **Edit Event** — pre-filled form to update any event detail or replace its image
- **Delete Event** — confirmation modal with warning about cascade-deleting registrations
- Full access to the **Django admin panel** at `/admin/` for raw data management

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose)
- Git

---

### Docker Setup (Recommended)

This is the fastest way to get the entire stack running with a single command.

#### 1. Clone the repository

```bash
git clone https://github.com/your-username/event-registration-platform.git
cd event-registration-platform
```

#### 2. Configure environment variables

```bash
cp event_platform/.env.example event_platform/.env
```

Open `event_platform/.env` and fill in your values:

```env
SECRET_KEY=your-very-secret-key-change-this
DEBUG=True

DB_NAME=event_platform_db
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_HOST=db               # Must match the service name in docker-compose.yml
DB_PORT=5432

CORS_ALLOWED_ORIGINS=http://localhost:3000
ALLOWED_HOSTS=localhost,127.0.0.1
```

> **Tip:** Generate a secure secret key:
> ```bash
> python -c "import secrets; print(secrets.token_urlsafe(50))"
> ```

#### 3. Build and start all containers

```bash
docker compose up --build
```

Docker will:
1. Build the Django backend image
2. Build the React frontend image
3. Pull the PostgreSQL 15 image
4. Start all three services and wire them together
5. Run database migrations automatically on first start

#### 4. Create a superuser (admin account)

In a **new terminal**, while the containers are running:

```bash
docker compose exec backend python manage.py createsuperuser
```

Follow the prompts to set a username, email, and password.

#### 5. Access the application

| Service | URL |
|---|---|
| Frontend (React app) | http://localhost:3000 |
| Backend API | http://localhost:8000/api/ |
| Django Admin Panel | http://localhost:8000/admin/ |

#### 6. Stop the containers

```bash
docker compose down
```

To also delete the database volume (full reset):

```bash
docker compose down -v
```

---

### Manual Setup (Without Docker)

#### Backend

```bash
# 1. Navigate to the backend folder
cd event_platform

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up PostgreSQL
#    Create a database and user in psql:
#    CREATE DATABASE event_platform_db;
#    CREATE USER postgres WITH PASSWORD 'yourpassword';
#    GRANT ALL PRIVILEGES ON DATABASE event_platform_db TO postgres;

# 5. Configure environment
cp .env.example .env
# Edit .env with your DB credentials (set DB_HOST=localhost)

# 6. Run migrations
python manage.py makemigrations
python manage.py migrate

# 7. Create superuser
python manage.py createsuperuser

# 8. Start the server
python manage.py runserver
# API available at http://localhost:8000/api/
```

#### Frontend

```bash
# Open a new terminal

# 1. Navigate to the frontend folder
cd event_frontend

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
# App available at http://localhost:3000
```

---

## Environment Variables

All backend configuration is managed through the `.env` file (never commit this to version control).

| Variable | Description | Default |
|---|---|---|
| `SECRET_KEY` | Django secret key — must be unique and secret | `django-insecure-...` |
| `DEBUG` | Enable debug mode (`True`/`False`) | `False` |
| `ALLOWED_HOSTS` | Comma-separated list of allowed hostnames | `localhost,127.0.0.1` |
| `DB_NAME` | PostgreSQL database name | `event_platform_db` |
| `DB_USER` | PostgreSQL username | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | *(empty)* |
| `DB_HOST` | PostgreSQL host — use `db` for Docker, `localhost` for manual | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins | `http://localhost:3000` |

---

## API Reference

### Base URL
```
http://localhost:8000/api/
```

### Authentication Header
All protected endpoints require:
```
Authorization: Bearer <access_token>
```

---

### Auth Endpoints

#### `POST /api/signup/` — Register a new user

```json
// Request
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123",
  "password2": "SecurePass123",
  "first_name": "John",
  "last_name": "Doe"
}

// Response 201
{
  "message": "Account created successfully.",
  "user": { "id": 2, "username": "john_doe", "email": "john@example.com" }
}
```

#### `POST /api/login/` — Obtain JWT tokens

```json
// Request
{ "username": "john_doe", "password": "SecurePass123" }

// Response 200
{ "access": "eyJ...", "refresh": "eyJ..." }
```

The `access` token payload includes:
```json
{ "user_id": 2, "username": "john_doe", "is_staff": false }
```

#### `POST /api/token/refresh/` — Refresh access token

```json
// Request
{ "refresh": "eyJ..." }

// Response 200
{ "access": "eyJ..." }
```

---

### Event Endpoints

#### `GET /api/events/` — List all events *(public)*

```json
// Response 200
[
  {
    "id": 1,
    "title": "Tech Summit 2025",
    "date": "2025-06-15T10:00:00Z",
    "location": "Mumbai Convention Centre",
    "image": "http://localhost:8000/media/events/tech_summit.jpg",
    "registration_count": 42
  }
]
```

#### `GET /api/events/<id>/` — Event detail *(public)*

```json
// Response 200
{
  "id": 1,
  "title": "Tech Summit 2025",
  "description": "Annual technology summit...",
  "date": "2025-06-15T10:00:00Z",
  "location": "Mumbai Convention Centre",
  "image": "http://localhost:8000/media/events/tech_summit.jpg",
  "created_by": { "id": 1, "username": "admin", "email": "admin@example.com" },
  "created_at": "2025-01-10T08:30:00Z",
  "registration_count": 42
}
```

#### `POST /api/events/` — Create event *(admin only)*

Send as `multipart/form-data` to support image uploads.

```
title=Tech Summit 2025
description=Annual technology summit...
date=2025-06-15T10:00:00Z
location=Mumbai Convention Centre
image=<file>    ← optional
```

#### `PUT /api/events/<id>/` — Update event *(admin only)*

Accepts partial updates. Send only the fields you want to change.

#### `DELETE /api/events/<id>/` — Delete event *(admin only)*

```json
// Response 200
{ "message": "Event deleted successfully." }
```

---

### Registration Endpoints

#### `POST /api/register-event/` — Register for an event *(authenticated)*

```json
// Request
{
  "event": 1,
  "name": "John Doe",
  "phone": "9876543210",
  "college": "IIT Bombay",
  "year": "2nd Year"
}

// Response 201
{
  "message": "Successfully registered for the event.",
  "registration": { "id": 5, "user": 2, "event": 1, ... }
}

// Response 400 — duplicate registration
{ "event": ["You have already registered for this event."] }
```

#### `GET /api/my-registrations/` — My registrations *(authenticated)*

```json
// Response 200
[
  {
    "id": 5,
    "event": { "id": 1, "title": "Tech Summit 2025", "date": "...", "location": "..." },
    "name": "John Doe",
    "phone": "9876543210",
    "college": "IIT Bombay",
    "year": "2nd Year",
    "registered_at": "2025-01-12T14:22:00Z"
  }
]
```

---

## Frontend Routes

| Path | Access | Page |
|---|---|---|
| `/` | Public | Redirects to `/dashboard` |
| `/signup` | Public | Create account |
| `/login` | Public | Sign in |
| `/event/:id` | Public | Event detail page |
| `/dashboard` | 🔒 Auth | Event grid with search |
| `/register/:id` | 🔒 Auth | Registration form |
| `/my-registrations` | 🔒 Auth | User's registered events |
| `/admin/manage-events` | 🔒 Admin | Event management table |
| `/admin/create-event` | 🔒 Admin | Create event form |
| `/admin/edit-event/:id` | 🔒 Admin | Edit event form |

---

## Database Models

### User
Django's built-in `User` model. Superusers have `is_staff = True`.

### Event

| Field | Type | Description |
|---|---|---|
| `id` | AutoField | Primary key |
| `title` | CharField(255) | Event name |
| `description` | TextField | Full description |
| `date` | DateTimeField | Event date and time |
| `location` | CharField(500) | Venue or address |
| `image` | ImageField | Optional promotional image |
| `created_by` | FK → User | Admin who created it |
| `created_at` | DateTimeField | Auto-set on creation |

### Registration

| Field | Type | Description |
|---|---|---|
| `id` | AutoField | Primary key |
| `user` | FK → User | The registering user |
| `event` | FK → Event | The target event |
| `name` | CharField(255) | Participant's full name |
| `phone` | CharField(20) | Contact number |
| `college` | CharField(255) | Institution name |
| `year` | CharField(10) | Academic year |
| `registered_at` | DateTimeField | Auto-set on registration |

**Constraint:** `unique_together = ('user', 'event')` — one registration per user per event, enforced at the database level.

---

## Authentication

JWT (JSON Web Tokens) are used throughout:

1. User calls `POST /api/login/` → receives `access` (1 day) and `refresh` (7 days) tokens
2. Frontend stores both tokens in `localStorage`
3. Every Axios request automatically attaches `Authorization: Bearer <access>` via a request interceptor
4. On 401 response, the interceptor clears tokens and redirects to `/login`
5. The `access` token payload includes `is_staff` so the frontend knows admin status immediately without an extra API call

Token lifetimes are configured in `settings.py` under `SIMPLE_JWT`.

---

## Admin Features

Log in as a superuser to access the admin panel at `http://localhost:8000/admin/` for raw database access, or use the built-in frontend admin UI:

### Frontend Admin UI (at `/admin/*`)

**Manage Events** (`/admin/manage-events`)
- Table view of all events with thumbnail, title, date, location, and registration count
- Inline View / Edit / Delete buttons per row
- Search filter by title or location
- Delete confirmation modal that warns about cascading registration deletion

**Create Event** (`/admin/create-event`)
- Title, description with character counter, date picker, time picker, location
- Image upload zone with live preview, swap, and remove options
- Live card preview that updates as you type
- Field-level and global error display from the API

**Edit Event** (`/admin/edit-event/:id`)
- Pre-filled form with all current event data
- Shows the existing image with option to replace or remove it

### Django Admin Panel (`/admin/`)
- Full CRUD on Events and Registrations
- Registration count shown inline on the Event list
- Filter registrations by event or academic year
- Search registrations by name, phone, or college

---

## Permissions

| Action | Public | Auth User | Admin |
|---|---|---|---|
| View event list | ✅ | ✅ | ✅ |
| View event detail | ✅ | ✅ | ✅ |
| Create event | ❌ | ❌ | ✅ |
| Edit event | ❌ | ❌ | ✅ |
| Delete event | ❌ | ❌ | ✅ |
| Register for event | ❌ | ✅ | ✅ |
| View own registrations | ❌ | ✅ | ✅ |
| Access admin UI routes | ❌ | ❌ (403) | ✅ |

---

## Docker Services

The `docker-compose.yml` defines three services:

### `db` — PostgreSQL 15
- Image: `postgres:15-alpine`
- Data persisted in a named volume `postgres_data`
- Only accessible within the Docker network (not exposed to host by default)

### `backend` — Django
- Built from `event_platform/Dockerfile`
- Runs on port `8000`
- Waits for `db` to be healthy before starting
- Automatically runs `migrate` and `collectstatic` on startup
- Media files persisted in a named volume `media_data`

### `frontend` — React + Vite
- Built from `event_frontend/Dockerfile`
- Runs on port `3000`
- Proxies `/api` and `/media` requests to the `backend` service

---

## Useful Commands

All commands assume Docker is running (`docker compose up`).

```bash
# View live logs for all services
docker compose logs -f

# View logs for a specific service
docker compose logs -f backend

# Open a shell inside the backend container
docker compose exec backend bash

# Run Django management commands
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py shell

# Rebuild images after code changes
docker compose up --build

# Stop and remove containers (keeps volumes/data)
docker compose down

# Full reset — removes containers AND all data volumes
docker compose down -v

# Check running containers
docker compose ps
```

---

## Production Checklist

Before deploying to production, ensure you have:

- [ ] Set `DEBUG=False` in `.env`
- [ ] Set a strong, randomly generated `SECRET_KEY`
- [ ] Set `ALLOWED_HOSTS` to your actual domain
- [ ] Set `CORS_ALLOWED_ORIGINS` to your frontend domain only
- [ ] Use a strong PostgreSQL password
- [ ] Switch from `psycopg2-binary` to `psycopg2` (compiled)
- [ ] Serve `media/` and `static/` via nginx or a CDN (not Django)
- [ ] Run `python manage.py collectstatic`
- [ ] Use `gunicorn` instead of Django's dev server
- [ ] Enable `SECURE_SSL_REDIRECT = True` and HTTPS-related settings
- [ ] Set up regular PostgreSQL backups
- [ ] Remove the frontend Vite dev server — build with `npm run build` and serve the `dist/` folder via nginx

---

## License

This project is for educational and portfolio purposes.
