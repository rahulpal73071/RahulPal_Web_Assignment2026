import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, X, CheckCheck, AlertTriangle, Info, CheckCircle, Zap } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";

const LEVEL_STYLES = {
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  success: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  error: { icon: Zap, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
};

export default function NotificationPanel({ onClose }) {
  const { notifications, unreadCount, markAllRead, dismiss } = useNotifications();
  const navigate = useNavigate();
  const panelRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleClick = (notif) => {
    if (notif.ticket_id) {
      navigate(`/tickets/${notif.ticket_id}`);
      onClose();
    }
  };

  const formatTime = (ts) => {
    try {
      const d = new Date(ts);
      const now = new Date();
      const diff = Math.floor((now - d) / 1000);
      if (diff < 60) return "just now";
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
    } catch {
      return "";
    }
  };

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-12 w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 z-50 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Bell size={15} className="text-slate-400" />
          <span className="text-slate-200 font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
              title="Mark all read"
            >
              <CheckCheck size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors text-slate-400"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="max-h-96 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-10">
            <Bell size={32} className="text-slate-700 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No notifications</p>
          </div>
        ) : (
          notifications.map((notif) => {
            const style = LEVEL_STYLES[notif.level] || LEVEL_STYLES.info;
            const Icon = style.icon;
            return (
              <div
                key={notif.id}
                className={`flex gap-3 px-4 py-3 border-b border-slate-800/50 transition-colors
                  ${!notif.read ? "bg-slate-800/30" : ""}
                  ${notif.ticket_id ? "cursor-pointer hover:bg-slate-800/50" : ""}`}
                onClick={() => handleClick(notif)}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${style.bg}`}>
                  <Icon size={14} className={style.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-slate-200 text-xs font-semibold">{notif.title}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); dismiss(notif.id); }}
                      className="text-slate-600 hover:text-slate-400 flex-shrink-0"
                    >
                      <X size={11} />
                    </button>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{notif.message}</p>
                  <p className="text-slate-600 text-xs mt-1">{formatTime(notif.timestamp)}</p>
                </div>
                {!notif.read && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
