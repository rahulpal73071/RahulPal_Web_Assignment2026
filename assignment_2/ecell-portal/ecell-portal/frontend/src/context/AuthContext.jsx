import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../utils/api";

const AuthContext = createContext(null);

function decodeJWT(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return payload;
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  const payload = decodeJWT(token);
  if (!payload?.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(() => {
    const token = localStorage.getItem("access_token");
    if (!token || isTokenExpired(token)) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setUser(null);
      setLoading(false);
      return;
    }
    const payload = decodeJWT(token);
    setUser({
      id: payload.user_id,
      email: payload.email,
      full_name: payload.full_name,
      role: payload.role,
      department_id: payload.department_id,
      department_name: payload.department_name,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/token/", { email, password });
    localStorage.setItem("access_token", data.access);
    localStorage.setItem("refresh_token", data.refresh);
    const payload = decodeJWT(data.access);
    const userData = {
      id: payload.user_id,
      email: payload.email,
      full_name: payload.full_name,
      role: payload.role,
      department_id: payload.department_id,
      department_name: payload.department_name,
    };
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    const refresh = localStorage.getItem("refresh_token");
    try {
      if (refresh) await api.post("/auth/token/blacklist/", { refresh });
    } catch {
      /* Best effort */
    } finally {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      setUser(null);
    }
  };

  const refreshToken = useCallback(async () => {
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) throw new Error("No refresh token");
    const { data } = await api.post("/auth/token/refresh/", { refresh });
    localStorage.setItem("access_token", data.access);
    if (data.refresh) localStorage.setItem("refresh_token", data.refresh);
    loadUser();
    return data.access;
  }, [loadUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
