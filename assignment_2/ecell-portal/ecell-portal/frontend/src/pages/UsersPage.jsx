import { useState, useEffect } from "react";
import { Search, UserCheck, Building2, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

const ROLE_BADGE = {
  OC: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  MANAGER: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  COORDINATOR: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  USER: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [promoteModal, setPromoteModal] = useState(null); // { user }
  const [promoteForm, setPromoteForm] = useState({ role: "COORDINATOR", department: "" });
  const [promoting, setPromoting] = useState(false);
  const [error, setError] = useState("");

  const loadUsers = () => {
    const params = new URLSearchParams({ ordering: "full_name" });
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);
    api.get(`/users/?${params}`).then((res) => {
      setUsers(res.data.results || res.data);
      setLoading(false);
    });
  };

  useEffect(() => { loadUsers(); }, [search, roleFilter]);
  useEffect(() => {
    api.get("/departments/").then((res) => setDepartments(res.data.results || res.data));
  }, []);

  const handlePromote = async () => {
    setPromoting(true);
    setError("");
    try {
      const payload = { role: promoteForm.role };
      if (promoteForm.department) payload.department = promoteForm.department;
      await api.post(`/users/${promoteModal.id}/promote/`, payload);
      setPromoteModal(null);
      loadUsers();
    } catch (err) {
      setError(
        err.response?.data?.detail?.role?.[0] ||
        err.response?.data?.detail?.department?.[0] ||
        err.response?.data?.detail ||
        "Promotion failed."
      );
    } finally {
      setPromoting(false);
    }
  };

  const canPromote = (target) => {
    if (currentUser.role === "OC") return target.role === "USER";
    if (currentUser.role === "MANAGER") return target.role === "USER" && target.department?.id === currentUser.department_id;
    return false;
  };

  const availableRoles = currentUser.role === "OC"
    ? ["COORDINATOR", "MANAGER"]
    : ["COORDINATOR"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Users</h1>
        <p className="text-slate-400 text-sm mt-0.5">{users.length} members</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-orange-500">
          <option value="">All Roles</option>
          {["OC","MANAGER","COORDINATOR","USER"].map((r) => <option key={r}>{r}</option>)}
        </select>
      </div>

      {/* Users table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : (
          users.map((u) => (
            <div key={u.id} className="flex items-center gap-4 px-5 py-4 border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {u.full_name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 text-sm font-medium truncate">{u.full_name}</p>
                <p className="text-slate-500 text-xs truncate">{u.email}</p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-slate-500 text-xs">
                <Building2 size={11} />
                {u.department_detail?.name || "—"}
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${ROLE_BADGE[u.role]}`}>
                {u.role}
              </span>
              {canPromote(u) && (
                <button
                  onClick={() => { setPromoteModal(u); setPromoteForm({ role: "COORDINATOR", department: u.department?.id || "" }); setError(""); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all"
                >
                  <UserCheck size={12} /> Promote
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Promote Modal */}
      {promoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPromoteModal(null)} />
          <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-white font-bold text-lg mb-1">Promote User</h2>
            <p className="text-slate-400 text-sm mb-5">
              Promoting <strong className="text-slate-200">{promoteModal.full_name}</strong>
            </p>
            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 mb-4">{error}</p>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-slate-300 text-sm mb-1.5">New Role</label>
                <select value={promoteForm.role} onChange={(e) => setPromoteForm({ ...promoteForm, role: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500">
                  {availableRoles.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              {(promoteForm.role === "MANAGER" || promoteForm.role === "COORDINATOR") && (
                <div>
                  <label className="block text-slate-300 text-sm mb-1.5">Department</label>
                  <select value={promoteForm.department} onChange={(e) => setPromoteForm({ ...promoteForm, department: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500">
                    <option value="">Select department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setPromoteModal(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-medium transition-colors">
                  Cancel
                </button>
                <button onClick={handlePromote} disabled={promoting}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 text-white font-bold text-sm hover:shadow-lg transition-all disabled:opacity-50">
                  {promoting ? "Promoting..." : "Confirm Promotion"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
