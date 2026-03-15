import { useState, useEffect, useCallback } from "react";
import {
  UserCheck, UserX, Clock, Search, RefreshCw,
  Mail, AlertCircle, CheckCircle2, ChevronDown,
} from "lucide-react";
import api from "../utils/api";

export default function ApprovalQueuePage() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [actionModal, setActionModal] = useState(null); // { user, action: "approve"|"reject" }
  const [reason, setReason]     = useState("");
  const [processing, setProcessing] = useState(false);
  const [toast, setToast]       = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ ordering: "approval_requested_at" });
    if (search) params.set("search", search);
    api.get(`/users/pending/?${params}`)
      .then((r) => setUsers(r.data.results || r.data))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  };

  const handleAction = async () => {
    if (!actionModal) return;
    if (actionModal.action === "reject" && !reason.trim()) return;
    setProcessing(true);
    try {
      await api.post(`/users/${actionModal.user.id}/approve/`, {
        action: actionModal.action,
        rejection_reason: reason,
      });
      showToast(
        actionModal.action === "approve"
          ? `${actionModal.user.full_name} approved successfully.`
          : `${actionModal.user.full_name}'s request rejected.`,
        actionModal.action === "approve",
      );
      setActionModal(null);
      setReason("");
      load();
    } catch (err) {
      const msg = err.response?.data?.detail || "Action failed.";
      showToast(typeof msg === "string" ? msg : JSON.stringify(msg), false);
    } finally {
      setProcessing(false);
    }
  };

  const formatWaiting = (ts) => {
    if (!ts) return "—";
    const delta = Date.now() - new Date(ts).getTime();
    const h = Math.floor(delta / 3600000);
    if (h < 1) return `${Math.floor(delta / 60000)}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl border text-sm font-medium transition-all
          ${toast.ok
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            : "bg-red-500/10 border-red-500/30 text-red-300"
          }`}>
          {toast.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserCheck size={22} className="text-orange-400" />
            Approval Queue
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {users.length} pending request{users.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-white text-sm transition-all disabled:opacity-50">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors" />
      </div>

      {/* List */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <RefreshCw size={24} className="animate-spin text-slate-600 mx-auto" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <CheckCircle2 size={40} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">No pending requests</p>
            <p className="text-slate-600 text-sm mt-1">All registration requests have been reviewed.</p>
          </div>
        ) : (
          users.map((u) => (
            <div key={u.id}
              className="flex items-center gap-4 px-5 py-4 border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {u.full_name[0].toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 text-sm font-semibold">{u.full_name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-slate-500 text-xs">
                    <Mail size={10} /> {u.email}
                  </span>
                  <span className="flex items-center gap-1 text-slate-500 text-xs">
                    <Clock size={10} /> {formatWaiting(u.approval_requested_at)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => { setActionModal({ user: u, action: "approve" }); setReason(""); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-all">
                  <UserCheck size={13} /> Approve
                </button>
                <button
                  onClick={() => { setActionModal({ user: u, action: "reject" }); setReason(""); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all">
                  <UserX size={13} /> Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirm modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setActionModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            {/* Modal header */}
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4
              ${actionModal.action === "approve" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
              {actionModal.action === "approve"
                ? <UserCheck size={22} className="text-emerald-400" />
                : <UserX size={22} className="text-red-400" />
              }
            </div>
            <h2 className="text-white font-bold text-lg mb-1">
              {actionModal.action === "approve" ? "Approve Registration" : "Reject Registration"}
            </h2>
            <p className="text-slate-400 text-sm mb-5">
              {actionModal.action === "approve"
                ? <>Approving <strong className="text-slate-200">{actionModal.user.full_name}</strong> will activate their account and allow them to log in.</>
                : <>Rejecting <strong className="text-slate-200">{actionModal.user.full_name}</strong> will deny their access. Please provide a reason.</>
              }
            </p>

            {/* Rejection reason */}
            {actionModal.action === "reject" && (
              <div className="mb-5">
                <label className="block text-slate-300 text-sm font-medium mb-1.5">
                  Reason for rejection *
                </label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)}
                  rows={3} placeholder="e.g. Not a current E-Cell member, invalid email domain…"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none transition-colors" />
                {!reason.trim() && (
                  <p className="text-slate-500 text-xs mt-1">Required before rejecting.</p>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button onClick={() => setActionModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-medium transition-colors">
                Cancel
              </button>
              <button onClick={handleAction}
                disabled={processing || (actionModal.action === "reject" && !reason.trim())}
                className={`flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition-all disabled:opacity-50
                  ${actionModal.action === "approve"
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg"
                    : "bg-gradient-to-r from-red-500 to-rose-600 hover:shadow-lg"
                  }`}>
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing…
                  </span>
                ) : actionModal.action === "approve" ? "Confirm Approval" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}