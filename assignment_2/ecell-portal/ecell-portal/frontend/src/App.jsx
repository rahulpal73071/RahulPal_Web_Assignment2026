import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Dashboard from "./components/Dashboard";
import TicketList from "./pages/TicketList";
import TicketDetail from "./pages/TicketDetail";
import CreateTicket from "./pages/CreateTicket";
import UsersPage from "./pages/UsersPage";
import DepartmentsPage from "./pages/DepartmentsPage";
import AuditPage from "./pages/AuditPage";
import ApprovalQueuePage from "./pages/ApprovalQueuePage";
import Layout from "./components/Layout";

/**
 * RoleProtectedRoute — wraps a route with role-based access control.
 * Falls back to /dashboard if role insufficient, or /login if unauthenticated.
 */
function RoleProtectedRoute({ children, allowedRoles = [] }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public auth routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
      />
      <Route
        path="/register"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
      />

      {/* Protected app routes */}
      <Route
        path="/"
        element={
          <RoleProtectedRoute>
            <Layout />
          </RoleProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="tickets" element={<TicketList />} />
        <Route path="tickets/new" element={<CreateTicket />} />
        <Route path="tickets/:id" element={<TicketDetail />} />

        {/* Staff only */}
        <Route
          path="users"
          element={
            <RoleProtectedRoute allowedRoles={["OC", "MANAGER"]}>
              <UsersPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="approvals"
          element={
            <RoleProtectedRoute allowedRoles={["OC", "MANAGER", "COORDINATOR"]}>
              <ApprovalQueuePage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="departments"
          element={
            <RoleProtectedRoute allowedRoles={["OC"]}>
              <DepartmentsPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="audit"
          element={
            <RoleProtectedRoute allowedRoles={["OC"]}>
              <AuditPage />
            </RoleProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <AppRoutes />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}