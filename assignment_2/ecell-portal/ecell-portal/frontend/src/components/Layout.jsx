import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Ticket, Users, Building2, ShieldCheck,
  Bell, LogOut, Menu, ChevronRight, Zap, UserCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import NotificationPanel from "./NotificationPanel";
import api from "../utils/api";

const NAV_ITEMS = [
  { path: "/dashboard",  label: "Dashboard",       icon: LayoutDashboard, roles: ["OC","MANAGER","COORDINATOR","USER"] },
  { path: "/tickets",    label: "Tickets",          icon: Ticket,          roles: ["OC","MANAGER","COORDINATOR","USER"] },
  { path: "/approvals",  label: "Approvals",        icon: UserCheck,       roles: ["OC","MANAGER","COORDINATOR"], badge: "approvals" },
  { path: "/users",      label: "Users",            icon: Users,           roles: ["OC","MANAGER"] },
  { path: "/departments",label: "Departments",      icon: Building2,       roles: ["OC"] },
  { path: "/audit",      label: "Audit Log",        icon: ShieldCheck,     roles: ["OC"] },
];

const ROLE_BADGE = {
  OC:          "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  MANAGER:     "bg-blue-500/20 text-blue-300 border border-blue-500/30",
  COORDINATOR: "bg-violet-500/20 text-violet-300 border border-violet-500/30",
  USER:        "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { unreadCount }  = useNotifications();
  const location  = useLocation();
  const navigate  = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen,   setNotifOpen]   = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Fetch pending approvals count for staff badge
  useEffect(() => {
    if (!["OC", "MANAGER", "COORDINATOR"].includes(user?.role)) return;
    api.get("/users/pending/")
      .then((r) => setPendingCount((r.data.results || r.data).length))
      .catch(() => {});
  }, [user?.role, location.pathname]); // refresh count whenever route changes

  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(user?.role));

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center shadow-lg shadow-orange-900/30">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm tracking-wide">E-Cell Portal</p>
            <p className="text-slate-500 text-xs">IIT Bombay</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleNav.map((item) => {
          const active = location.pathname.startsWith(item.path);
          const badgeCount = item.badge === "approvals" ? pendingCount : 0;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${active
                  ? "bg-gradient-to-r from-orange-500/20 to-rose-500/10 text-orange-300 border border-orange-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }
              `}
            >
              <item.icon size={16} className={active ? "text-orange-400" : ""} />
              <span className="flex-1">{item.label}</span>

              {/* Pending badge */}
              {badgeCount > 0 && (
                <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {badgeCount}
                </span>
              )}
              {active && !badgeCount && (
                <ChevronRight size={12} className="text-orange-400/60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/50 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user?.full_name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-xs font-semibold truncate">{user?.full_name}</p>
            <p className="text-slate-500 text-xs truncate">{user?.email}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${ROLE_BADGE[user?.role]}`}>
            {user?.role}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-950 border-r border-slate-800 flex-col flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative z-10 w-64 h-full bg-slate-950 border-r border-slate-800 flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 lg:px-6 bg-slate-950/80 backdrop-blur-sm flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-800 transition-colors text-slate-400"
          >
            <Menu size={18} />
          </button>
          <div className="hidden lg:block" />

          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative p-2 rounded-xl hover:bg-slate-800 transition-colors text-slate-400 hover:text-white"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}