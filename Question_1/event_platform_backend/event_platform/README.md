# Event Registration Platform — Backend

A production-ready REST API built with **Django** + **Django REST Framework** + **PostgreSQL** + **JWT Authentication**.

---

## Project Structure

```
event_platform/
├── event_platform/          # Django project package
│   ├── __init__.py
│   ├── settings.py          # All project settings (reads from .env)
│   ├── urls.py              # Root URL dispatcher
│   └── wsgi.py
│
├── events/                  # Main application
│   ├── migrations/
│   │   └── __init__.py
│   ├── __init__.py
│   ├── admin.py             # Django admin configuration
│   ├── apps.py
│   ├── models.py            # Event & Registration models
│   ├── permissions.py       # Custom DRF permission classes
│   ├── serializers.py       # DRF serializers
│   ├── urls.py              # App-level URL patterns
│   └── views.py             # APIView-based views
│
├── media/                   # Uploaded images (git-ignored)
│   └── events/
│
├── .env.example             # Environment variable template
├── manage.py
├── README.md
└── requirements.txt
```

---

## Step-by-Step Setup

### 1. Clone & Enter the Project

```bash
git clone <your-repo-url>
cd event_platform
```

### 2. Create & Activate a Virtual Environment

```bash
python -m venv venv

# macOS / Linux
source venv/bin/activate

# Windows
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Create the PostgreSQL Database

```sql
-- Run in psql or any PostgreSQL client
CREATE DATABASE event_platform_db;
CREATE USER event_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE event_platform_db TO event_user;
```

### 5. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
SECRET_KEY=your-random-secret-key
DEBUG=True

DB_NAME=event_platform_db
DB_USER=event_user
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_PORT=5432

CORS_ALLOWED_ORIGINS=http://localhost:3000
```

> **Generate a secret key:**
> ```bash
> python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
> ```

### 6. Run Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 7. Create a Superuser (Admin)

```bash
python manage.py createsuperuser
```

### 8. Start the Development Server

```bash
python manage.py runserver
```

API is now live at `http://localhost:8000/api/`  
Django admin panel: `http://localhost:8000/admin/`

---

## API Reference

### Base URL
```
http://localhost:8000/api/
```

### Authentication
All protected endpoints require the header:
```
Authorization: Bearer <access_token>
```

---

### Auth Endpoints

#### POST `/api/signup/` — Create Account

