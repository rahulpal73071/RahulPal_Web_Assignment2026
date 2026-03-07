/**
 * pages/CreateEvent.jsx
 *
 * Admin-only page to create a new event.
 *
 * Features:
 * - All event fields: title, description, date, time, location, image
 * - Live image preview before upload
 * - Character count on description
 * - Inline field-level validation errors from the API
 * - Success state with link to new event
 */

import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { eventsAPI } from '../services/api'

// ── Sub-components ─────────────────────────────────────────────────────────

function FieldError({ message }) {
  if (!message) return null
  return (
    <p className="mt-1.5 text-red-400 text-xs flex items-center gap-1.5">
      <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {message}
    </p>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function CreateEvent() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '',      // date part: YYYY-MM-DD
    time: '',      // time part: HH:MM
    location: '',
  })

  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})         // field-level errors from API
  const [globalError, setGlobalError] = useState('')
  const [createdEvent, setCreatedEvent] = useState(null)

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    // Clear error for this field when user starts typing
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    setGlobalError('')
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate type and size (max 5 MB)
    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, image: 'Please select a valid image file.' }))
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: 'Image must be smaller than 5 MB.' }))
      return
    }

    setErrors((prev) => ({ ...prev, image: '' }))
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Client-side validation ────────────────────────────────────────────────

  const validate = () => {
    const newErrors = {}
    if (!form.title.trim())       newErrors.title = 'Title is required.'
    if (!form.description.trim()) newErrors.description = 'Description is required.'
    if (!form.date)               newErrors.date = 'Date is required.'
    if (!form.time)               newErrors.time = 'Time is required.'
    if (!form.location.trim())    newErrors.location = 'Location is required.'
    return newErrors
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGlobalError('')

    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    // Combine date + time into ISO 8601 datetime string
    const datetime = `${form.date}T${form.time}:00`

    // Build FormData so we can include the image file
    const formData = new FormData()
    formData.append('title',       form.title.trim())
    formData.append('description', form.description.trim())
    formData.append('date',        datetime)
    formData.append('location',    form.location.trim())
    if (imageFile) formData.append('image', imageFile)

    setSubmitting(true)
    try {
      const event = await eventsAPI.create(formData)
      setCreatedEvent(event)
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        // Map API field errors back to the form
        const apiErrors = {}
        Object.entries(data).forEach(([key, val]) => {
          apiErrors[key] = Array.isArray(val) ? val[0] : val
        })
        setErrors(apiErrors)
      } else {
        setGlobalError('Failed to create event. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success State ─────────────────────────────────────────────────────────

  if (createdEvent) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4">
        <div className="text-center page-enter max-w-sm">
          <div className="relative mx-auto mb-6 w-20 h-20">
            <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-full
                            flex items-center justify-center animate-fade-in">
              <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="font-mono text-amber-500 text-xs tracking-[0.3em] uppercase mb-3">Published</p>
          <h2 className="font-display text-3xl text-slate-100 mb-2">Event Created!</h2>
          <p className="text-slate-500 text-sm mb-8">
            <span className="text-slate-300">"{createdEvent.title}"</span> is now live.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={`/event/${createdEvent.id}`} className="btn-primary">
              View Event
            </Link>
            <button
              onClick={() => {
                setCreatedEvent(null)
                setForm({ title: '', description: '', date: '', time: '', location: '' })
                setImageFile(null)
                setImagePreview(null)
                setErrors({})
              }}
              className="btn-ghost"
            >
              Create Another
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  const descLen = form.description.length

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 page-enter">

      {/* Header */}
      <div className="mb-10">
        <Link
          to="/admin/manage-events"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-300
                     text-sm mb-6 transition-colors group"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform"
               fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Manage Events
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-amber-500/10 border border-amber-500/30 rounded-sm
                          flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <p className="text-xs font-mono text-amber-500 tracking-[0.3em] uppercase">Admin Panel</p>
        </div>
        <h1 className="font-display text-4xl font-700 text-slate-100">Create New Event</h1>
        <p className="text-slate-500 text-sm mt-2">Fill in the details to publish a new event.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* Global error */}
        {globalError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-sm px-4 py-3
                          text-red-400 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {globalError}
          </div>
        )}

        {/* ── Section 1: Basic Info ────────────────────────────────────────── */}
        <div className="card p-6 flex flex-col gap-5">
          <h2 className="font-display text-lg text-slate-200 pb-3 border-b border-ink-700">
            Basic Information
          </h2>

          {/* Title */}
          <div>
            <label className="label">
              Event Title <span className="text-amber-500">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="e.g. Tech Summit 2025"
              className="input-field"
              maxLength={255}
              autoFocus
            />
            <FieldError message={errors.title} />
          </div>

          {/* Description */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="label mb-0">
                Description <span className="text-amber-500">*</span>
              </label>
              <span className={`text-xs font-mono ${descLen > 900 ? 'text-amber-400' : 'text-slate-600'}`}>
                {descLen}/1000
              </span>
            </div>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe what attendees can expect — agenda, speakers, topics covered…"
              rows={5}
              maxLength={1000}
              className="input-field resize-none leading-relaxed"
            />
            <FieldError message={errors.description} />
          </div>
        </div>

        {/* ── Section 2: Date, Time & Location ────────────────────────────── */}
        <div className="card p-6 flex flex-col gap-5">
          <h2 className="font-display text-lg text-slate-200 pb-3 border-b border-ink-700">
            When & Where
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Date */}
            <div>
              <label className="label">
                Date <span className="text-amber-500">*</span>
              </label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className="input-field"
                style={{ colorScheme: 'dark' }}
              />
              <FieldError message={errors.date} />
            </div>

            {/* Time */}
            <div>
              <label className="label">
                Time <span className="text-amber-500">*</span>
              </label>
              <input
                type="time"
                name="time"
                value={form.time}
                onChange={handleChange}
                className="input-field"
                style={{ colorScheme: 'dark' }}
              />
              <FieldError message={errors.time} />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="label">
              Location <span className="text-amber-500">*</span>
            </label>
            <input
              type="text"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="e.g. IIT Bombay, Main Auditorium"
              className="input-field"
              maxLength={500}
            />
            <FieldError message={errors.location} />
          </div>
        </div>

        {/* ── Section 3: Image Upload ──────────────────────────────────────── */}
        <div className="card p-6 flex flex-col gap-4">
          <h2 className="font-display text-lg text-slate-200 pb-3 border-b border-ink-700">
            Event Image
            <span className="ml-2 text-slate-600 font-body text-sm font-400">(optional)</span>
          </h2>

          {imagePreview ? (
            /* Image preview */
            <div className="relative rounded-sm overflow-hidden border border-ink-600 group">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full h-52 object-cover"
              />
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-ink-950/60 opacity-0 group-hover:opacity-100
                              transition-opacity flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-ink-800 border border-ink-600 text-slate-300 text-xs px-4 py-2
                             rounded-sm hover:border-amber-500/50 hover:text-amber-400 transition-all"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={removeImage}
                  className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-2
                             rounded-sm hover:bg-red-500/20 transition-all"
                >
                  Remove
                </button>
              </div>
              {/* File name badge */}
              <div className="absolute bottom-3 left-3 bg-ink-950/80 backdrop-blur-sm
                              border border-ink-700 rounded-sm px-3 py-1">
                <span className="text-slate-400 text-xs font-mono truncate max-w-[200px] block">
                  {imageFile?.name}
                </span>
              </div>
            </div>
          ) : (
            /* Drop zone */
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-ink-600 hover:border-amber-500/40
                         rounded-sm p-10 flex flex-col items-center gap-3 transition-all duration-200
                         hover:bg-amber-500/5 group"
            >
              <div className="w-12 h-12 bg-ink-800 rounded-full flex items-center justify-center
                              group-hover:bg-amber-500/10 transition-colors border border-ink-700
                              group-hover:border-amber-500/30">
                <svg className="w-6 h-6 text-slate-500 group-hover:text-amber-400 transition-colors"
                     fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-slate-400 text-sm group-hover:text-slate-300 transition-colors">
                  Click to upload an event image
                </p>
                <p className="text-slate-600 text-xs mt-1">PNG, JPG, WEBP · max 5 MB</p>
              </div>
            </button>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
          <FieldError message={errors.image} />
        </div>

        {/* ── Preview strip ────────────────────────────────────────────────── */}
        {(form.title || form.date || form.location) && (
          <div className="bg-ink-800/50 border border-ink-700 rounded-sm p-5">
            <p className="text-xs font-mono text-slate-600 uppercase tracking-widest mb-3">
              Live Preview
            </p>
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-sm overflow-hidden bg-ink-700 shrink-0 border border-ink-600">
                {imagePreview ? (
                  <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-ink-500" fill="none" stroke="currentColor" strokeWidth="1" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round"
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <div>
                <p className="font-display text-slate-100 text-base leading-tight">
                  {form.title || <span className="text-slate-600 italic">Event title…</span>}
                </p>
                {form.date && (
                  <p className="text-amber-400/70 text-xs font-mono mt-1">
                    {new Date(`${form.date}T${form.time || '00:00'}`).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'long', day: 'numeric', year: 'numeric'
                    })}
                    {form.time && ` · ${form.time}`}
                  </p>
                )}
                {form.location && (
                  <p className="text-slate-500 text-xs mt-0.5">{form.location}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Submit ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Publishing…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Publish Event
              </span>
            )}
          </button>
          <Link to="/admin/manage-events" className="btn-ghost text-center flex-1 sm:flex-none sm:px-8">
            Cancel
          </Link>
        </div>

      </form>
    </div>
  )
}
