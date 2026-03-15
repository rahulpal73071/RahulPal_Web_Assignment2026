// DepartmentsPage.jsx
import { useState, useEffect } from "react";
import { Plus, Building2, Users, Edit2, Trash2, X, Check } from "lucide-react";
import api from "../utils/api";

export function DepartmentsPage() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const load = () => api.get("/departments/").then((r) => { setDepartments(r.data.results || r.data); setLoading(false); });
  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) { setError("Name is required"); return; }
    setCreating(true);
    try {
      await api.post("/departments/", form);
      setShowCreate(false);
      setForm({ name: "", description: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Creation failed");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this department? This cannot be undone.")) return;
    await api.delete(`/departments/${id}/`);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Departments</h1>
          <p className="text-slate-400 text-sm mt-0.5">{departments.length} departments</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 text-white font-semibold text-sm hover:shadow-lg transition-all">
          <Plus size={15} /> New Department
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
          ))
        ) : departments.map((d) => (
          <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-600 transition-all group">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Building2 size={18} className="text-orange-400" />
              </div>
              <button onClick={() => handleDelete(d.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition-all">
                <Trash2 size={13} />
              </button>
            </div>
            <h3 className="text-white font-semibold">{d.name}</h3>
            {d.description && <p className="text-slate-400 text-xs mt-1 line-clamp-2">{d.description}</p>}
            <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-3">
              <Users size={11} /> {d.member_count} members
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-white font-bold text-lg mb-5">New Department</h2>
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm mb-1.5">Name *</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Technology, Marketing"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-slate-300 text-sm mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3} placeholder="Optional description"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-medium">Cancel</button>
                <button onClick={handleCreate} disabled={creating}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 text-white font-bold text-sm disabled:opacity-50">
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// AuditPage.jsx
import { ShieldCheck, User, Clock } from "lucide-react";

export function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/audit/?ordering=-timestamp").then((r) => {
      setLogs(r.data.results || r.data);
      setLoading(false);
    });
  }, []);

  const ACTION_COLORS = {
    CREATE_TICKET: "text-blue-400",
    STATUS_CHANGE: "text-violet-400",
    ASSIGN_TICKET: "text-yellow-400",
    PROMOTE_USER: "text-amber-400",
    AUTO_ESCALATE: "text-red-400",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck size={22} className="text-amber-400" /> Audit Log
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">All system actions and changes</p>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading audit log...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No audit entries found</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex gap-4 px-5 py-4 border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0">
                <ShieldCheck size={14} className="text-slate-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-bold ${ACTION_COLORS[log.action] || "text-slate-300"}`}>
                    {log.action.replace(/_/g, " ")}
                  </span>
                  <span className="text-slate-500 text-xs">·</span>
                  <span className="text-slate-400 text-xs">
                    {log.actor?.full_name || "System"}
                  </span>
                  <span className="text-slate-500 text-xs">·</span>
                  <span className="text-slate-500 text-xs">
                    {log.target_type} {String(log.target_id).slice(0,8)}...
                  </span>
                </div>
                {(log.previous_state || log.new_state) && (
                  <div className="flex gap-3 mt-1.5 text-xs">
                    {log.previous_state && (
                      <span className="text-slate-500">
                        Before: {JSON.stringify(log.previous_state)}
                      </span>
                    )}
                    {log.new_state && (
                      <span className="text-slate-400">
                        After: {JSON.stringify(log.new_state)}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 text-xs flex-shrink-0">
                <Clock size={10} />
                {new Date(log.timestamp).toLocaleString("en-IN", {
                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default DepartmentsPage;
