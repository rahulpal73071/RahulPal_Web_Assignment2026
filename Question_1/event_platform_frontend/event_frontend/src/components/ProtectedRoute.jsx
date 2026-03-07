/**
 * components/ProtectedRoute.jsx
 *
 * Wraps routes that require authentication.
 * If the user is not logged in, redirects them to /login
 * and saves the intended destination so they can be sent back after login.
 */

import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    // Pass the current location in state so Login can redirect back
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
