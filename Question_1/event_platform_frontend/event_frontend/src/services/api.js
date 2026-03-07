/**
 * services/api.js
 *
 * Central Axios configuration and all API call functions.
 *
 * How it works:
 * - A base Axios instance (`api`) adds the JWT token to every request
 *   automatically via a request interceptor.
 * - Each logical area (auth, events, registrations) has its own object
 *   with named async functions — keeps views clean and readable.
 */

import axios from 'axios'

// ── Base Axios Instance ────────────────────────────────────────────────────
const api = axios.create({
  baseURL: '/api',          // proxied to http://localhost:8000/api by Vite
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Request interceptor: automatically attach the JWT access token
 * to the Authorization header for every outgoing request.
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

/**
 * Response interceptor: if any request gets a 401, clear stored
 * credentials and redirect the user to /login.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('refresh')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ── Auth API ───────────────────────────────────────────────────────────────
export const authAPI = {
  /**
   * Register a new user account.
   * @param {Object} data - { username, email, password, password2, first_name?, last_name? }
   */
  signup: async (data) => {
    const response = await api.post('/signup/', data)
    return response.data
  },

  /**
   * Obtain JWT token pair (access + refresh).
   * @param {string} username
   * @param {string} password
   */
  login: async (username, password) => {
    const response = await api.post('/login/', { username, password })
    return response.data
  },
}

// ── Events API ─────────────────────────────────────────────────────────────
export const eventsAPI = {
  /** Fetch the list of all events. */
  getAll: async () => {
    const response = await api.get('/events/')
    return response.data
  },

  /**
   * Fetch full details for a single event.
   * @param {number|string} id - Event primary key
   */
  getById: async (id) => {
    const response = await api.get(`/events/${id}/`)
    return response.data
  },

  /**
   * Create a new event (admin only).
   * Sends multipart/form-data so an image file can be included.
   * @param {FormData} formData
   */
  create: async (formData) => {
    const response = await api.post('/events/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  /**
   * Update an existing event (admin only).
   * @param {number|string} id
   * @param {FormData} formData
   */
  update: async (id, formData) => {
    const response = await api.put(`/events/${id}/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  /**
   * Delete an event (admin only).
   * @param {number|string} id
   */
  delete: async (id) => {
    const response = await api.delete(`/events/${id}/`)
    return response.data
    
  },
}

// ── Registrations API ──────────────────────────────────────────────────────
export const registrationsAPI = {
  /**
   * Register the current user for an event.
   * @param {Object} data - { event, name, phone, college, year }
   */
  register: async (data) => {
    const response = await api.post('/register-event/', data)
    return response.data
  },

  /** Fetch all events the current user has registered for. */
  getMyRegistrations: async () => {
    const response = await api.get('/my-registrations/')
    return response.data
  },
}

export default api