**Request:**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "password": "SecurePass123",
  "password2": "SecurePass123"
}
```

**Response `201`:**
```json
{
  "message": "Account created successfully.",
  "user": {
    "id": 2,
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

**Response `400` (passwords don't match):**
```json
{
  "password": ["Passwords do not match."]
}
```

---

#### POST `/api/login/` — Obtain JWT Tokens

**Request:**
```json
{
  "username": "john_doe",
  "password": "SecurePass123"
}
```

**Response `200`:**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

#### POST `/api/token/refresh/` — Refresh Access Token

**Request:**
```json
{
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response `200`:**
```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Event Endpoints

#### GET `/api/events/` — List All Events *(public)*

**Response `200`:**
```json
[
  {
    "id": 1,
    "title": "Tech Summit 2025",
    "date": "2025-06-15T10:00:00Z",
    "location": "Mumbai Convention Centre",
    "image": "http://localhost:8000/media/events/tech_summit.jpg",
    "registration_count": 42
  },
  {
    "id": 2,
    "title": "Hackathon Night",
    "date": "2025-07-01T18:00:00Z",
    "location": "IIT Bombay",
    "image": null,
    "registration_count": 18
  }
]
```

---

#### GET `/api/events/<id>/` — Event Detail *(public)*

**Response `200`:**
```json
{
  "id": 1,
  "title": "Tech Summit 2025",
  "description": "Annual technology summit bringing together innovators...",
  "date": "2025-06-15T10:00:00Z",
  "location": "Mumbai Convention Centre",
  "image": "http://localhost:8000/media/events/tech_summit.jpg",
  "created_by": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "first_name": "Admin",
    "last_name": ""
  },
  "created_at": "2025-01-10T08:30:00Z",
  "registration_count": 42
}
```

**Response `404`:**
```json
{
  "error": "Event not found."
}
```

---

#### POST `/api/events/` — Create Event *(admin only)*

> Requires `Authorization: Bearer <token>` and the user must be `is_staff = True`.

**Request (multipart/form-data):**
```
title=Tech Summit 2025
description=Annual technology summit...
date=2025-06-15T10:00:00Z
location=Mumbai Convention Centre
image=<file upload>   # optional
```

**Response `201`:**
```json
{
  "id": 1,
  "title": "Tech Summit 2025",
  "description": "Annual technology summit...",
  "date": "2025-06-15T10:00:00Z",
  "location": "Mumbai Convention Centre",
  "image": "http://localhost:8000/media/events/tech_summit.jpg",
  "created_by": { "id": 1, "username": "admin", ... },
  "created_at": "2025-01-10T08:30:00Z",
  "registration_count": 0
}
```

**Response `403` (non-admin user):**
```json
{
  "detail": "You do not have permission to perform this action."
}
```

---

#### PUT `/api/events/<id>/` — Update Event *(admin only)*

**Request (JSON or multipart):**
```json
{
  "title": "Tech Summit 2025 — Updated",
  "location": "BKC, Mumbai"
}
```

**Response `200`:** Updated event object (same shape as create response).

---

#### DELETE `/api/events/<id>/` — Delete Event *(admin only)*

**Response `200`:**
```json
{
  "message": "Event deleted successfully."
}
```

---

### Registration Endpoints

#### POST `/api/register-event/` — Register for an Event *(authenticated)*

**Request:**
```json
{
  "event": 1,
  "name": "John Doe",
  "phone": "9876543210",
  "college": "IIT Bombay",
  "year": "2nd"
}
```

**Response `201`:**
```json
{
  "message": "Successfully registered for the event.",
  "registration": {
    "id": 5,
    "user": 2,
    "event": 1,
    "name": "John Doe",
    "phone": "9876543210",
    "college": "IIT Bombay",
    "year": "2nd",
    "registered_at": "2025-01-12T14:22:00Z"
  }
}
```

**Response `400` (duplicate registration):**
```json
{
  "event": ["You have already registered for this event."]
}
```

---

#### GET `/api/my-registrations/` — My Registrations *(authenticated)*

**Response `200`:**
```json
[
  {
    "id": 5,
    "event": {
      "id": 1,
      "title": "Tech Summit 2025",
      "date": "2025-06-15T10:00:00Z",
      "location": "Mumbai Convention Centre",
      "image": "http://localhost:8000/media/events/tech_summit.jpg",
      "registration_count": 42
    },
    "name": "John Doe",
    "phone": "9876543210",
    "college": "IIT Bombay",
    "year": "2nd",
    "registered_at": "2025-01-12T14:22:00Z"
  }
]
```

---

## Permissions Summary

| Endpoint | Public | Authenticated User | Admin |
|---|---|---|---|
| `GET /api/events/` | ✅ | ✅ | ✅ |
| `GET /api/events/<id>/` | ✅ | ✅ | ✅ |
| `POST /api/events/` | ❌ | ❌ | ✅ |
| `PUT /api/events/<id>/` | ❌ | ❌ | ✅ |
| `DELETE /api/events/<id>/` | ❌ | ❌ | ✅ |
| `POST /api/register-event/` | ❌ | ✅ | ✅ |
| `GET /api/my-registrations/` | ❌ | ✅ | ✅ |

---

## Django Admin Panel

Navigate to `http://localhost:8000/admin/` and log in with your superuser credentials.

From the admin panel you can:
- **Events** — Create, edit, and delete events; see registration counts inline.
- **Registrations** — Browse all registrations; filter by event or academic year; search by name, phone, or college.

---

## Production Checklist

- [ ] Set `DEBUG=False` in `.env`
- [ ] Set a strong, unique `SECRET_KEY`
- [ ] Set `ALLOWED_HOSTS` to your actual domain(s)
- [ ] Use `gunicorn` or `uvicorn` instead of `runserver`
- [ ] Configure a production-grade PostgreSQL instance
- [ ] Serve `media/` and `static/` via nginx or a CDN
- [ ] Run `python manage.py collectstatic`
- [ ] Set `SECURE_SSL_REDIRECT=True` and other security settings
