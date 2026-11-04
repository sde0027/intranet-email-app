import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Archive,
  Reply,
  ReplyAll,
  Forward,
  Paperclip,
  Download,
} from "lucide-react";
import * as emails from "../services/emails.service.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Alert, Avatar, Button, LoadingState } from "../components/ui.jsx";

export default function MessagePage() {
  const { id } = useParams(),
    navigate = useNavigate(),
    { user } = useAuth();
  const [email, setEmail] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    emails
      .getEmail(id)
      .then((r) => {
        if (alive) setEmail(r.email);
        if (alive && r.email?.is_read === 0)
          emails.markRead(id, true).catch(() => {});
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [id]);
  if (error)
    return (
      <div className="mx-auto max-w-4xl">
        <Alert>{error}</Alert>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => navigate(-1)}
        >
          Go back
        </Button>
      </div>
    );
  if (!email) return <LoadingState>Opening message…</LoadingState>;
  const recipients = [
    ...(email.recipients?.to || []),
    ...(email.recipients?.cc || []),
  ];
  return (
    <section className="mx-auto max-w-5xl">
      <button
        onClick={() => navigate(-1)}
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-company"
      >
        <ArrowLeft size={16} /> Back to messages
      </button>
      <article className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-8">
          <span className="text-xs font-semibold uppercase tracking-[.12em] text-slate-400">
            Message
          </span>
          <Button
            variant="secondary"
            onClick={() =>
              emails.moveToTrash(id).then(() => navigate("/inbox"))
            }
          >
            <Archive size={16} /> Move to trash
          </Button>
        </div>
        <div className="px-5 py-6 sm:px-8 sm:py-8">
          <h1 className="mb-8 wrap-break-word text-xl font-semibold leading-snug tracking-tight text-company-dark sm:text-2xl">
            {email.subject || "(No subject)"}
          </h1>
          <div className="flex flex-wrap items-start gap-3 border-b border-slate-100 pb-6">
            <Avatar
              name={email.sender?.name || "?"}
              photo={email.sender?.profile_photo_url}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[16px] text-slate-800">
                {email.sender?.name}
              </p>
              <p className="text-xs mt-0.5 text-muted">{email.sender?.email}</p>
              <p className="mt-0.5 wrap-break-word text-xs text-slate-500">
                To:{" "}
                {email.is_sender
                  ? recipients.map((r) => r.email).join(", ") ||
                    "Recipients hidden"
                  : user.email}
              </p>
            </div>
            <time className="text-xs text-slate-400">
              {email.sent_at ? new Date(email.sent_at).toLocaleString() : ""}
            </time>
          </div>
          <article className="min-h-48 whitespace-pre-wrap wrap-break-word py-7 text-[15px] leading-7 text-slate-700">
            {email.body}
          </article>
          {email.attachments?.length > 0 && (
            <div className="border-t border-slate-100 pt-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                <Paperclip size={16} /> Attachments
              </h2>
              <div className="flex flex-wrap gap-2">
                {email.attachments.map((a) => (
                  <a
                    key={a.id}
                    href={`/api/emails/attachments/${a.id}/download`}
                    className="inline-flex max-w-full items-center gap-2 rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm text-slate-600 transition hover:border-company/30 hover:bg-alice"
                  >
                    <Download size={15} />
                    <span className="max-w-52 truncate">{a.original_name}</span>
                    <small className="text-xs text-slate-400">
                      {(a.size_bytes / 1024 / 1024).toFixed(2)} MB
                    </small>
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-8">
          <Button
            variant="secondary"
            onClick={() => navigate(`/compose?reply=${id}`)}
          >
            <Reply size={16} /> Reply
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate(`/compose?replyAll=${id}`)}
          >
            <ReplyAll size={16} /> Reply all
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate(`/compose?forward=${id}`)}
          >
            <Forward size={16} /> Forward
          </Button>
        </div>
      </article>
    </section>
  );
}
