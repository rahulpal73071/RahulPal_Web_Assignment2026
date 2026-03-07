/**
 * pages/EditEvent.jsx
 *
 * Admin-only page to edit an existing event.
 * Pre-fills all form fields with current event data.
 * Supports replacing or keeping the existing image.
 */

import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { eventsAPI } from '../services/api'

function FieldError({ message }) {
  if (!message) return null
  return (
    <p className="mt-1.5 text-red-400 text-xs flex items-center gap-1.5">
      <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd" />
      </svg>
      {message}
    </p>
  )
}

export default function EditEvent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    title: '', description: '', date: '', time: '', location: '',
  })
  const [existingImage, setExistingImage] = useState(null) // URL of current image
  const [imageFile, setImageFile]         = useState(null) // new file chosen by admin
  const [imagePreview, setImagePreview]   = useState(null) // local blob preview

  const [pageLoading, setPageLoading] = useState(true)
  const [submitting, setSubmitting]   = useState(false)
  const [errors, setErrors]           = useState({})
  const [globalError, setGlobalError] = useState('')
  const [success, setSuccess]         = useState(false)

  // Load existing event
  useEffect(() => {
    eventsAPI.getById(id)
      .then((event) => {
        const dt = new Date(event.date)
        const pad = (n) => String(n).padStart(2, '0')
        setForm({
          title:       event.title,
          description: event.description,
          date:        `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`,
          time:        `${pad(dt.getHours())}:${pad(dt.getMinutes())}`,
          location:    event.location,
        })
        setExistingImage(event.image || null)
      })
      .catch(() => setGlobalError('Could not load event data.'))
      .finally(() => setPageLoading(false))
  }, [id])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    setGlobalError('')
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
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
    setExistingImage(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const validate = () => {
    const e = {}
    if (!form.title.trim())       e.title = 'Title is required.'
    if (!form.description.trim()) e.description = 'Description is required.'
    if (!form.date)               e.date = 'Date is required.'
    if (!form.time)               e.time = 'Time is required.'
    if (!form.location.trim())    e.location = 'Location is required.'
    return e
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    setGlobalError('')

    const ve = validate()
    if (Object.keys(ve).length > 0) { setErrors(ve); return }

    const datetime = `${form.date}T${form.time}:00`
    const formData = new FormData()
    formData.append('title',       form.title.trim())
    formData.append('description', form.description.trim())
    formData.append('date',        datetime)
    formData.append('location',    form.location.trim())
    if (imageFile) formData.append('image', imageFile)

    setSubmitting(true)
    try {
      await eventsAPI.update(id, formData)
      setSuccess(true)
      setTimeout(() => navigate(`/event/${id}`), 2000)
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const apiErrors = {}
        Object.entries(data).forEach(([k, v]) => {
          apiErrors[k] = Array.isArray(v) ? v[0] : v
        })
        setErrors(apiErrors)
      } else {
        setGlobalError('Failed to update event. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (pageLoading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="skeleton h-8 w-48 mb-10 rounded" />
        <div className="card p-6 flex flex-col gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-10 w-full rounded" />
          ))}
        </div>
      </div>
    )
  }

  // ── Success ────────────────────────────────────────────────────────────────
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
          <h2 className="font-display text-2xl text-slate-100 mb-2">Event Updated!</h2>
          <p className="text-slate-500 text-sm">Redirecting to event page…</p>
        </div>
      </div>
    )
  }

  // ── Current image to display ───────────────────────────────────────────────
  const displayImage = imagePreview || existingImage

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
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
            </svg>
          </div>
          <p className="text-xs font-mono text-amber-500 tracking-[0.3em] uppercase">Admin Panel</p>
        </div>
        <h1 className="font-display text-4xl font-700 text-slate-100">Edit Event</h1>
        <p className="text-slate-500 text-sm mt-2 font-mono">ID #{id}</p>
      </div>

      {globalError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-sm px-4 py-3
                        text-red-400 text-sm flex items-center gap-2 mb-6">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {globalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* Basic info */}
        <div className="card p-6 flex flex-col gap-5">
          <h2 className="font-display text-lg text-slate-200 pb-3 border-b border-ink-700">
            Basic Information
          </h2>
          <div>
            <label className="label">Event Title <span className="text-amber-500">*</span></label>
            <input type="text" name="title" value={form.title} onChange={handleChange}
                   className="input-field" maxLength={255} />
            <FieldError message={errors.title} />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="label mb-0">Description <span className="text-amber-500">*</span></label>
              <span className={`text-xs font-mono ${form.description.length > 900 ? 'text-amber-400' : 'text-slate-600'}`}>
                {form.description.length}/1000
              </span>
            </div>
            <textarea name="description" value={form.description} onChange={handleChange}
                      rows={5} maxLength={1000} className="input-field resize-none leading-relaxed" />
            <FieldError message={errors.description} />
          </div>
        </div>

        {/* Date, time, location */}
        <div className="card p-6 flex flex-col gap-5">
          <h2 className="font-display text-lg text-slate-200 pb-3 border-b border-ink-700">
            When & Where
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="label">Date <span className="text-amber-500">*</span></label>
              <input type="date" name="date" value={form.date} onChange={handleChange}
                     className="input-field" style={{ colorScheme: 'dark' }} />
              <FieldError message={errors.date} />
            </div>
            <div>
              <label className="label">Time <span className="text-amber-500">*</span></label>
              <input type="time" name="time" value={form.time} onChange={handleChange}
                     className="input-field" style={{ colorScheme: 'dark' }} />
              <FieldError message={errors.time} />
            </div>
          </div>
          <div>
            <label className="label">Location <span className="text-amber-500">*</span></label>
            <input type="text" name="location" value={form.location} onChange={handleChange}
                   className="input-field" maxLength={500} />
            <FieldError message={errors.location} />
          </div>
        </div>

        {/* Image */}
        <div className="card p-6 flex flex-col gap-4">
          <h2 className="font-display text-lg text-slate-200 pb-3 border-b border-ink-700">
            Event Image
            <span className="ml-2 text-slate-600 font-body text-sm font-400">(optional)</span>
          </h2>

          {displayImage ? (
            <div className="relative rounded-sm overflow-hidden border border-ink-600 group">
              <img src={displayImage} alt="Preview" className="w-full h-52 object-cover" />
              <div className="absolute inset-0 bg-ink-950/60 opacity-0 group-hover:opacity-100
                              transition-opacity flex items-center justify-center gap-3">
                <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="bg-ink-800 border border-ink-600 text-slate-300 text-xs px-4 py-2
                                   rounded-sm hover:border-amber-500/50 hover:text-amber-400 transition-all">
                  Change Image
                </button>
                <button type="button" onClick={removeImage}
                        className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-4 py-2
                                   rounded-sm hover:bg-red-500/20 transition-all">
                  Remove
                </button>
              </div>
              {imagePreview && (
                <div className="absolute bottom-3 left-3 bg-ink-950/80 backdrop-blur-sm
                                border border-amber-500/30 rounded-sm px-3 py-1">
                  <span className="text-amber-400 text-xs font-mono">New image selected</span>
                </div>
              )}
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-ink-600 hover:border-amber-500/40
                               rounded-sm p-10 flex flex-col items-center gap-3 transition-all
                               hover:bg-amber-500/5 group">
              <div className="w-12 h-12 bg-ink-800 rounded-full flex items-center justify-center
                              group-hover:bg-amber-500/10 transition-colors border border-ink-700
                              group-hover:border-amber-500/30">
                <svg className="w-6 h-6 text-slate-500 group-hover:text-amber-400 transition-colors"
                     fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round"
                        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <p className="text-slate-500 text-sm group-hover:text-slate-300 transition-colors">
                Upload a new image
              </p>
            </button>
          )}

          <input ref={fileInputRef} type="file" accept="image/*"
                 onChange={handleImageChange} className="hidden" />
          <FieldError message={errors.image} />
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button type="submit" disabled={submitting}
                  className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Saving…
              </span>
            ) : 'Save Changes'}
          </button>
          <Link to="/admin/manage-events"
                className="btn-ghost text-center flex-1 sm:flex-none sm:px-8">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}
