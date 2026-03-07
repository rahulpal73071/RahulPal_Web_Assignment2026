/**
 * pages/ManageEvents.jsx
 *
 * Admin dashboard showing all events in a table/list.
 * Provides quick actions: Edit, Delete, View.
 * Links to the Create Event form.
 */

import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { eventsAPI } from '../services/api'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

// Confirmation modal
function DeleteModal({ event, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Modal */}
      <div className="relative bg-ink-900 border border-ink-700 rounded-sm p-6 max-w-sm w-full
                      shadow-[0_24px_80px_rgba(0,0,0,0.6)] animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-500/10 border border-red-500/30 rounded-sm
                          flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <h3 className="font-display text-xl text-slate-100">Delete Event</h3>
        </div>
        <p className="text-slate-400 text-sm mb-2">
          Are you sure you want to delete:
        </p>
        <p className="text-slate-200 font-500 text-sm bg-ink-800 border border-ink-700
                      rounded-sm px-3 py-2 mb-6 font-mono">
          "{event.title}"
        </p>
        <p className="text-red-400/70 text-xs mb-6">
          This will permanently delete the event and all its registrations. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 bg-red-500 hover:bg-red-400 text-white text-sm font-body
                       tracking-wide uppercase px-4 py-2.5 rounded-sm transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 btn-ghost"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ManageEvents() {
  const [events, setEvents]           = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState('')
  const [search, setSearch]           = useState('')
  const [toDelete, setToDelete]       = useState(null)   // event object
  const [deleting, setDeleting]       = useState(false)
  const [deleteSuccess, setDeleteSuccess] = useState('')

  useEffect(() => {
    eventsAPI.getAll()
      .then(setEvents)
      .catch(() => setError('Failed to load events.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = events.filter(
    (e) =>
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.location.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    try {
      await eventsAPI.delete(toDelete.id)
      setEvents((prev) => prev.filter((e) => e.id !== toDelete.id))
      setDeleteSuccess(`"${toDelete.title}" was deleted.`)
      setTimeout(() => setDeleteSuccess(''), 4000)
    } catch {
      setError('Failed to delete event. Please try again.')
    } finally {
      setDeleting(false)
      setToDelete(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 page-enter">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-amber-500/10 border border-amber-500/30 rounded-sm
                            flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
              </svg>
            </div>
            <p className="text-xs font-mono text-amber-500 tracking-[0.3em] uppercase">Admin Panel</p>
          </div>
          <h1 className="font-display text-4xl font-700 text-slate-100">Manage Events</h1>
          <p className="text-slate-500 text-sm mt-1">
            {!loading && `${events.length} total event${events.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <Link
          to="/admin/create-event"
          className="btn-primary inline-flex items-center gap-2 shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create New Event
        </Link>
      </div>

      {/* Success toast */}
      {deleteSuccess && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-sm px-4 py-3
                        text-amber-400 text-sm flex items-center gap-2 mb-6 animate-fade-in">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          {deleteSuccess}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-sm px-4 py-3
                        text-red-400 text-sm mb-6">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6 max-w-sm">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600"
             fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search events…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-4 flex items-center gap-4">
              <div className="skeleton w-12 h-12 rounded-sm shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="skeleton h-4 w-1/3 rounded" />
                <div className="skeleton h-3 w-1/5 rounded" />
              </div>
              <div className="skeleton h-8 w-24 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20 border border-dashed border-ink-700 rounded-sm">
          <p className="text-slate-500 font-display text-xl mb-4">
            {search ? 'No events match your search' : 'No events yet'}
          </p>
          {!search && (
            <Link to="/admin/create-event" className="text-amber-400 text-sm hover:text-amber-300 transition-colors">
              Create your first event →
            </Link>
          )}
        </div>
      )}

      {/* Events table */}
      {!loading && filtered.length > 0 && (
        <div className="flex flex-col gap-3">
          {filtered.map((event, i) => (
            <div
              key={event.id}
              className="card p-4 flex flex-col sm:flex-row sm:items-center gap-4 group"
              style={{
                animationDelay: `${i * 50}ms`,
                animation: 'fadeUp 0.4s ease forwards',
                opacity: 0,
              }}
            >
              {/* Thumbnail */}
              <div className="w-14 h-14 rounded-sm overflow-hidden bg-ink-800 border border-ink-700 shrink-0">
                {event.image ? (
                  <img src={event.image} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-ink-600" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-display text-slate-100 text-base truncate
                               group-hover:text-amber-400 transition-colors">
                  {event.title}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-slate-500">
                  <span>{formatDate(event.date)}</span>
                  <span className="hidden sm:inline">·</span>
                  <span className="truncate max-w-[200px]">{event.location}</span>
                  <span className="hidden sm:inline">·</span>
                  <span className="text-amber-400/70">{event.registration_count} registered</span>
                </div>
              </div>

              {/* ID badge */}
              <span className="tag shrink-0 hidden lg:inline-flex">#{event.id}</span>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/event/${event.id}`}
                  className="p-2 text-slate-500 hover:text-slate-200 hover:bg-ink-700
                             rounded-sm transition-all"
                  title="View"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </Link>
                <Link
                  to={`/admin/edit-event/${event.id}`}
                  className="p-2 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10
                             rounded-sm transition-all"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                </Link>
                <button
                  onClick={() => setToDelete(event)}
                  className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10
                             rounded-sm transition-all"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation modal */}
      {toDelete && (
        <DeleteModal
          event={toDelete}
          onConfirm={handleDelete}
          onCancel={() => setToDelete(null)}
          deleting={deleting}
        />
      )}
    </div>
  )
}
