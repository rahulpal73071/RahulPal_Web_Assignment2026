import { useState, useEffect } from "react";
import { ShieldCheck, Clock } from "lucide-react";
import api from "../utils/api";

const ACTION_COLORS = {
  CREATE_TICKET: "text-blue-400 bg-blue-500/10",
  STATUS_CHANGE: "text-violet-400 bg-violet-500/10",
  ASSIGN_TICKET: "text-yellow-400 bg-yellow-500/10",
  PROMOTE_USER: "text-amber-400 bg-amber-500/10",
  AUTO_ESCALATE: "text-red-400 bg-red-500/10",
};

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    api.get(`/audit/?ordering=-timestamp&page=${page}`).then((r) => {
      setLogs(r.data.results || r.data);
      setTotal(r.data.count || 0);
      setLoading(false);
    });
  }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <ShieldCheck size={22} className="text-amber-400" /> Audit Log
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Complete record of all system actions · {total} entries
        </p>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <ShieldCheck size={36} className="text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">No audit entries yet</p>
          </div>
        ) : (
          logs.map((log) => {
            const colors = ACTION_COLORS[log.action] || "text-slate-400 bg-slate-800";
            return (
              <div key={log.id} className="flex gap-4 px-5 py-4 border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-lg self-start flex-shrink-0 ${colors}`}>
                  {log.action.replace(/_/g, " ")}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 text-sm">
                    <span className="font-medium">{log.actor?.full_name || "System"}</span>
                    {" · "}
                    <span className="text-slate-500">{log.target_type}</span>
                    {" "}
                    <span className="text-slate-600 font-mono text-xs">{String(log.target_id).slice(0, 8)}…</span>
                  </p>
                  {(log.previous_state || log.new_state) && (
                    <div className="mt-1.5 text-xs text-slate-500 font-mono">
                      {log.previous_state && <span className="mr-3">← {JSON.stringify(log.previous_state)}</span>}
                      {log.new_state && <span className="text-slate-400">→ {JSON.stringify(log.new_state)}</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 text-xs flex-shrink-0 self-start">
                  <Clock size={10} />
                  {new Date(log.timestamp).toLocaleString("en-IN", {
                    day: "2-digit", month: "short",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 disabled:opacity-40 text-sm">
            Previous
          </button>
          <span className="px-4 py-2 text-slate-400 text-sm">Page {page}</span>
          <button disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 disabled:opacity-40 text-sm">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
