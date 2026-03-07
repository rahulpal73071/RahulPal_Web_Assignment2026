/**
 * pages/MyRegistrations.jsx
 *
 * Fully updated page to display all events the logged-in user has registered for.
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { registrationsAPI } from '../services/api'

// Format event date
function formatDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
}

// Format registration timestamp
function formatRegisteredAt(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function MyRegistrations() {
  const [registrations, setRegistrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    registrationsAPI.getMyRegistrations()
      .then(setRegistrations)
      .catch(() => setError('Failed to load your registrations.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">

      {/* Header */}
      <div className="mb-10">
        <p className="text-xs font-mono text-amber-500 tracking-[0.3em] uppercase mb-2">
          Your activity
        </p>
        <h1 className="font-display text-4xl font-bold text-white">
          My Registrations
        </h1>
        <p className="text-gray-400 mt-2 text-sm">
          Events you've signed up for
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded px-5 py-4 text-red-400 text-sm text-center mb-8">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-800 rounded-md p-5 flex gap-4 animate-pulse">
              <div className="w-16 h-16 bg-gray-700 rounded-sm" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-5 w-1/2 bg-gray-700 rounded" />
                <div className="h-4 w-1/3 bg-gray-700 rounded" />
                <div className="h-4 w-1/4 bg-gray-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && registrations.length === 0 && !error && (
        <div className="text-center py-24 border border-dashed border-gray-700 rounded-md">
          <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-gray-400 font-display text-xl mb-3">No registrations yet</p>
          <Link to="/dashboard" className="text-amber-400 text-sm hover:text-amber-300 transition-colors">
            Browse events →
          </Link>
        </div>
      )}

      {/* Registration list */}
      {!loading && registrations.length > 0 && (
        <div className="flex flex-col gap-4">
          {registrations.map((reg, i) => (
            <div
              key={reg.id}
              className="bg-gray-800 rounded-md p-5 flex flex-col sm:flex-row gap-4"
            >
              {/* Event thumbnail */}
              <div className="w-full sm:w-20 h-20 rounded-sm overflow-hidden border border-gray-700 shrink-0">
                {reg.event.image ? (
                  <img
                    src={reg.event.image}
                    alt={reg.event.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                    <span className="text-gray-400 text-xs">No Image</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex-1 flex flex-col gap-1.5">
                <Link
                  to={`/event/${reg.event.id}`}
                  className="font-display text-lg text-white hover:text-amber-400 transition-colors"
                >
                  {reg.event.title}
                </Link>

                <div className="flex flex-wrap gap-x-5 gap-y-1 text-gray-400 text-xs">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3 h-3 text-amber-500/60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatDate(reg.event.date)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3 h-3 text-amber-500/60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round"
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {reg.event.location}
                  </span>
                </div>

                {/* Registration info pills */}
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="bg-gray-700 text-gray-200 px-2 py-0.5 rounded text-xs">{reg.college}</span>
                  <span className="bg-gray-700 text-gray-200 px-2 py-0.5 rounded text-xs">{reg.year}</span>
                  <span className="bg-gray-700 text-gray-200 px-2 py-0.5 rounded text-xs">{reg.phone}</span>
                </div>
              </div>

              {/* Right: registered date */}
              <div className="sm:text-right shrink-0 mt-2 sm:mt-0">
                <div className="inline-flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-sm px-3 py-1">
                  <svg className="w-3 h-3 text-amber-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-amber-400 text-xs font-mono">Registered</span>
                </div>
                <p className="text-gray-400 text-xs mt-2 font-mono">
                  {formatRegisteredAt(reg.registered_at)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer count */}
      {!loading && registrations.length > 0 && (
        <div className="mt-8 pt-6 text-center">
          <span className="bg-gray-700 text-gray-200 px-3 py-1 rounded text-sm">
            {registrations.length} event{registrations.length !== 1 ? 's' : ''} registered
          </span>
        </div>
      )}
    </div>
  )
}