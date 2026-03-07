/**
 * pages/Dashboard.jsx
 *
 * Main landing page for logged-in users.
 * Fetches all events from the API and renders them in a responsive grid.
 */

import { useState, useEffect } from 'react'
import { eventsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import EventCard from '../components/EventCard'

// Skeleton card shown while events load
function SkeletonCard() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton h-44 w-full" />
      <div className="p-5 flex flex-col gap-3">
        <div className="skeleton h-5 w-3/4 rounded" />
        <div className="skeleton h-4 w-1/2 rounded" />
        <div className="skeleton h-4 w-2/5 rounded" />
        <div className="skeleton h-10 w-full rounded mt-2" />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await eventsAPI.getAll()
        console.log('Fetched events:', data)
        setEvents(data)
      } catch {
        setError('Failed to load events. Please try again later.')
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [])

  // Filter events by search query (title or location)
  const filtered = events.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.location.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 page-enter">

      {/* Page header */}
      <div className="mb-10">
        <p className="text-xs font-mono text-amber-500 tracking-[0.3em] uppercase mb-2">
          Hello, {user?.username || 'there'}
        </p>
        <h1 className="font-display text-4xl md:text-5xl font-700 text-slate-100 leading-tight">
          Upcoming Events
        </h1>
        <p className="text-slate-500 mt-3 text-sm">
          Discover events and secure your spot
        </p>
      </div>

      {/* Search + stats row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600"
               fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by title or location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        {!loading && (
          <span className="tag shrink-0">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {filtered.length} event{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-sm px-5 py-4
                        text-red-400 text-sm text-center mb-8">
          {error}
        </div>
      )}

      {/* Events grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 border border-dashed border-ink-700 rounded-sm">
          <div className="w-12 h-12 bg-ink-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-slate-500 font-display text-xl">No events found</p>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-amber-400 text-sm mt-2 hover:text-amber-300 transition-colors"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((event, i) => (
            <EventCard key={event.id} event={event} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
