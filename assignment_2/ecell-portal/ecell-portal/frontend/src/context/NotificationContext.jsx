import { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:8000";

export function NotificationProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);

  const connect = useCallback(() => {
    if (!isAuthenticated) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const ws = new WebSocket(`${WS_BASE}/ws/notifications/?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[WS] Notification channel connected");
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        if (data.type === "notification") {
          const notification = {
            id: `${Date.now()}-${Math.random()}`,
            level: data.level || "info",
            title: data.title || "",
            message: data.message || "",
            ticket_id: data.ticket_id || null,
            timestamp: data.timestamp || new Date().toISOString(),
            read: false,
          };
          setNotifications((prev) => [notification, ...prev].slice(0, 50));
          setUnreadCount((c) => c + 1);
        }
      } catch (e) {
        console.error("[WS] Parse error", e);
      }
    };

    ws.onclose = (e) => {
      console.warn("[WS] Notifications disconnected, code:", e.code);
      if (e.code !== 4001 && e.code !== 4003 && isAuthenticated) {
        reconnectTimer.current = setTimeout(connect, 3000);
      }
    };

    ws.onerror = (err) => {
      console.error("[WS] Notification error", err);
      ws.close();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      connect();
    } else {
      wsRef.current?.close();
    }
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [isAuthenticated, connect]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const markRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const dismiss = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const addToast = useCallback((notification) => {
    const id = `toast-${Date.now()}`;
    setNotifications((prev) => [{ ...notification, id, read: false }, ...prev].slice(0, 50));
    setUnreadCount((c) => c + 1);
    setTimeout(() => dismiss(id), 6000);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAllRead,
        markRead,
        dismiss,
        addToast,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
