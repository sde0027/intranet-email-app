import { forwardRef, useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";

export const buttonStyles = {
  primary:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-company px-5 py-2.5 text-sm font-semibold tracking-[.01em] text-white shadow-[0_2px_5px_rgba(23,70,112,.18)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-company-dark hover:shadow-[0_6px_16px_rgba(23,70,112,.24)] active:translate-y-0 active:scale-[.985] active:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-company/25 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
  secondary:
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-company/25 hover:bg-company-soft/60 hover:text-company hover:shadow-md active:translate-y-0 active:scale-[.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-company/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  ghost:
    "inline-flex size-10 items-center justify-center rounded-full text-slate-500 transition-all duration-200 hover:-translate-y-px hover:bg-company-soft hover:text-company active:translate-y-0 active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-company/20 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40",
  danger:
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-red-100 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-red-200 hover:bg-red-50 hover:shadow-md active:translate-y-0 active:scale-[.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
};

export function Button({ variant = "primary", className = "", ...props }) {
  return (
    <button
      className={`${buttonStyles[variant] || buttonStyles.primary} ${className}`}
      {...props}
    />
  );
}

export function IconButton({ className = "", ...props }) {
  return <button className={`${buttonStyles.ghost} ${className}`} {...props} />;
}

export const TextInput = forwardRef(function TextInput(
  { className = "", autoComplete = "off", name, ...props },
  ref,
) {
  // Chromium may ignore autocomplete="off" for form-history suggestions.
  // A fresh field name per mount prevents old values being matched to this field.
  const [historySafeName] = useState(
    () => `intranet-field-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const isLoginField =
    autoComplete === "username" || autoComplete === "current-password";

  return (
    <input
      ref={ref}
      name={isLoginField ? name : historySafeName}
      autoComplete={autoComplete}
      className={`h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-ink shadow-[0_1px_3px_rgba(20,45,70,.07)] outline-none transition-[border-color,box-shadow,background-color] duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-company/65 focus:shadow-[0_0_0_3px_rgba(23,70,112,.09),0_1px_3px_rgba(20,45,70,.06)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 aria-invalid:border-red-400 aria-invalid:focus:shadow-[0_0_0_3px_rgba(220,38,38,.09)] ${className}`}
      {...props}
    />
  );
});

export const TextArea = forwardRef(function TextArea(
  { className = "", autoComplete = "off", name, ...props },
  ref,
) {
  const [historySafeName] = useState(
    () => `intranet-textarea-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );

  return (
    <textarea
      ref={ref}
      name={historySafeName}
      autoComplete={autoComplete}
      className={className}
      {...props}
    />
  );
});

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  loading = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event) {
      if (event.key === "Escape" && !loading) onCancel?.();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onCancel]);

  if (!open) return null;
  const Icon = tone === "warning" ? ShieldAlert : AlertTriangle;
  const confirmStyle = tone === "warning"
    ? "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-300"
    : "bg-red-600 hover:bg-red-700 focus-visible:ring-red-300";

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/45 px-4 py-6 backdrop-blur-[3px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel?.();
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className="w-full max-w-md animate-[dialog-in_.16s_ease-out] rounded-2xl border border-white/70 bg-white p-6 shadow-[0_24px_80px_rgba(15,35,60,.28)]"
      >
        <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <Icon size={21} />
        </div>
        <h2 id="confirm-dialog-title" className="text-lg font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        <p id="confirm-dialog-description" className="mt-2 text-sm leading-6 text-slate-600">
          {description}
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            autoFocus
            disabled={loading}
            onClick={onCancel}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-company/25 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`inline-flex min-h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold text-white shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 ${confirmStyle}`}
          >
            {loading ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export function Field({ label, htmlFor, children, hint, error }) {
  return (
    <label
      htmlFor={htmlFor}
      className="grid gap-1.5 text-sm font-medium text-slate-700"
    >
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
      {error && (
        <span className="text-xs font-medium text-red-600">{error}</span>
      )}
    </label>
  );
}

export function Avatar({ name = "User", photo, size = "md", className = "" }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const dimensions =
    size === "sm"
      ? "size-8 text-[11px]"
      : size === "lg"
        ? "size-12 text-sm"
        : "size-9 text-xs";
  return (
    <span
      className={`inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-company-soft font-semibold text-company ${dimensions} ${className}`}
    >
      {photo ? (
        <img
          src={photo}
          alt={`${name}'s profile`}
          className="size-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}

export function Alert({ children, tone = "error" }) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-red-200 bg-red-50 text-red-700";
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-xl border px-4 py-3.5 text-sm ${styles}`}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ children }) {
  return (
    <p className="mb-2 text-[11px] font-bold uppercase tracking-[.16em] text-company/70">
      {children}
    </p>
  );
}

export function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="text-[26px] font-semibold tracking-[-.035em] text-company-dark sm:text-[30px]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-muted">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function LoadingState({ children = "Loading…" }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-muted">
      <span className="size-4 animate-spin rounded-full border-2 border-company/20 border-t-company" />
      {children}
    </div>
  );
}
