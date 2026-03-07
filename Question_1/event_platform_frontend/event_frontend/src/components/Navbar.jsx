/**
 * components/Navbar.jsx
 *
 * Top navigation bar. Shows different links based on auth state:
 * - Logged in (regular): Dashboard, My Registrations, username, Logout
 * - Logged in (admin): + Admin dropdown with Manage Events / Create Event
 * - Logged out: Login, Sign Up
 */

import { useRef, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export default function Navbar() {
  const { isAuthenticated, isAdmin, user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const adminRef = useRef(null)

  const handleLogout = () => {
    logout()
    setMenuOpen(false)
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path
  const isAdminPath = location.pathname.startsWith('/admin')

  // Close admin dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (adminRef.current && !adminRef.current.contains(e.target)) {
        setAdminOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const navLink = (to, label) => (
    <Link
      to={to}
      onClick={() => setMenuOpen(false)}
      className={`text-sm tracking-widest uppercase font-body transition-colors duration-200 ${
        isActive(to)
          ? 'text-amber-400'
          : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {label}
    </Link>
  )

  return (
    <nav className="sticky top-0 z-50 bg-ink-950/90 backdrop-blur-md border-b border-ink-700">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <span className="w-7 h-7 bg-amber-500 rounded-sm flex items-center justify-center
                           group-hover:bg-amber-400 transition-colors">
            <svg className="w-4 h-4 text-ink-950" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </span>
          <span className="font-display font-700 text-slate-100 text-lg tracking-tight">
            Event<span className="text-amber-400">Sphere</span>
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7">
          {isAuthenticated ? (
            <>
              {navLink('/dashboard', 'Dashboard')}
              {navLink('/my-registrations', 'My Events')}

              {/* Admin dropdown */}
              {isAdmin && (
                <div className="relative" ref={adminRef}>
                  <button
                    onClick={() => setAdminOpen((v) => !v)}
                    className={`flex items-center gap-1.5 text-sm tracking-widest uppercase font-body
                                transition-colors duration-200 ${
                                  isAdminPath
                                    ? 'text-amber-400'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round"
                            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                    Admin
                    <svg
                      className={`w-3 h-3 transition-transform duration-200 ${adminOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown menu */}
                  {adminOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 bg-ink-900 border border-ink-700
                                    rounded-sm shadow-[0_16px_48px_rgba(0,0,0,0.5)] overflow-hidden
                                    animate-fade-in">
                      <div className="px-3 py-2 border-b border-ink-700">
                        <p className="text-xs font-mono text-slate-600 uppercase tracking-widest">
                          Admin Tools
                        </p>
                      </div>
                      <Link
                        to="/admin/manage-events"
                        onClick={() => setAdminOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-slate-400
                                   hover:text-slate-200 hover:bg-ink-800 transition-colors"
                      >
                        <svg className="w-4 h-4 text-amber-500/60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round"
                                d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                        </svg>
                        Manage Events
                      </Link>
                      <Link
                        to="/admin/create-event"
                        onClick={() => setAdminOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-slate-400
                                   hover:text-slate-200 hover:bg-ink-800 transition-colors"
                      >
                        <svg className="w-4 h-4 text-amber-500/60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Create Event
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <div className="h-4 w-px bg-ink-600" />

              {/* Username + admin badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">
                  {user?.username}
                </span>
                {isAdmin && (
                  <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400
                                   text-[10px] font-mono px-2 py-0.5 rounded-sm tracking-widest uppercase">
                    admin
                  </span>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="text-sm tracking-widest uppercase font-body text-slate-400
                           hover:text-red-400 transition-colors duration-200"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              {navLink('/login', 'Login')}
              <Link to="/signup" className="btn-primary py-2 px-5 text-xs">
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-slate-400 hover:text-slate-200 transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-ink-900 border-t border-ink-700 px-6 py-4 flex flex-col gap-4 animate-fade-in">
          {isAuthenticated ? (
            <>
              {navLink('/dashboard', 'Dashboard')}
              {navLink('/my-registrations', 'My Events')}

              {isAdmin && (
                <>
                  <div className="rule" />
                  <p className="text-xs font-mono text-slate-600 uppercase tracking-widest">Admin</p>
                  {navLink('/admin/manage-events', 'Manage Events')}
                  {navLink('/admin/create-event', 'Create Event')}
                </>
              )}

              <div className="rule" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-500">{user?.username}</span>
                {isAdmin && (
                  <span className="bg-amber-500/15 border border-amber-500/30 text-amber-400
                                   text-[10px] font-mono px-2 py-0.5 rounded-sm">admin</span>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="text-left text-sm text-slate-400 hover:text-red-400 transition-colors"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              {navLink('/login', 'Login')}
              {navLink('/signup', 'Sign Up')}
            </>
          )}
        </div>
      )}
    </nav>
  )
}
