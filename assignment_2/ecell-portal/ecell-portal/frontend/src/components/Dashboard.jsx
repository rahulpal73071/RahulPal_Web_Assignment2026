import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  TicketCheck, Clock, AlertTriangle, CheckCircle2,
  TrendingUp, Users, Building2, Plus, ArrowRight,
  Flame, Zap, Shield
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

const ROLE_COLORS = {
  OC: "from-amber-500 to-orange-600",
  MANAGER: "from-blue-500 to-indigo-600",
  COORDINATOR: "from-violet-500 to-purple-600",
  USER: "from-emerald-500 to-teal-600",
};

const ROLE_LABELS = {
  OC: "Organizing Committee",
  MANAGER: "Department Manager",
  COORDINATOR: "Coordinator",
  USER: "Member",
};

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-6 group hover:border-slate-600 transition-all duration-300">
      <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium tracking-wide uppercase">{label}</p>
          <p className="text-4xl font-bold text-white mt-2 font-mono">{value ?? "—"}</p>
          {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${color} bg-opacity-10`}>
          <Icon size={22} className="text-white" />
        </div>
      </div>
    </div>
  );
}

function RecentTicketRow({ ticket }) {
  const statusStyles = {
    OPEN: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    ASSIGNED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    IN_PROGRESS: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    RESOLVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    OVERDUE: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const priorityDot = {
    LOW: "bg-slate-400",
    MEDIUM: "bg-yellow-400",
    HIGH: "bg-orange-400",
    CRITICAL: "bg-red-500 animate-pulse",
  };

  return (
    <Link
      to={`/tickets/${ticket.id}`}
      className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-800/50 transition-colors group"
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityDot[ticket.priority]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-slate-200 text-sm font-medium truncate group-hover:text-white transition-colors">
          {ticket.title}
        </p>
        <p className="text-slate-500 text-xs mt-0.5">
          {ticket.department?.name || "Unassigned dept"} ·{" "}
          {new Date(ticket.created_at).toLocaleDateString("en-IN", {
            day: "2-digit", month: "short",
          })}
        </p>
      </div>
      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusStyles[ticket.status]}`}>
        {ticket.status.replace("_", " ")}
      </span>
      <ArrowRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/dashboard/stats/"),
      api.get("/tickets/?ordering=-created_at&page_size=6"),
    ])
      .then(([statsRes, ticketsRes]) => {
        setStats(statsRes.data);
        setRecentTickets(ticketsRes.data.results || ticketsRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const gradientClass = ROLE_COLORS[user?.role] || ROLE_COLORS.USER;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className={`px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r ${gradientClass} text-white tracking-widest uppercase`}>
              {ROLE_LABELS[user?.role]}
            </div>
            {user?.department_name && (
              <span className="text-slate-500 text-xs flex items-center gap-1">
                <Building2 size={12} />
                {user.department_name}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-white">
            Welcome back, {user?.full_name?.split(" ")[0]} 👋
          </h1>
          <p className="text-slate-400 mt-1">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>
        <Link
          to="/tickets/new"
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r ${gradientClass} text-white font-semibold text-sm hover:shadow-lg hover:scale-105 transition-all duration-200`}
        >
          <Plus size={16} />
          New Ticket
        </Link>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-slate-900 border border-slate-800 p-6 animate-pulse">
              <div className="h-4 bg-slate-800 rounded w-2/3 mb-4" />
              <div className="h-10 bg-slate-800 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            icon={TicketCheck}
            label="Total Tickets"
            value={stats?.total}
            color="from-blue-500 to-indigo-600"
          />
          <StatCard
            icon={Zap}
            label="Open"
            value={stats?.open}
            color="from-cyan-500 to-blue-500"
          />
          <StatCard
            icon={TrendingUp}
            label="In Progress"
            value={stats?.in_progress}
            color="from-violet-500 to-purple-600"
          />
          <StatCard
            icon={CheckCircle2}
            label="Resolved"
            value={stats?.resolved}
            color="from-emerald-500 to-teal-600"
          />
          <StatCard
            icon={AlertTriangle}
            label="Overdue"
            value={stats?.overdue}
            color="from-red-500 to-rose-600"
            sub={stats?.overdue > 0 ? "Needs attention" : "All good!"}
          />
        </div>
      )}

      {/* OC-only department breakdown */}
      {user?.role === "OC" && stats?.by_department?.length > 0 && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
          <h2 className="text-slate-300 font-semibold mb-4 flex items-center gap-2">
            <Shield size={16} className="text-amber-400" />
            Department Breakdown
          </h2>
          <div className="space-y-3">
            {stats.by_department.map((dept) => {
              const pct = stats.total > 0 ? Math.round((dept.count / stats.total) * 100) : 0;
              return (
                <div key={dept.department__name} className="flex items-center gap-4">
                  <span className="text-slate-400 text-sm w-36 truncate">{dept.department__name || "Unassigned"}</span>
                  <div className="flex-1 bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${gradientClass} rounded-full transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-slate-300 text-sm font-mono w-8 text-right">{dept.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Tickets */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-slate-300 font-semibold flex items-center gap-2">
            <Clock size={16} className="text-slate-400" />
            Recent Tickets
          </h2>
          <Link
            to="/tickets"
            className="text-slate-400 hover:text-white text-sm flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <div className="p-2">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentTickets.length === 0 ? (
            <div className="text-center py-12">
              <TicketCheck size={40} className="text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">No tickets yet</p>
              <Link to="/tickets/new" className="text-orange-400 text-sm hover:underline mt-1 inline-block">
                Create your first ticket →
              </Link>
            </div>
          ) : (
            recentTickets.slice(0, 6).map((t) => <RecentTicketRow key={t.id} ticket={t} />)
          )}
        </div>
      </div>
    </div>
  );
}
