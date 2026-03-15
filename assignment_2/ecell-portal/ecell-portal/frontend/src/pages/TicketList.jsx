import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus, Search, Filter, ChevronRight, Clock,
  AlertTriangle, User, Building2
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

const STATUS_OPTS = ["", "OPEN", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "OVERDUE"];
const PRIORITY_OPTS = ["", "CRITICAL", "HIGH", "MEDIUM", "LOW"];

const STATUS_STYLES = {
  OPEN: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  ASSIGNED: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  IN_PROGRESS: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  RESOLVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  OVERDUE: "bg-red-500/10 text-red-400 border-red-500/20",
};

const PRIORITY_DOT = {
  LOW: "bg-slate-400",
  MEDIUM: "bg-yellow-400",
  HIGH: "bg-orange-400",
  CRITICAL: "bg-red-500 animate-pulse",
};

export default function TicketList() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 15;

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      ordering: "-created_at",
      page,
      page_size: PAGE_SIZE,
    });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (priorityFilter) params.set("priority", priorityFilter);

    api.get(`/tickets/?${params}`)
      .then((res) => {
        setTickets(res.data.results || res.data);
        setTotalCount(res.data.count || res.data.length);
      })
      .finally(() => setLoading(false));
  }, [search, statusFilter, priorityFilter, page]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tickets</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {totalCount} ticket{totalCount !== 1 ? "s" : ""} found
          </p>
        </div>
        <Link
          to="/tickets/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 text-white font-semibold text-sm hover:shadow-lg hover:scale-105 transition-all"
        >
          <Plus size={15} />
          New Ticket
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-48 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search tickets..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-orange-500 min-w-36"
        >
          {STATUS_OPTS.map((s) => (
            <option key={s} value={s}>{s || "All Statuses"}</option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
          className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-orange-500 min-w-36"
        >
          {PRIORITY_OPTS.map((p) => (
            <option key={p} value={p}>{p || "All Priorities"}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="space-y-px">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 bg-slate-900 animate-pulse border-b border-slate-800/50" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-16">
            <AlertTriangle size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400">No tickets match your filters</p>
          </div>
        ) : (
          <div>
            {/* Header row */}
            <div className="hidden md:grid grid-cols-12 px-5 py-3 border-b border-slate-800 text-xs text-slate-500 font-medium uppercase tracking-wider">
              <div className="col-span-5">Title</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Dept</div>
              <div className="col-span-2">Assignee</div>
              <div className="col-span-1">Date</div>
            </div>
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                className="grid grid-cols-12 px-5 py-4 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors group items-center"
              >
                <div className="col-span-12 md:col-span-5 flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[ticket.priority]}`} />
                  <div className="min-w-0">
                    <p className="text-slate-200 text-sm font-medium truncate group-hover:text-white">
                      {ticket.title}
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5 md:hidden">
                      {ticket.department?.name || "No dept"}
                    </p>
                  </div>
                </div>
                <div className="hidden md:block col-span-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_STYLES[ticket.status]}`}>
                    {ticket.status.replace("_", " ")}
                  </span>
                </div>
                <div className="hidden md:flex col-span-2 items-center gap-1.5 text-slate-400 text-xs">
                  <Building2 size={11} />
                  <span className="truncate">{ticket.department?.name || "—"}</span>
                </div>
                <div className="hidden md:flex col-span-2 items-center gap-1.5 text-slate-400 text-xs">
                  <User size={11} />
                  <span className="truncate">{ticket.assignee?.full_name || "Unassigned"}</span>
                </div>
                <div className="hidden md:flex col-span-1 items-center text-slate-500 text-xs">
                  {new Date(ticket.created_at).toLocaleDateString("en-IN", {
                    day: "2-digit", month: "short",
                  })}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-40 text-sm transition-colors"
          >
            Previous
          </button>
          <span className="text-slate-400 text-sm">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white disabled:opacity-40 text-sm transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
