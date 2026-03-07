/**
 * pages/RegisterEvent.jsx
 *
 * Registration form for a specific event.
 * Collects: name, phone, college, year.
 * On success, redirects to /my-registrations.
 */

import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { eventsAPI, registrationsAPI } from '../services/api'

const YEAR_OPTIONS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Final Year', 'Postgraduate', 'Other']

export default function RegisterEvent() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [event, setEvent] = useState(null)
  const [eventLoading, setEventLoading] = useState(true)

  const [form, setForm] = useState({ name: '', phone: '', college: '', year: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Load event info so we can show the event title in the form
  useEffect(() => {
    eventsAPI.getById(id)
      .then(setEvent)
      .catch(() => setError('Could not load event details.'))
      .finally(() => setEventLoading(false))
  }, [id])

  const handleChange = (e) => {
    setError('')
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.name || !form.phone || !form.college || !form.year) {
      setError('Please fill in all fields.')
      return
    }
    if (!/^\d{10}$/.test(form.phone.replace(/\s/g, ''))) {
      setError('Please enter a valid 10-digit phone number.')
      return
    }

    setSubmitting(true)
    try {
      await registrationsAPI.register({ event: Number(id), ...form })
      setSuccess(true)
      setTimeout(() => navigate('/my-registrations'), 2000)
    } catch (err) {
      const msg =
        err.response?.data?.event?.[0] ||
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        'Registration failed. Please try again.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <div className="text-center page-enter">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-full
                          flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-display text-2xl text-slate-100 mb-2">You're Registered!</h2>
          <p className="text-slate-500 text-sm">Redirecting to your events…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10 page-enter">

      {/* Back link */}
      <Link
        to={`/event/${id}`}
        className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm mb-8 transition-colors group"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
             fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Event Details
      </Link>

      {/* Page header */}
      <div className="mb-8">
        <p className="text-xs font-mono text-amber-500 tracking-[0.3em] uppercase mb-2">
          Step 1 of 1
        </p>
        <h1 className="font-display text-3xl font-700 text-slate-100">
          Register for Event
        </h1>
        {!eventLoading && event && (
          <p className="text-slate-500 text-sm mt-2">
            Registering for:{' '}
            <span className="text-slate-300 font-500">{event.title}</span>
          </p>
        )}
      </div>

      <div className="card p-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-sm px-4 py-3
                            text-red-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="label">Full Name <span className="text-amber-500">*</span></label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="John Doe"
              className="input-field"
              required
              autoFocus
            />
          </div>

          {/* Phone */}
          <div>
            <label className="label">Phone Number <span className="text-amber-500">*</span></label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="10-digit mobile number"
              className="input-field"
              required
            />
          </div>

          {/* College */}
          <div>
            <label className="label">College / Institution <span className="text-amber-500">*</span></label>
            <input
              type="text"
              name="college"
              value={form.college}
              onChange={handleChange}
              placeholder="e.g. IIT Bombay"
              className="input-field"
              required
            />
          </div>

          {/* Year */}
          <div>
            <label className="label">Academic Year <span className="text-amber-500">*</span></label>
            <select
              name="year"
              value={form.year}
              onChange={handleChange}
              className="input-field"
              required
            >
              <option value="" disabled>Select your year…</option>
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Submitting…
              </span>
            ) : 'Confirm Registration'}
          </button>
        </form>
      </div>
    </div>
  )
}
