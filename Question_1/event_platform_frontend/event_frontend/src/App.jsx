/**
 * App.jsx
 *
 * Root component. Sets up:
 * - AuthProvider (global auth state)
 * - BrowserRouter + Routes
 * - Navbar (shown on every page)
 * - ProtectedRoute  → requires authentication
 * - AdminRoute      → requires authentication + is_staff
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'

import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import EventDetails from './pages/EventDetails'
import RegisterEvent from './pages/RegisterEvent'
import MyRegistrations from './pages/MyRegistrations'

// Admin pages
import ManageEvents from './pages/ManageEvents'
import CreateEvent from './pages/CreateEvent'
import EditEvent from './pages/EditEvent'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />

        <main>
          <Routes>
            {/* ── Public ─────────────────────────────────────────────────── */}
            <Route path="/login"  element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Event detail is public — anyone can browse */}
            <Route path="/event/:id" element={<EventDetails />} />

            {/* ── Authenticated users ─────────────────────────────────────── */}
            <Route
              path="/dashboard"
              element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
            />
            <Route
              path="/register/:id"
              element={<ProtectedRoute><RegisterEvent /></ProtectedRoute>}
            />
            <Route
              path="/my-registrations"
              element={<ProtectedRoute><MyRegistrations /></ProtectedRoute>}
            />

            {/* ── Admin-only ──────────────────────────────────────────────── */}
            <Route
              path="/admin/manage-events"
              element={<AdminRoute><ManageEvents /></AdminRoute>}
            />
            <Route
              path="/admin/create-event"
              element={<AdminRoute><CreateEvent /></AdminRoute>}
            />
            <Route
              path="/admin/edit-event/:id"
              element={<AdminRoute><EditEvent /></AdminRoute>}
            />

            {/* ── Default & 404 ───────────────────────────────────────────── */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="*"
              element={
                <div className="min-h-[calc(100vh-64px)] flex items-center justify-center text-center px-6">
                  <div className="page-enter">
                    <p className="font-mono text-amber-500 text-xs tracking-[0.3em] uppercase mb-4">404</p>
                    <h1 className="font-display text-5xl text-slate-200 mb-4">Page Not Found</h1>
                    <p className="text-slate-500 mb-8 text-sm">
                      The page you're looking for doesn't exist.
                    </p>
                    <a href="/dashboard" className="btn-primary inline-block">Go to Dashboard</a>
                  </div>
                </div>
              }
            />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  )
}
