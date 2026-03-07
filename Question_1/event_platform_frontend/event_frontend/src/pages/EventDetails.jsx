/**
 * pages/EventDetails.jsx
 *
 * Full detail view for a single event.
 * Shows image, description, metadata, and a "Register" button
 * that navigates to the RegisterEvent page.
 */

import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { eventsAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'

function formatDateFull(iso) {
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
  }
}

export default function EventDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchEvent = async () => {
      try {
        const data = await eventsAPI.getById(id)
        setEvent(data)
      } catch (err) {
        if (err.response?.status === 404) {
          setError('Event not found.')
        } else {
          setError('Failed to load event details.')
        }
      } finally {
        setLoading(false)
      }
    }
    fetchEvent()
  }, [id])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="skeleton h-72 w-full rounded-sm mb-8" />
        <div className="skeleton h-8 w-2/3 mb-4 rounded" />
        <div className="skeleton h-4 w-full mb-2 rounded" />
        <div className="skeleton h-4 w-5/6 mb-2 rounded" />
        <div className="skeleton h-4 w-4/6 rounded" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center page-enter">
        <p className="text-slate-500 font-display text-2xl mb-4">{error}</p>
        <Link to="/dashboard" className="text-amber-400 hover:text-amber-300 text-sm transition-colors">
          ← Back to Dashboard
        </Link>
      </div>
    )
  }

  if (!event) return null

  const { date, time } = formatDateFull(event.date)

  const handleRegisterClick = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/register/${id}` } } })
    } else {
      navigate(`/register/${id}`)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 page-enter">

      {/* Back link */}
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300
                   text-sm mb-8 transition-colors group"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
             fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        All Events
      </Link>

      {/* Hero image */}
      <div className="h-64 md:h-80 rounded-sm overflow-hidden bg-ink-800 mb-8 border border-ink-700">
        {event.image ? (
          <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-ink-700 via-ink-800 to-ink-900
                          flex flex-col items-center justify-center gap-3">
            <svg className="w-16 h-16 text-ink-600" fill="none" stroke="currentColor" strokeWidth="0.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-slate-600 font-mono text-xs tracking-widest">NO IMAGE</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="grid md:grid-cols-3 gap-8">

        {/* Left: main info */}
        <div className="md:col-span-2">
          <h1 className="font-display text-3xl md:text-4xl font-700 text-slate-100 leading-tight mb-4">
            {event.title}
          </h1>

          <div className="rule mb-6" />

          <p className="text-slate-400 leading-relaxed text-sm font-body whitespace-pre-line">
            {event.description}
          </p>

          {/* Creator info */}
          {event.created_by && (
            <div className="mt-8 pt-6 rule">
              <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-1">
                Organised by
              </p>
              <p className="text-slate-300 text-sm">
                {event.created_by.first_name
                  ? `${event.created_by.first_name} ${event.created_by.last_name}`
                  : event.created_by.username}
              </p>
            </div>
          )}
        </div>

        {/* Right: metadata + CTA */}
        <div className="flex flex-col gap-4">

          {/* Meta card */}
          <div className="bg-ink-800 border border-ink-700 rounded-sm p-5 flex flex-col gap-4">

            {/* Date */}
            <div>
              <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-1.5">Date</p>
              <p className="text-slate-200 text-sm font-body">{date}</p>
            </div>

            <div className="rule" />

            {/* Time */}
            <div>
              <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-1.5">Time</p>
              <p className="text-slate-200 text-sm font-body">{time}</p>
            </div>

            <div className="rule" />

            {/* Location */}
            <div>
              <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-1.5">Location</p>
              <p className="text-slate-200 text-sm font-body">{event.location}</p>
            </div>

            <div className="rule" />

            {/* Registered count */}
            <div>
              <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-1.5">Registered</p>
              <p className="text-amber-400 font-display text-2xl font-600">
                {event.registration_count}
                <span className="text-slate-600 font-body text-sm ml-1 font-400">attendees</span>
              </p>
            </div>
          </div>

          {/* Register CTA */}
          <button
            onClick={handleRegisterClick}
            className="btn-primary w-full text-center"
          >
            Register Now
          </button>

          {!isAuthenticated && (
            <p className="text-xs text-slate-600 text-center">
              You'll be asked to log in first
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
