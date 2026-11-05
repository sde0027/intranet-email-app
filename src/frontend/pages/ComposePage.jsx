import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Paperclip,
  Save,
  Send,
  X,
} from "lucide-react";
import * as emails from "../services/emails.service.js";
import { Alert, Button, PageHeading, TextArea, TextInput } from "../components/ui.jsx";

export default function ComposePage() {
  const [params] = useSearchParams();
  const draftId = params.get("draft"),
    replyId = params.get("reply"),
    replyAllId = params.get("replyAll"),
    forwardId = params.get("forward");
  const navigate = useNavigate();
  const [form, setForm] = useState({
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    body: "",
  });
  const [files, setFiles] = useState([]),
    [showCopies, setShowCopies] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    if (draftId)
      emails
        .getDraft(draftId)
        .then((r) => {
          const draft = r.draft || {};
          const recipients = draft.recipients || {};
          setForm({
            to: (recipients.to || []).map((item) => item.email).join(", "),
            cc: (recipients.cc || []).map((item) => item.email).join(", "),
            bcc: (recipients.bcc || []).map((item) => item.email).join(", "),
            subject: draft.subject || "",
            body: draft.body || "",
          });
          setShowCopies(
            Boolean(
              (recipients.cc || []).length || (recipients.bcc || []).length,
            ),
          );
        })
        .catch((e) => setError(e.message));
    if (replyId || replyAllId || forwardId)
      emails
        .getEmail(replyId || replyAllId || forwardId)
        .then((r) =>
          setForm((v) => ({
            ...v,
            subject: `${forwardId ? "Fwd" : "Re"}: ${r.email.subject || "(No subject)"}`,
          })),
        )
        .catch((e) => setError(e.message));
  }, [draftId, replyId, replyAllId, forwardId]);
  const update = (key, value) => setForm((v) => ({ ...v, [key]: value }));
  const parseRecipients = (value) => {
    const recipients = value
      .split(/[;,\n]/)
      .map((v) => v.trim())
      .filter(Boolean)
      .map((value) => {
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return value;
        if (/^[A-Za-z0-9_-]{1,32}$/.test(value)) return value;
        throw new Error(
          `Invalid recipient: ${value}. Enter an employee ID or company email address.`,
        );
      });
    return [...new Set(recipients)];
  };
  async function saveDraft() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const recipients = {
        to: parseRecipients(form.to),
        cc: parseRecipients(form.cc),
        bcc: parseRecipients(form.bcc),
      };
      const draftData = {
        subject: form.subject,
        body: form.body,
        ...recipients,
      };
      if (draftId) await emails.updateDraft(draftId, draftData);
      else await emails.createDraft(draftData);
      setNotice(
        files.length
          ? "Draft saved. Attachments are not saved with drafts; reattach them when you reopen it."
          : "Draft saved.",
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function send(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const to = parseRecipients(form.to),
        cc = parseRecipients(form.cc),
        bcc = parseRecipients(form.bcc);
      if (forwardId) {
        if (!to.length) throw new Error("Add at least one recipient in To.");
        await emails.forwardEmail(
          forwardId,
          { to, cc, bcc, body: form.body },
          files,
        );
      } else if (replyId || replyAllId)
        await emails.replyEmail(
          replyId || replyAllId,
          form.body,
          files,
          Boolean(replyAllId),
        );
      else {
        if (!to.length) throw new Error("Add at least one recipient in To.");
        await emails.sendEmail(
          { to, cc, bcc, subject: form.subject, body: form.body },
          files,
        );
      }
      if (draftId) await emails.deleteDraft(draftId).catch(() => {});
      navigate("/sent");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const title = draftId
    ? "Edit draft"
    : replyAllId
      ? "Reply to all"
      : replyId
        ? "Reply"
        : forwardId
          ? "Forward message"
          : "Compose email";
  const inputProps = {
    autoComplete: "new-password",
    "data-lpignore": "true",
    "data-1p-ignore": "true",
  };

  return (
    <section className="mx-auto max-w-5xl">
      <button
        onClick={() => navigate(-1)}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-company"
      >
        <ArrowLeft size={16} /> Back
      </button>
      <PageHeading
        // eyebrow="MESSAGE CENTRE"
        title={title}
        description="Send a message to colleagues within your organisation."
      />
      <form
        className="overflow-hidden rounded-2xl border border-line/80 bg-white shadow-[0_5px_24px_rgba(25,55,85,.05)]"
        onSubmit={send}
        autoComplete="off"
        data-form-type="other"
      >
        <div className="grid gap-x-5 px-5 py-5 sm:px-7 sm:py-6">
          <div className="grid gap-2 border-b border-slate-100 py-3 sm:grid-cols-[72px_minmax(0,1fr)] sm:items-center">
            <label htmlFor="to" className="text-sm font-medium text-slate-600">
              To
            </label>
            <TextInput
              id="to"
              name="intranet-compose-recipient-to"
              {...inputProps}
              value={form.to}
              onChange={(e) => update("to", e.target.value)}
              placeholder="Employee IDs or email addresses, separated by commas"
            />
          </div>
          {showCopies && (
            <>
              <div className="grid gap-2 border-b border-slate-100 py-3 sm:grid-cols-[72px_minmax(0,1fr)] sm:items-center">
                <label
                  htmlFor="cc"
                  className="text-sm font-medium text-slate-600"
                >
                  Cc
                </label>
                <TextInput
                  id="cc"
                  name="intranet-compose-recipient-cc"
                  {...inputProps}
                  value={form.cc}
                  onChange={(e) => update("cc", e.target.value)}
                  placeholder="Employee IDs or email addresses"
                />
              </div>
              <div className="grid gap-2 border-b border-slate-100 py-3 sm:grid-cols-[72px_minmax(0,1fr)] sm:items-center">
                <label
                  htmlFor="bcc"
                  className="text-sm font-medium text-slate-600"
                >
                  Bcc
                </label>
                <TextInput
                  id="bcc"
                  name="intranet-compose-recipient-bcc"
                  {...inputProps}
                  value={form.bcc}
                  onChange={(e) => update("bcc", e.target.value)}
                  placeholder="Employee IDs or email addresses"
                />
              </div>
            </>
          )}
          <div className="border-b border-slate-100 py-2 sm:pl-23">
            <button
              type="button"
              onClick={() => setShowCopies((v) => !v)}
              className="text-xs font-semibold text-company hover:underline"
            >
              {showCopies ? "Hide Cc/Bcc" : "Add Cc/Bcc"}
            </button>
          </div>
          <div className="grid gap-2 border-b border-slate-100 py-3 sm:grid-cols-[72px_minmax(0,1fr)] sm:items-center">
            <label
              htmlFor="subject"
              className="text-sm font-medium text-slate-600"
            >
              Subject
            </label>
            <TextInput
              id="subject"
              name="intranet-compose-subject"
              {...inputProps}
              value={form.subject}
              onChange={(e) => update("subject", e.target.value)}
              placeholder="Add a subject"
            />
          </div>
          <label
            htmlFor="body"
            className="py-3 text-sm font-medium text-slate-600"
          >
            Message
          </label>
          <TextArea
            id="body"
            {...inputProps}
            rows={11}
            value={form.body}
            onChange={(e) => update("body", e.target.value)}
            placeholder="Write your message…"
            className="min-h-64 w-full resize-y rounded-xl border border-slate-200 bg-white p-4 text-sm leading-7 text-ink shadow-[0_1px_3px_rgba(20,45,70,.05)] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-slate-400 focus:border-company/60 focus:shadow-[0_0_0_3px_rgba(23,70,112,.08)]"
          />
        </div>
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-3 sm:px-7">
            {files.map((file, index) => (
              <span
                key={`${file.name}-${index}`}
                className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-slate-50 px-3 py-1.5 text-xs text-slate-600"
              >
                <span className="max-w-56 truncate">{file.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() =>
                    setFiles((v) => v.filter((_, i) => i !== index))
                  }
                  className="text-slate-400 hover:text-red-600"
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}
        {files.length > 0 && (
          <div className="px-5 pb-3 sm:px-7">
            <Alert tone="warning">
              <span className="inline-flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                <span>
                  <strong>Draft attachment notice:</strong> Attachments are not
                  saved with drafts. They will be lost when you leave this page.
                  Reattach them when you reopen the draft to send it.
                </span>
              </span>
            </Alert>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:px-7">
          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm font-medium text-slate-600 transition hover:bg-alice">
            <Paperclip size={16} /> Attach files
            <input
              type="file"
              accept=".pdf,.txt,.csv,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.gif,.webp,.zip"
              multiple
              hidden
              onChange={(e) => {
                const selected = Array.from(e.target.files || []);
                if (files.length + selected.length > 5) {
                  setError("A maximum of 5 attachments is allowed.");
                  return;
                }
                const oversized = selected.find(
                  (file) => file.size > 30 * 1024 * 1024,
                );
                if (oversized) {
                  setError(
                    `${oversized.name} exceeds the 30 MB per-file limit.`,
                  );
                  return;
                }
                setError("");
                setFiles((v) => [...v, ...selected]);
                e.target.value = "";
              }}
            />
          </label>
          <span className="mr-auto text-xs text-muted">
            Up to 5 files · 30 MB each
          </span>
          <Button
            type="button"
            variant="secondary"
            onClick={saveDraft}
            disabled={busy}
          >
            <Save size={16} /> Save draft
          </Button>
          <Button type="submit" disabled={busy}>
            <Send size={16} /> {busy ? "Sending…" : "Send message"}
          </Button>
        </div>
        {(error || notice) && (
          <div className="space-y-2 px-5 pb-5 sm:px-7">
            {error && <Alert>{error}</Alert>}
            {notice && <Alert tone="success">{notice}</Alert>}
          </div>
        )}
      </form>
    </section>
  );
}
