import { useEffect, useState } from "react";
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  MailOpen,
  RefreshCw,
  Search,
  Trash2,
  Undo2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as emails from "../services/emails.service.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Alert,
  IconButton,
  LoadingState,
  PageHeading,
  TextInput,
} from "./ui.jsx";

const dateLabel = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
};

export default function MessageList({ folder, title, subtitle }) {
  const [data, setData] = useState({
    messages: [],
    drafts: [],
    pagination: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [refresh, setRefresh] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const loaders = {
      inbox: emails.getInbox,
      sent: emails.getSent,
      trash: emails.getTrash,
      drafts: emails.getDrafts,
    };
    loaders[folder](page)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [folder, page, refresh]);

  const rows = folder === "drafts" ? data.drafts || [] : data.messages || [];
  const filtered = rows.filter((message) =>
    `${message.subject || ""} ${message.sender_name || ""} ${message.body || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const pagination = data.pagination;
  async function action(event, id, fn) {
    event.stopPropagation();
    try {
      await fn(id);
      setRefresh((v) => v + 1);
    } catch (e) {
      setError(e.message);
    }
  }
  const openMessage = (message) =>
    navigate(
      folder === "drafts"
        ? `/compose?draft=${message.id}`
        : `/message/${message.id}`,
    );

  return (
    <section>
      <PageHeading
        eyebrow="YOUR WORKSPACE"
        title={title}
        description={subtitle}
        action={
          <IconButton
            onClick={() => setRefresh((v) => v + 1)}
            aria-label="Refresh messages"
          >
            <RefreshCw size={17} />
          </IconButton>
        }
      />
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-line/80 bg-white p-3.5 shadow-[0_3px_14px_rgba(25,55,85,.045)] sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <TextInput
            className="h-10 border-transparent bg-slate-50 pl-10 focus:border-company"
            name="intranet-mailbox-filter"
            autoComplete="new-password"
            data-lpignore="true"
            data-1p-ignore="true"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${title.toLowerCase()}`}
          />
        </div>
        <span className="px-1 text-xs tabular-nums text-muted">
          {pagination
            ? `${pagination.total} ${pagination.total === 1 ? "message" : "messages"}`
            : ""}
        </span>
      </div>
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}

      {loading ? (
        <LoadingState>Loading {title.toLowerCase()}…</LoadingState>
      ) : filtered.length === 0 ? (
        <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
          <div>
            <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-company-soft text-company">
              <MailOpen size={22} />
            </span>
            <h2 className="text-base font-semibold text-slate-700">
              {search
                ? "No matching messages"
                : `Your ${title.toLowerCase()} is clear`}
            </h2>
            <p className="mt-1 max-w-sm text-sm text-muted">
              {search
                ? "Try a different search term."
                : folder === "inbox"
                  ? "Messages sent to you will appear here."
                  : folder === "drafts"
                    ? "Unsent messages you save will be kept here."
                    : "There is nothing to display right now."}
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line/80 bg-white shadow-[0_4px_20px_rgba(25,55,85,.045)]">
          {filtered.map((message) => {
            const unread = folder === "inbox" && message.is_read === 0;
            const sender =
              folder === "sent"
                ? (message.recipients?.to || [])
                    .map((r) => r.name)
                    .join(", ") ||
                  user?.name ||
                  "You"
                : message.sender_name || "Draft";
            const date = message.sent_at || message.created_at;
            return (
              <article
                key={message.id}
                role="link"
                tabIndex={0}
                aria-label={`${unread ? "Unread" : "Read"} message: ${message.subject || "No subject"}, from ${sender}`}
                onClick={() => openMessage(message)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openMessage(message);
                  }
                }}
                className={`group relative grid min-h-17 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-slate-300/64 px-4 py-3.5 transition-[transform,box-shadow,background-color] duration-200 ease-out last:border-b-0 hover:z-1 hover:-translate-y-px hover:shadow-[0_5px_14px_rgba(20,50,100,.18)] hover:bg-[#f5f8fc] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-company sm:grid-cols-[minmax(130px,210px)_minmax(0,1fr)_76px_auto] sm:gap-4 sm:px-5 ${unread ? "bg-[#f7faff]" : "bg-white"}`}
              >
                {unread && (
                  <span className="absolute inset-y-2 left-0 w-0.75 rounded-r bg-company" />
                )}
                <div
                  className={`min-w-0 truncate text-[15px] sm:pr-1 ${unread ? "font-semibold text-slate-800" : "font-medium text-slate-600"}`}
                >
                  {sender}
                </div>
                <div className="col-span-2 flex min-w-0 items-baseline gap-2 sm:col-span-1">
                  <strong
                    className={`min-w-0 max-w-[58%] truncate text-[15px] ${unread ? "font-semibold text-slate-800" : "font-medium text-slate-600"}`}
                  >
                    {message.subject || "(No subject)"}
                  </strong>
                  <span className="hidden min-w-0 flex-1 truncate text-[15px] text-slate-400 md:block">
                    — {(message.body || "").replace(/\s+/g, " ").slice(0, 140)}
                  </span>
                </div>
                <time className="col-start-2 row-start-1 whitespace-nowrap text-right text-xs font-medium tabular-nums text-slate-500 sm:col-start-auto sm:row-auto">
                  {dateLabel(date)}
                </time>
                <div
                  className="col-span-2 flex items-center justify-end gap-1 sm:col-span-1 sm:col-start-auto sm:row-auto sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  {folder === "trash" ? (
                    <>
                      <IconButton
                        title="Restore"
                        aria-label="Restore message"
                        onClick={(e) =>
                          action(e, message.id, emails.restoreEmail)
                        }
                      >
                        <Undo2 size={16} />
                      </IconButton>
                      <IconButton
                        title="Delete permanently"
                        aria-label="Delete permanently"
                        onClick={(e) =>
                          action(e, message.id, emails.permanentlyDelete)
                        }
                        className="text-slate-500 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </>
                  ) : folder === "drafts" ? (
                    <IconButton
                      title="Delete draft"
                      aria-label="Delete draft"
                      onClick={(e) => action(e, message.id, emails.deleteDraft)}
                      className="text-slate-500 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  ) : folder !== "sent" ? (
                    <IconButton
                      title="Move to trash"
                      aria-label="Move to trash"
                      onClick={(e) => action(e, message.id, emails.moveToTrash)}
                    >
                      <Archive size={16} />
                    </IconButton>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-muted">
        <span>
          {pagination
            ? `Page ${pagination.page} of ${Math.max(pagination.totalPages, 1)}`
            : ""}
        </span>
        <div className="flex gap-1">
          <IconButton
            disabled={!pagination?.hasPreviousPage}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft size={17} />
          </IconButton>
          <IconButton
            disabled={!pagination?.hasNextPage}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={17} />
          </IconButton>
        </div>
      </div>
    </section>
  );
}
