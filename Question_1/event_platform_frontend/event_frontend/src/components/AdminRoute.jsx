/**
 * components/AdminRoute.jsx
 *
 * Route guard that requires BOTH authentication AND admin (is_staff) status.
 * - Not logged in → redirect to /login
 * - Logged in but not admin → show 403 Forbidden page
 * - Admin → render the protected children
 */

import { Navigate, useLocation } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuth()
  const location = useLocation()

  // Not logged in at all → send to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Logged in but not an admin → show a friendly 403
  if (!isAdmin) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-6">
        <div className="text-center page-enter max-w-sm">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full
                          flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="font-mono text-red-400 text-xs tracking-[0.3em] uppercase mb-3">403 Forbidden</p>
          <h1 className="font-display text-3xl text-slate-100 mb-3">Access Denied</h1>
          <p className="text-slate-500 text-sm mb-8">
            This area is restricted to admin users only.
          </p>
          <Link to="/dashboard" className="btn-primary inline-block">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return children
}
