import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Send, Paperclip, User, Clock, Tag,
  Building2, RefreshCw, CheckCircle2, Lock, Globe,
  Image, FileText, FileArchive, File, X, Download,
  ZoomIn, ChevronLeft, ChevronRight, Upload,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api";

const WS_BASE = import.meta.env.VITE_WS_URL || "ws://localhost:8000";
const API_BASE = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:8000";
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];

const STATUS_CONFIG = {
  OPEN:        { label: "Open",        color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  ASSIGNED:    { label: "Assigned",    color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  IN_PROGRESS: { label: "In Progress", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  RESOLVED:    { label: "Resolved",    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  OVERDUE:     { label: "Overdue",     color: "bg-red-500/10 text-red-400 border-red-500/20" },
};

const PRIORITY_CONFIG = {
  LOW:      { label: "Low",      color: "text-slate-400" },
  MEDIUM:   { label: "Medium",   color: "text-yellow-400" },
  HIGH:     { label: "High",     color: "text-orange-400" },
  CRITICAL: { label: "Critical", color: "text-red-400" },
};

function formatBytes(b) {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
  return `${(b/1048576).toFixed(1)} MB`;
}

function getFileIcon(mime) {
  if (IMAGE_TYPES.includes(mime))  return { Icon: Image,       color: "text-blue-400",   bg: "bg-blue-500/10" };
  if (mime === "application/pdf")  return { Icon: FileText,    color: "text-red-400",    bg: "bg-red-500/10" };
  if (mime?.includes("zip") || mime?.includes("rar") || mime?.includes("tar"))
                                   return { Icon: FileArchive, color: "text-yellow-400", bg: "bg-yellow-500/10" };
  return                                  { Icon: File,        color: "text-slate-400",  bg: "bg-slate-700" };
}

function resolveUrl(url) {
  if (!url) return null;
  if (url.startsWith("http") || url.startsWith("blob:")) return url;
  return `${API_BASE}${url}`;
}

/* ─── Lightbox ─────────────────────────────────────────────────────────── */
function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex);
  const prev = (e) => { e.stopPropagation(); setIdx((i) => (i - 1 + images.length) % images.length); };
  const next = (e) => { e.stopPropagation(); setIdx((i) => (i + 1) % images.length); };

  useEffect(() => {
    const h = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft")  setIdx((i) => (i - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setIdx((i) => (i + 1) % images.length);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [images.length, onClose]);

  const cur = images[idx];
  const src = resolveUrl(cur.image || cur.file);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/92 backdrop-blur-sm" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors z-10">
        <X size={18} />
      </button>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 rounded-full px-4 py-1.5 text-white text-xs font-medium z-10">
        {idx + 1} / {images.length}
      </div>
      {images.length > 1 && (
        <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors z-10">
          <ChevronLeft size={22} />
        </button>
      )}
      <div className="relative max-w-[90vw] max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt={cur.original_filename} className="max-w-full max-h-[85vh] rounded-xl object-contain shadow-2xl" draggable={false} />
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent rounded-b-xl px-4 py-3">
          <p className="text-white text-sm font-medium truncate">{cur.original_filename}</p>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-white/50 text-xs">{formatBytes(cur.file_size)}</span>
            {cur.uploaded_by?.full_name && <><span className="text-white/30 text-xs">·</span><span className="text-white/50 text-xs">{cur.uploaded_by.full_name}</span></>}
            {!src?.startsWith("blob:") && (
              <a href={src} download={cur.original_filename} onClick={(e) => e.stopPropagation()}
                className="ml-auto flex items-center gap-1.5 text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg px-3 py-1 transition-colors">
                <Download size={11} /> Download
              </a>
            )}
          </div>
        </div>
      </div>
      {images.length > 1 && (
        <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors z-10">
          <ChevronRight size={22} />
        </button>
      )}
    </div>
  );
}

/* ─── AttachmentGallery ─────────────────────────────────────────────────── */
function AttachmentGallery({ attachments, ticketId, onNewUploaded }) {
  const [lbIdx, setLbIdx] = useState(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const images = attachments.filter((a) => IMAGE_TYPES.includes(a.mime_type));
  const files  = attachments.filter((a) => !IMAGE_TYPES.includes(a.mime_type));

  const handleUpload = async (e) => {
    const selected = Array.from(e.target.files);
    if (!selected.length) return;
    setUploading(true);
    try {
      for (const f of selected) {
        const fd = new FormData();
        fd.append(IMAGE_TYPES.includes(f.type) ? "image" : "file", f);
        const res = await api.post(`/tickets/${ticketId}/attachments/`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        onNewUploaded(res.data);
      }
    } catch { alert("Upload failed."); }
    finally { setUploading(false); e.target.value = ""; }
  };

  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800">
        <h3 className="text-slate-300 font-semibold text-sm flex items-center gap-2">
          <Paperclip size={13} className="text-slate-400" />
          Attachments
          {attachments.length > 0 && (
            <span className="bg-slate-700 text-slate-300 text-xs px-2 py-0.5 rounded-full font-bold">{attachments.length}</span>
          )}
        </h3>
        <button onClick={() => inputRef.current?.click()} disabled={uploading}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-orange-400 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 hover:border-orange-500/30 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50">
          {uploading ? <span className="w-3 h-3 border border-slate-400 border-t-white rounded-full animate-spin" /> : <Upload size={12} />}
          {uploading ? "Uploading…" : "Add file"}
        </button>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={handleUpload}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.csv" />
      </div>

      <div className="p-4 space-y-4">
        {attachments.length === 0 ? (
          <div className="text-center py-6">
            <Paperclip size={28} className="text-slate-700 mx-auto mb-2" />
            <p className="text-slate-600 text-xs">No attachments yet</p>
            <button onClick={() => inputRef.current?.click()} className="text-orange-400 text-xs hover:underline mt-1">
              Upload the first file →
            </button>
          </div>
        ) : (
          <>
            {images.length > 0 && (
              <div>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2.5">
                  Images · {images.length}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {images.map((att, i) => (
                    <button key={att.id} onClick={() => setLbIdx(i)}
                      className="relative group aspect-square rounded-xl overflow-hidden border border-slate-700 hover:border-orange-500/50 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500">
                      <img src={resolveUrl(att.image || att.file)} alt={att.original_filename}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                        <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs truncate">{att.original_filename}</p>
                        <p className="text-white/50 text-xs">{formatBytes(att.file_size)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {files.length > 0 && (
              <div>
                {images.length > 0 && (
                  <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2.5">Files · {files.length}</p>
                )}
                <div className="space-y-1.5">
                  {files.map((att) => {
                    const { Icon, color, bg } = getFileIcon(att.mime_type);
                    return (
                      <a key={att.id} href={resolveUrl(att.file || att.image)} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 hover:border-orange-500/20 transition-all group">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
                          <Icon size={16} className={color} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-300 text-xs font-medium truncate group-hover:text-white">{att.original_filename}</p>
                          <p className="text-slate-600 text-xs mt-0.5">
                            {formatBytes(att.file_size)}{att.uploaded_by?.full_name ? ` · ${att.uploaded_by.full_name}` : ""}
                          </p>
                        </div>
                        <Download size={13} className="text-slate-600 group-hover:text-orange-400 transition-colors flex-shrink-0" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {lbIdx !== null && <Lightbox images={images} startIndex={lbIdx} onClose={() => setLbIdx(null)} />}
    </div>
  );
}

/* ─── ChatMessage ───────────────────────────────────────────────────────── */
function ChatMessage({ msg, currentUserId }) {
  const [lbIdx, setLbIdx] = useState(null);
  const isOwn = msg.author_id === currentUserId || msg.author?.id === currentUserId;
  const attachments = msg.attachments || [];
  const imgAtts  = attachments.filter((a) => IMAGE_TYPES.includes(a.mime_type));
  const fileAtts = attachments.filter((a) => !IMAGE_TYPES.includes(a.mime_type));

  return (
    <div className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
      <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5">
        {(msg.author_name || msg.author?.full_name || "?")[0].toUpperCase()}
      </div>
      <div className={`max-w-[78%] flex flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{msg.author_name || msg.author?.full_name}</span>
          {msg.is_internal && (
            <span className="flex items-center gap-1 text-xs text-amber-500"><Lock size={9} /> Internal</span>
          )}
        </div>

        {msg.content && (
          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap
            ${isOwn ? "bg-gradient-to-br from-orange-500 to-rose-600 text-white rounded-tr-sm"
              : msg.is_internal ? "bg-amber-500/10 border border-amber-500/20 text-amber-200 rounded-tl-sm"
              : "bg-slate-800 text-slate-200 rounded-tl-sm"}`}>
            {msg.content}
          </div>
        )}

        {imgAtts.length > 0 && (
          <div className={`flex flex-wrap gap-2 ${isOwn ? "justify-end" : ""}`}>
            {imgAtts.map((att, i) => (
              <button key={att.id || i} onClick={() => setLbIdx(i)}
                className="relative group rounded-xl overflow-hidden border border-slate-700 hover:border-orange-500/50 transition-all focus:outline-none"
                style={{ width: 160, height: 120 }}>
                <img src={resolveUrl(att.image || att.file)} alt={att.original_filename} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                  <ZoomIn size={18} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        )}

        {fileAtts.length > 0 && (
          <div className="space-y-1.5 w-full">
            {fileAtts.map((att, i) => {
              const { Icon, color, bg } = getFileIcon(att.mime_type);
              const href = resolveUrl(att.file || att.image);
              return (
                <a key={att.id || i} href={href} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all
                    ${isOwn ? "bg-white/10 border-white/10 hover:bg-white/20 text-white" : "bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300"}`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
                    <Icon size={13} className={color} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{att.original_filename}</p>
                    <p className={`text-xs ${isOwn ? "text-white/50" : "text-slate-500"}`}>{formatBytes(att.file_size)}</p>
                  </div>
                  <Download size={12} className="ml-auto flex-shrink-0 opacity-60" />
                </a>
              );
            })}
          </div>
        )}

        <span className="text-xs text-slate-600">
          {new Date(msg.timestamp || msg.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {lbIdx !== null && <Lightbox images={imgAtts} startIndex={lbIdx} onClose={() => setLbIdx(null)} />}
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={13} className="text-slate-500 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-slate-500 text-xs">{label}</p>
        <p className="text-slate-300 text-sm mt-0.5 truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */
export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket]           = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState("");
  const [isInternal, setIsInternal]   = useState(false);
  const [wsStatus, setWsStatus]       = useState("connecting");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [coordinators, setCoordinators]     = useState([]);
  const [chatFiles, setChatFiles]     = useState([]);

  const chatFileRef = useRef(null);
  const wsRef       = useRef(null);
  const chatEndRef  = useRef(null);

  const canAssign      = ["OC", "MANAGER"].includes(user?.role);
  const canChangeStatus = ["OC", "MANAGER", "COORDINATOR"].includes(user?.role);
  const isStaff        = user?.role !== "USER";

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  /* ── Load ticket ── */
  useEffect(() => {
    api.get(`/tickets/${id}/`)
      .then((res) => {
        setTicket(res.data);
        setAttachments(res.data.attachments || []);
        const comments = (res.data.comments || []).map((c) => ({
          ...c,
          author_id: c.author?.id,
          author_name: c.author?.full_name,
          timestamp: c.created_at,
          attachments: [],
        }));
        setMessages(comments);
        setLoading(false);
      })
      .catch(() => navigate("/tickets"));

    if (canAssign) {
      api.get("/users/?role=COORDINATOR").then((r) => setCoordinators(r.data.results || r.data));
    }
  }, [id]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  /* ── WebSocket ── */
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const ws = new WebSocket(`${WS_BASE}/ws/tickets/${id}/?token=${token}`);
    wsRef.current = ws;
    ws.onopen  = () => setWsStatus("connected");
    ws.onclose = () => setWsStatus("disconnected");
    ws.onerror = () => setWsStatus("error");
    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.type === "chat_message") {
        setMessages((prev) => {
          if (prev.find((m) => m.comment_id === data.comment_id)) return prev;
          return [...prev, { ...data, attachments: data.attachments || [] }];
        });
      } else if (data.type === "status_update") {
        setTicket((prev) => prev ? { ...prev, status: data.new_status } : prev);
      }
    };
    return () => ws.close();
  }, [id]);

  /* ── Send message ── */
  const sendMessage = async () => {
    const hasText  = input.trim().length > 0;
    const hasFiles = chatFiles.length > 0;
    if (!hasText && !hasFiles) return;

    const textToSend = input.trim();
    setInput("");

    // Send text via WS
    if (hasText) {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "chat_message", content: textToSend, is_internal: isInternal }));
      } else {
        // REST fallback
        const res = await api.post(`/tickets/${id}/comments/`, { content: textToSend, is_internal: isInternal });
        const c = res.data;
        setMessages((prev) => [...prev, { ...c, author_id: c.author?.id, author_name: c.author?.full_name, timestamp: c.created_at, attachments: [] }]);
      }
    }

    // Upload files and add to gallery + optimistic chat bubble
    if (hasFiles) {
      const filesToUpload = [...chatFiles];
      setChatFiles([]);

      // Optimistic preview bubble
      const tempMsg = {
        comment_id: `temp-${Date.now()}`,
        content: "",
        is_internal: isInternal,
        author_id: user.id,
        author_name: user.full_name,
        timestamp: new Date().toISOString(),
        attachments: filesToUpload.map((cf) => ({
          id: cf.id,
          original_filename: cf.file.name,
          mime_type: cf.file.type,
          file_size: cf.file.size,
          image: cf.preview,
          file:  cf.preview ? null : URL.createObjectURL(cf.file),
        })),
      };
      setMessages((prev) => [...prev, tempMsg]);
      scrollToBottom();

      for (const cf of filesToUpload) {
        try {
          const fd = new FormData();
          fd.append(IMAGE_TYPES.includes(cf.file.type) ? "image" : "file", cf.file);
          const res = await api.post(`/tickets/${id}/attachments/`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          setAttachments((prev) => prev.find((a) => a.id === res.data.id) ? prev : [...prev, res.data]);
        } catch { /* continue */ }
        if (cf.preview && cf.preview.startsWith("blob:")) URL.revokeObjectURL(cf.preview);
      }
    }
  };

  const handleChatFileSelect = (e) => {
    const incoming = Array.from(e.target.files).slice(0, 3);
    const items = incoming.map((f) => ({
      id: `${f.name}-${Date.now()}`,
      file: f,
      preview: IMAGE_TYPES.includes(f.type) ? URL.createObjectURL(f) : null,
    }));
    setChatFiles((prev) => [...prev, ...items].slice(0, 3));
    e.target.value = "";
  };

  const removeChatFile = (fid) => {
    setChatFiles((prev) => {
      const item = prev.find((cf) => cf.id === fid);
      if (item?.preview?.startsWith("blob:")) URL.revokeObjectURL(item.preview);
      return prev.filter((cf) => cf.id !== fid);
    });
  };

  const handleStatusChange = async (newStatus) => {
    setStatusUpdating(true);
    try {
      const res = await api.patch(`/tickets/${id}/`, { status: newStatus });
      setTicket(res.data);
    } catch (err) {
      alert(err.response?.data?.detail?.status?.[0] || "Status update failed");
    } finally { setStatusUpdating(false); }
  };

  const handleAssign = async (assigneeId) => {
    try {
      const res = await api.post(`/tickets/${id}/assign/`, { assignee_id: assigneeId });
      setTicket(res.data);
    } catch (err) { alert(err.response?.data?.detail || "Assignment failed"); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500" />
      </div>
    );
  }

  const statusCfg   = STATUS_CONFIG[ticket.status]    || STATUS_CONFIG.OPEN;
  const priorityCfg = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.MEDIUM;

  const nextStatuses = ({
    OPEN:        canAssign       ? ["ASSIGNED"]    : [],
    ASSIGNED:    canChangeStatus ? ["IN_PROGRESS"] : [],
    IN_PROGRESS: canChangeStatus ? ["RESOLVED"]    : [],
    OVERDUE:     canAssign       ? ["ASSIGNED"]    : [],
  })[ticket.status] || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <button onClick={() => navigate("/tickets")}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
        <ArrowLeft size={15} /> Back to tickets
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: ticket info + attachment gallery + chat ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Ticket header */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`text-xs px-3 py-1 rounded-full border font-semibold ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                  <span className={`text-xs font-semibold ${priorityCfg.color}`}>● {priorityCfg.label}</span>
                </div>
                <h1 className="text-xl font-bold text-white leading-snug">{ticket.title}</h1>
              </div>
            </div>

            <p className="text-slate-400 text-sm leading-relaxed">{ticket.description}</p>

            {ticket.tags?.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-4">
                {ticket.tags.map((t) => (
                  <span key={t} className="flex items-center gap-1 text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full">
                    <Tag size={10} /> {t}
                  </span>
                ))}
              </div>
            )}

            {nextStatuses.length > 0 && (
              <div className="flex gap-2 mt-5 pt-4 border-t border-slate-800">
                {nextStatuses.map((s) => (
                  <button key={s} onClick={() => handleStatusChange(s)} disabled={statusUpdating}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all disabled:opacity-50">
                    <RefreshCw size={13} className={statusUpdating ? "animate-spin" : ""} />
                    Set {s.replace("_", " ")}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Attachment Gallery */}
          <AttachmentGallery
            attachments={attachments}
            ticketId={id}
            onNewUploaded={(att) =>
              setAttachments((prev) => prev.find((a) => a.id === att.id) ? prev : [...prev, att])
            }
          />

          {/* Discussion / Chat */}
          <div className="rounded-2xl bg-slate-900 border border-slate-800 flex flex-col"
            style={{ minHeight: 460, maxHeight: 560 }}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
              <h2 className="text-slate-300 font-semibold text-sm">Discussion</h2>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  wsStatus === "connected" ? "bg-emerald-500 animate-pulse" :
                  wsStatus === "connecting" ? "bg-yellow-500 animate-pulse" : "bg-red-500"
                }`} />
                <span className="text-slate-500 text-xs capitalize">{wsStatus}</span>
              </div>
            </div>

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                    <Send size={16} className="text-slate-600" />
                  </div>
                  <p className="text-slate-600 text-sm">No messages yet. Start the conversation.</p>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <ChatMessage key={msg.comment_id || msg.id || i} msg={msg} currentUserId={user?.id} />
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input */}
            <div className="px-4 pb-4 space-y-2">
              {isStaff && (
                <div className="flex items-center gap-2 px-1">
                  <button onClick={() => setIsInternal((v) => !v)}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border transition-all
                      ${isInternal ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-slate-800 text-slate-400 border-slate-700"}`}>
                    {isInternal ? <Lock size={10} /> : <Globe size={10} />}
                    {isInternal ? "Internal note" : "Public reply"}
                  </button>
                </div>
              )}

              {/* Pending file previews */}
              {chatFiles.length > 0 && (
                <div className="flex gap-2 flex-wrap px-1">
                  {chatFiles.map((cf) => (
                    <div key={cf.id}
                      className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-800 flex-shrink-0"
                      style={{ width: 56, height: 56 }}>
                      {cf.preview
                        ? <img src={cf.preview} alt={cf.file.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex flex-col items-center justify-center gap-0.5">
                            <File size={16} className="text-slate-400" />
                            <span className="text-slate-500 text-[9px] px-0.5 truncate w-full text-center">
                              {cf.file.name.split(".").pop().toUpperCase()}
                            </span>
                          </div>
                      }
                      <button onClick={() => removeChatFile(cf.id)}
                        className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={9} className="text-white" />
                      </button>
                    </div>
                  ))}
                  <div className="text-slate-500 text-xs self-center">{chatFiles.length} file{chatFiles.length > 1 ? "s" : ""} ready</div>
                </div>
              )}

              <div className="flex gap-2 items-end">
                {/* Attach button */}
                <button onClick={() => chatFileRef.current?.click()}
                  className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-orange-500/30 text-slate-400 hover:text-orange-400 transition-all flex-shrink-0"
                  title="Attach file">
                  <Paperclip size={15} />
                </button>
                <input ref={chatFileRef} type="file" multiple className="hidden" onChange={handleChatFileSelect}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.csv" />

                {/* Text box */}
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Type a message… (Shift+Enter for newline)"
                  rows={1}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors resize-none leading-5"
                  style={{ maxHeight: 120, overflowY: "auto" }}
                />

                {/* Send */}
                <button onClick={sendMessage}
                  disabled={!input.trim() && chatFiles.length === 0}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 text-white hover:shadow-lg hover:scale-105 transition-all disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed flex-shrink-0">
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: details + assign ── */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
            <h3 className="text-slate-300 font-semibold text-sm">Details</h3>
            <InfoRow icon={User}      label="Created by" value={ticket.creator?.full_name} />
            <InfoRow icon={Building2} label="Department" value={ticket.department?.name || "Unassigned"} />
            <InfoRow icon={User}      label="Assignee"   value={ticket.assignee?.full_name || "Unassigned"} />
            <InfoRow icon={Clock}     label="Created"    value={new Date(ticket.created_at).toLocaleString("en-IN", {
              day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
            })} />
            {ticket.resolved_at && (
              <InfoRow icon={CheckCircle2} label="Resolved" value={new Date(ticket.resolved_at).toLocaleString("en-IN", {
                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
              })} />
            )}
          </div>

          {canAssign && ticket.status !== "RESOLVED" && coordinators.length > 0 && (
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5">
              <h3 className="text-slate-300 font-semibold text-sm mb-3">Assign Coordinator</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {coordinators
                  .filter((c) => !ticket.department || c.department?.id === ticket.department?.id || user?.role === "OC")
                  .map((c) => (
                    <button key={c.id} onClick={() => handleAssign(c.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all
                        ${ticket.assignee?.id === c.id
                          ? "bg-orange-500/10 border border-orange-500/20 text-orange-300"
                          : "hover:bg-slate-800 text-slate-400 hover:text-white"
                        }`}>
                      <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
                        {c.full_name[0]}
                      </div>
                      <span className="truncate flex-1">{c.full_name}</span>
                      {ticket.assignee?.id === c.id && <CheckCircle2 size={13} className="ml-auto text-orange-400" />}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}