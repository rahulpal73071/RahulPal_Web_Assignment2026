import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Zap, Mail, Lock, Eye, EyeOff, User, AlertCircle,
  Clock, CheckCircle2, XCircle, RefreshCw,
} from "lucide-react";
import api from "../utils/api";

/* ─── Step 1: Registration form ─────────────────────────────────────────── */
function RegisterForm({ onSuccess }) {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm_password: "" });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState({});

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.full_name.trim() || form.full_name.trim().length < 2)
      e.full_name = "Full name must be at least 2 characters.";
    if (!form.email.includes("@"))
      e.email = "Enter a valid email address.";
    if (form.password.length < 8)
      e.password = "Password must be at least 8 characters.";
    if (form.password !== form.confirm_password)
      e.confirm_password = "Passwords do not match.";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});
    try {
      await api.post("/auth/register/", form);
      onSuccess(form.email);
    } catch (err) {
      const detail = err.response?.data?.detail || err.response?.data || {};
      if (typeof detail === "object") setErrors(detail);
      else setErrors({ _general: String(detail) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errors._general && (
        <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm">{errors._general}</p>
        </div>
      )}

      {/* Full name */}
      <div>
        <label className="block text-slate-300 text-sm font-medium mb-1.5">Full Name</label>
        <div className="relative">
          <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="text" value={form.full_name} onChange={set("full_name")}
            placeholder="Rahul Sharma" autoComplete="name"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors" />
        </div>
        {errors.full_name && <p className="text-red-400 text-xs mt-1">{errors.full_name}</p>}
      </div>

      {/* Email */}
      <div>
        <label className="block text-slate-300 text-sm font-medium mb-1.5">Email</label>
        <div className="relative">
          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type="email" value={form.email} onChange={set("email")}
            placeholder="you@iitb.ac.in" autoComplete="email"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors" />
        </div>
        {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
      </div>

      {/* Password */}
      <div>
        <label className="block text-slate-300 text-sm font-medium mb-1.5">Password</label>
        <div className="relative">
          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type={showPw ? "text" : "password"} value={form.password} onChange={set("password")}
            placeholder="Min. 8 characters" autoComplete="new-password"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-10 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors" />
          <button type="button" onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
            {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
      </div>

      {/* Confirm password */}
      <div>
        <label className="block text-slate-300 text-sm font-medium mb-1.5">Confirm Password</label>
        <div className="relative">
          <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input type={showPw ? "text" : "password"} value={form.confirm_password} onChange={set("confirm_password")}
            placeholder="Re-enter password" autoComplete="new-password"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors" />
        </div>
        {errors.confirm_password && <p className="text-red-400 text-xs mt-1">{errors.confirm_password}</p>}
      </div>

      <button type="submit" disabled={loading}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 text-white font-bold text-sm hover:shadow-xl hover:shadow-orange-900/30 hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:scale-100">
        {loading
          ? <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Submitting…
            </span>
          : "Request Account"}
      </button>

      <p className="text-center text-slate-500 text-sm">
        Already have an account?{" "}
        <Link to="/login" className="text-orange-400 hover:text-orange-300 font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </form>
  );
}

/* ─── Step 2: Pending / approved / rejected status screen ───────────────── */
function StatusScreen({ email }) {
  const navigate = useNavigate();
  const [status, setStatus]   = useState("pending"); // pending | approved | rejected
  const [reason, setReason]   = useState("");
  const [checking, setChecking] = useState(false);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const res = await api.get(`/auth/registration-status/?email=${encodeURIComponent(email)}`);
      setStatus(res.data.status);
      if (res.data.rejection_reason) setReason(res.data.rejection_reason);
      if (res.data.status === "approved") {
        setTimeout(() => navigate("/login"), 2500);
      }
    } catch {
      // keep current status
    } finally {
      setChecking(false);
    }
  };

  const SCREENS = {
    pending: {
      icon: <Clock size={40} className="text-yellow-400" />,
      ring: "border-yellow-500/20 bg-yellow-500/5",
      title: "Awaiting Approval",
      body: "Your registration request has been sent to the E-Cell team. A staff member (OC, Manager, or Coordinator) will review your request shortly.",
      cta: null,
    },
    approved: {
      icon: <CheckCircle2 size={40} className="text-emerald-400" />,
      ring: "border-emerald-500/20 bg-emerald-500/5",
      title: "Account Approved! 🎉",
      body: "Your account is now active. Redirecting you to the login page…",
      cta: null,
    },
    rejected: {
      icon: <XCircle size={40} className="text-red-400" />,
      ring: "border-red-500/20 bg-red-500/5",
      title: "Request Rejected",
      body: reason || "Your registration request was not approved.",
      cta: (
        <Link to="/register"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 text-white text-sm font-semibold hover:shadow-lg transition-all">
          Try Again
        </Link>
      ),
    },
  };

  const s = SCREENS[status] || SCREENS.pending;

  return (
    <div className="text-center space-y-6">
      {/* Status card */}
      <div className={`rounded-2xl border p-8 ${s.ring}`}>
        <div className="flex justify-center mb-4">{s.icon}</div>
        <h2 className="text-xl font-bold text-white mb-2">{s.title}</h2>
        <p className="text-slate-400 text-sm leading-relaxed">{s.body}</p>
        {s.cta && <div className="mt-5">{s.cta}</div>}
      </div>

      {/* Email reminder */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3">
        <p className="text-slate-400 text-xs">Registered as</p>
        <p className="text-slate-200 text-sm font-medium mt-0.5">{email}</p>
      </div>

      {/* Check again button */}
      {status === "pending" && (
        <button onClick={checkStatus} disabled={checking}
          className="flex items-center gap-2 mx-auto text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50">
          <RefreshCw size={13} className={checking ? "animate-spin" : ""} />
          {checking ? "Checking…" : "Check approval status"}
        </button>
      )}

      {status === "approved" && (
        <Link to="/login" className="block text-orange-400 hover:text-orange-300 text-sm transition-colors">
          Go to login →
        </Link>
      )}
    </div>
  );
}

/* ─── Main RegisterPage ──────────────────────────────────────────────────── */
export default function RegisterPage() {
  const [submittedEmail, setSubmittedEmail] = useState(null);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center shadow-2xl shadow-orange-900/50">
              <Zap size={22} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-lg leading-none">E-Cell Portal</p>
              <p className="text-slate-400 text-sm">IIT Bombay</p>
            </div>
          </div>
          {!submittedEmail ? (
            <>
              <h1 className="text-2xl font-bold text-white">Create account</h1>
              <p className="text-slate-400 text-sm mt-1">
                Your request will be reviewed by our team before activation.
              </p>
            </>
          ) : (
            <h1 className="text-2xl font-bold text-white">Request submitted</h1>
          )}
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {!submittedEmail
            ? <RegisterForm onSuccess={setSubmittedEmail} />
            : <StatusScreen email={submittedEmail} />
          }
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          E-Cell IIT Bombay · Query & Issue Management Portal
        </p>
      </div>
    </div>
  );
}