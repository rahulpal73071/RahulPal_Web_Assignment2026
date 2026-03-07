# EventSphere — Frontend

A modern, dark-themed React frontend for the Event Registration Platform.

## Tech Stack
- **React 18** + **React Router v6**
- **Axios** for API communication
- **Context API** for authentication state
- **Tailwind CSS** for styling
- **Vite** for blazing-fast builds

---

## Project Structure

```
src/
├── components/
│   ├── Navbar.jsx           # Sticky nav with auth-aware links
│   ├── EventCard.jsx        # Event summary card for the grid
│   └── ProtectedRoute.jsx   # Auth guard for protected routes
│
├── pages/
│   ├── Login.jsx            # Login form
│   ├── Signup.jsx           # Registration form
│   ├── Dashboard.jsx        # Event listing grid with search
│   ├── EventDetails.jsx     # Full event info + register CTA
│   ├── RegisterEvent.jsx    # Participant registration form
│   └── MyRegistrations.jsx  # User's registered events list
│
├── context/
│   └── AuthContext.jsx      # JWT auth state + login/logout/signup
│
├── services/
│   └── api.js               # Axios instance + all API functions
│
├── App.jsx                  # Router setup
├── main.jsx                 # React entry point
└── index.css                # Tailwind + global styles
```

---

## Setup & Run

### Prerequisites
- Node.js 18+
- The Django backend running on `http://localhost:8000`

### 1. Install dependencies

```bash
npm install
```

### 2. Start the dev server

```bash
npm run dev
```

The app will be available at **http://localhost:3000**

The Vite dev server proxies all `/api` and `/media` requests to `localhost:8000`
automatically — no CORS issues in development.

### 3. Build for production

```bash
npm run build
```

---

## Routes

| Path | Access | Description |
|---|---|---|
| `/` | Public | Redirects to `/dashboard` |
| `/signup` | Public | Create new account |
| `/login` | Public | Sign in |
| `/event/:id` | Public | View event details |
| `/dashboard` | 🔒 Auth | Browse all events |
| `/register/:id` | 🔒 Auth | Register for an event |
| `/my-registrations` | 🔒 Auth | View your registrations |

---

## Authentication Flow

1. User logs in → JWT `access` and `refresh` tokens stored in `localStorage`
2. Every Axios request automatically includes `Authorization: Bearer <token>` via an interceptor
3. On 401 response, tokens are cleared and user is redirected to `/login`
4. `ProtectedRoute` component guards authenticated routes — redirects unauthenticated users to `/login` and restores them to their destination after login

---

## Environment

The Vite proxy handles backend URL in development. For production, set your API base URL in `src/services/api.js`:

```js
const api = axios.create({
  baseURL: 'https://your-backend-domain.com/api',
})
```
