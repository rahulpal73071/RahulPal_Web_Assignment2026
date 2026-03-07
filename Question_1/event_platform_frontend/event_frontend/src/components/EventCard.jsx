/**
 * components/EventCard.jsx
 *
 * A fully working card component for displaying a single event.
 * Works immediately without animation issues or missing Tailwind colors.
 */

import { Link } from 'react-router-dom'

// Format ISO date string to human-readable
function formatDate(iso) {
  const date = new Date(iso)
  return {
    day: date.toLocaleDateString('en-US', { day: '2-digit' }),
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    year: date.getFullYear(),
    time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    full: date.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' }),
  }
}

export default function EventCard({ event }) {
  const dt = formatDate(event.date)

  return (
    <article className="bg-gray-800 rounded-lg overflow-hidden shadow-md flex flex-col transition-transform hover:scale-105">
      
      {/* Event Image */}
      <div className="relative h-44 w-full">
        {event.image ? (
          <img
            src={event.image}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-700 flex items-center justify-center">
            <span className="text-gray-400">No Image</span>
          </div>
        )}

        {/* Date badge */}
        <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs text-center">
          <div className="font-bold">{dt.day}</div>
          <div>{dt.month}</div>
        </div>

        {/* Registration badge */}
        {event.registration_count > 0 && (
          <div className="absolute top-2 right-2 bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs">
            {event.registration_count} registered
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col flex-1 gap-2">
        {/* Title */}
        <h3 className="text-white font-semibold text-lg truncate">{event.title}</h3>

        {/* Location */}
        <div className="text-gray-400 text-sm flex items-center gap-1">
          <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {event.location}
        </div>

        {/* Time */}
        <div className="text-gray-400 text-sm flex items-center gap-1">
          <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {dt.time} · {dt.year}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* View Details Button */}
        <Link
          to={`/event/${event.id}`}
          className="mt-2 w-full text-center py-2 text-xs uppercase font-semibold border border-gray-600 text-gray-300 hover:text-yellow-400 hover:border-yellow-400 rounded transition-colors"
        >
          View Details →
        </Link>
      </div>
    </article>
  )
}