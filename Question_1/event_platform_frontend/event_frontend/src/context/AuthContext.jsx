/**
 * context/AuthContext.jsx
 *
 * Provides authentication state (user, token) and actions (login, logout)
 * to the entire app via React Context API.
 *
 * JWT token is persisted in localStorage so the user stays logged in
 * across page refreshes.
 */

import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

// Create the context
const AuthContext = createContext(null)

// Custom hook — lets any component call `useAuth()` instead of `useContext(AuthContext)`
export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  // Try to load existing user data from localStorage on first render
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  const [token, setToken] = useState(() => {
    return localStorage.getItem('token') || null
  })

  const [loading, setLoading] = useState(false)

  // ── Login ────────────────────────────────────────────────────────────────
  const login = async (username, password) => {
    setLoading(true)
    try {
      const data = await authAPI.login(username, password)

      // Save both tokens; we mainly use `access` for API calls
      localStorage.setItem('token', data.access)
      localStorage.setItem('refresh', data.refresh)

      // Save minimal user info (username decoded enough for the navbar)
      const userData = { username }
      localStorage.setItem('user', JSON.stringify(userData))

      setToken(data.access)
      setUser(userData)
      setLoading(false)
      return { success: true }
    } catch (error) {
      setLoading(false)
      const message =
        error.response?.data?.detail ||
        error.response?.data?.non_field_errors?.[0] ||
        'Login failed. Please check your credentials.'
      return { success: false, error: message }
    }
  }

  // ── Signup ───────────────────────────────────────────────────────────────
  const signup = async (formData) => {
    setLoading(true)
    try {
      await authAPI.signup(formData)
      setLoading(false)
      return { success: true }
    } catch (error) {
      setLoading(false)
      // Surface first validation error from the API
      const errors = error.response?.data
      const firstError = errors
        ? Object.values(errors).flat()[0]
        : 'Signup failed. Please try again.'
      return { success: false, error: firstError }
    }
  }

  // ── Logout ───────────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('refresh')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
  }

  // Expose everything the app needs
  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    login,
    signup,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
