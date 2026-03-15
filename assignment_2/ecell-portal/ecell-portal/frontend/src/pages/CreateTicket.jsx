import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Send, Paperclip, X, Image, FileText,
  FileArchive, File, Upload, CheckCircle2, AlertCircle,
} from "lucide-react";
import api from "../utils/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per file
const MAX_FILES = 5;

function getFileIcon(mimeType) {
  if (IMAGE_TYPES.includes(mimeType)) return { Icon: Image, color: "text-blue-400", bg: "bg-blue-500/10" };
  if (mimeType === "application/pdf") return { Icon: FileText, color: "text-red-400", bg: "bg-red-500/10" };
  if (mimeType?.includes("zip") || mimeType?.includes("rar") || mimeType?.includes("tar"))
    return { Icon: FileArchive, color: "text-yellow-400", bg: "bg-yellow-500/10" };
  return { Icon: File, color: "text-slate-400", bg: "bg-slate-700" };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── AttachmentDropzone ───────────────────────────────────────────────────────

function AttachmentDropzone({ files, onAdd, onRemove, error }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const processFiles = useCallback((incoming) => {
    const accepted = [];
    const rejected = [];
    Array.from(incoming).forEach((f) => {
      if (f.size > MAX_FILE_SIZE) {
        rejected.push(`${f.name} exceeds 10 MB`);
      } else if (files.length + accepted.length >= MAX_FILES) {
        rejected.push(`Max ${MAX_FILES} files allowed`);
      } else {
        // Generate local preview URL for images
        const preview = IMAGE_TYPES.includes(f.type) ? URL.createObjectURL(f) : null;
        accepted.push({ file: f, preview, id: `${f.name}-${Date.now()}-${Math.random()}` });
      }
    });
    if (accepted.length) onAdd(accepted);
    if (rejected.length) alert(rejected.join("\n"));
  }, [files, onAdd]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);
  const onInputChange = (e) => { processFiles(e.target.files); e.target.value = ""; };

  return (
    <div>
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed px-6 py-8 text-center transition-all duration-200
          ${dragging
            ? "border-orange-500 bg-orange-500/5 scale-[1.01]"
            : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/40"
          }`}
      >
        <div className="flex flex-col items-center gap-2 pointer-events-none">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors
            ${dragging ? "bg-orange-500/20" : "bg-slate-800"}`}>
            <Upload size={18} className={dragging ? "text-orange-400" : "text-slate-400"} />
          </div>
          <div>
            <p className="text-slate-300 text-sm font-medium">
              {dragging ? "Drop files here" : "Drag & drop files, or click to browse"}
            </p>
            <p className="text-slate-500 text-xs mt-0.5">
              Images, PDFs, docs · Up to {MAX_FILES} files · Max 10 MB each
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={onInputChange}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.csv"
        />
      </div>

      {/* File preview list */}
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map((item) => {
            const { Icon, color, bg } = getFileIcon(item.file.type);
            return (
              <div key={item.id}
                className="flex items-center gap-3 bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2.5 group">
                {/* Thumbnail or icon */}
                {item.preview ? (
                  <img
                    src={item.preview}
                    alt={item.file.name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-slate-700"
                  />
                ) : (
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
                    <Icon size={18} className={color} />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-xs font-medium truncate">{item.file.name}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{formatBytes(item.file.size)}</p>
                </div>

                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all flex-shrink-0"
                  title="Remove file"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1.5 text-red-400 text-xs mt-2">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, error, hint, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-slate-300 text-sm font-medium">{label}</label>
        {hint && <span className="text-slate-500 text-xs">{hint}</span>}
      </div>
      {children}
      {error && (
        <p className="flex items-center gap-1.5 text-red-400 text-xs mt-1.5">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </div>
  );
}

// ─── CreateTicket page ────────────────────────────────────────────────────────

export function CreateTicket() {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    title: "", description: "", priority: "MEDIUM",
    department: "", tags: "",
  });
  const [attachments, setAttachments] = useState([]); // [{ file, preview, id }]
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null); // "Uploading 1 of 3..."
  const [errors, setErrors] = useState({});

  useEffect(() => {
    api.get("/departments/").then((res) => setDepartments(res.data.results || res.data));
    // Cleanup object URLs on unmount
    return () => attachments.forEach((a) => { if (a.preview) URL.revokeObjectURL(a.preview); });
  }, []);

  const handleAddFiles = useCallback((newItems) => {
    setAttachments((prev) => [...prev, ...newItems].slice(0, MAX_FILES));
  }, []);

  const handleRemoveFile = useCallback((id) => {
    setAttachments((prev) => {
      const item = prev.find((a) => a.id === id);
      if (item?.preview) URL.revokeObjectURL(item.preview);
      return prev.filter((a) => a.id !== id);
    });
  }, []);

  const handleSubmit = async () => {
    const errs = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.description.trim()) errs.description = "Description is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setErrors({});

    try {
      // 1. Create the ticket (JSON)
      const ticketPayload = {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      };
      if (form.department) ticketPayload.department_id = form.department;

      const ticketRes = await api.post("/tickets/", ticketPayload);
      const ticketId = ticketRes.data.id;

      // 2. Upload attachments one by one (multipart/form-data)
      if (attachments.length > 0) {
        for (let i = 0; i < attachments.length; i++) {
          const { file } = attachments[i];
          setUploadProgress(`Uploading file ${i + 1} of ${attachments.length}…`);

          const formData = new FormData();
          const isImage = IMAGE_TYPES.includes(file.type);
          formData.append(isImage ? "image" : "file", file);

          await api.post(`/tickets/${ticketId}/attachments/`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
      }

      navigate(`/tickets/${ticketId}`);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (typeof detail === "object") setErrors(detail);
      else setErrors({ _general: detail || "Submission failed. Please try again." });
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  const priorityConfig = {
    LOW:      { dot: "bg-slate-400", label: "Low" },
    MEDIUM:   { dot: "bg-yellow-400", label: "Medium" },
    HIGH:     { dot: "bg-orange-400", label: "High" },
    CRITICAL: { dot: "bg-red-500", label: "Critical" },
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back nav */}
      <button
        onClick={() => navigate("/tickets")}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft size={15} /> Back to tickets
      </button>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold text-white">Create Ticket</h1>
          <p className="text-slate-400 text-sm mt-1">
            Describe your issue clearly so it can be routed to the right team.
          </p>
        </div>

        <div className="px-8 py-7 space-y-6">
          {/* General error */}
          {errors._general && (
            <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="text-red-400 flex-shrink-0" />
              <p className="text-red-400 text-sm">{errors._general}</p>
            </div>
          )}

          {/* Title */}
          <Field label="Title *" error={errors.title}>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Brief summary of the issue"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </Field>

          {/* Description */}
          <Field label="Description *" error={errors.description}>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={5}
              placeholder="Detailed description — steps to reproduce, expected vs actual behaviour, browser/OS info…"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 resize-none transition-colors"
            />
          </Field>

          {/* Priority + Department */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Priority">
              <div className="relative">
                <select
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                  className="w-full appearance-none bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-orange-500"
                >
                  {Object.entries(priorityConfig).map(([val, { label }]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${priorityConfig[form.priority].dot}`} />
              </div>
            </Field>
            <Field label="Department">
              <select
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-300 focus:outline-none focus:border-orange-500"
              >
                <option value="">Select department</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </Field>
          </div>

          {/* Tags */}
          <Field label="Tags" hint="Optional · comma-separated">
            <input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="e.g. bug, payment, urgent"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 transition-colors"
            />
          </Field>

          {/* ── Attachments ─────────────────────────────────────────────── */}
          <Field
            label="Attachments"
            hint={`Optional · ${attachments.length}/${MAX_FILES} files`}
          >
            <AttachmentDropzone
              files={attachments}
              onAdd={handleAddFiles}
              onRemove={handleRemoveFile}
              error={errors.attachments}
            />
          </Field>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 text-white font-semibold text-sm hover:shadow-xl hover:shadow-orange-900/30 hover:scale-[1.01] transition-all duration-200 disabled:opacity-60 disabled:scale-100 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {uploadProgress || "Submitting…"}
              </>
            ) : (
              <>
                <Send size={15} />
                Submit Ticket
                {attachments.length > 0 && (
                  <span className="ml-1 bg-white/20 rounded-full px-2 py-0.5 text-xs font-bold">
                    +{attachments.length} file{attachments.length > 1 ? "s" : ""}
                  </span>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateTicket;