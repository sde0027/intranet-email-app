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
  ConfirmDialog,
  Button,
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
  const [pendingAction, setPendingAction] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmSentDelete, setConfirmSentDelete] = useState(false);
  const [confirmTrashRestore, setConfirmTrashRestore] = useState(false);
  const [confirmTrashDelete, setConfirmTrashDelete] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setSelectedIds([]);
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
  async function action(event, id, fn, confirmation) {
    event.stopPropagation();
    if (confirmation) {
      setPendingAction({ id, fn, ...confirmation });
      return;
    }
    try {
      await fn(id);
      setRefresh((v) => v + 1);
    } catch (e) {
      setError(e.message);
    }
  }
  async function confirmPendingAction() {
    if (!pendingAction) return;
    setActionBusy(true);
    try {
      await pendingAction.fn(pendingAction.id);
      setPendingAction(null);
      setRefresh((v) => v + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setActionBusy(false);
    }
  }
  const selectableRows =
    folder === "inbox" || folder === "sent" || folder === "trash"
      ? filtered
      : [];
  const allVisibleSelected =
    selectableRows.length > 0 &&
    selectableRows.every((message) => selectedIds.includes(message.id));

  function toggleSelected(id) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  }

  function toggleAllVisible() {
    const visibleIds = selectableRows.map((message) => message.id);
    setSelectedIds((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleIds.includes(id))
        : [...new Set([...current, ...visibleIds])],
    );
  }

  async function moveSelectedToTrash() {
    if (selectedIds.length === 0 || bulkBusy) return;
    setBulkBusy(true);
    setError("");
    try {
      await emails.bulkMoveToTrash(selectedIds);
      setSelectedIds([]);
      setRefresh((value) => value + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBulkBusy(false);
    }
  }

  async function deleteSelectedSent() {
    if (selectedIds.length === 0 || bulkBusy) return;
    setBulkBusy(true);
    setError("");
    try {
      await emails.bulkDeleteSent(selectedIds);
      setSelectedIds([]);
      setConfirmSentDelete(false);
      setRefresh((value) => value + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBulkBusy(false);
    }
  }

  async function restoreSelectedTrash() {
    if (selectedIds.length === 0 || bulkBusy) return;
    setBulkBusy(true);
    setError("");
    try {
      await emails.bulkRestoreTrash(selectedIds);
      setSelectedIds([]);
      setConfirmTrashRestore(false);
      setRefresh((value) => value + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBulkBusy(false);
    }
  }

  async function permanentlyDeleteSelectedTrash() {
    if (selectedIds.length === 0 || bulkBusy) return;
    setBulkBusy(true);
    setError("");
    try {
      await emails.bulkPermanentlyDeleteTrash(selectedIds);
      setSelectedIds([]);
      setConfirmTrashDelete(false);
      setRefresh((value) => value + 1);
    } catch (e) {
      setError(e.message);
    } finally {
      setBulkBusy(false);
    }
  }

  const openMessage = (message) =>
    navigate(
      folder === "drafts"
        ? `/compose?draft=${message.id}`
        : `/message/${message.id}`,
    );

  return (
    <section className="animate-[content-enter_.22s_ease-out]">
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
            onChange={(e) => {
              setSearch(e.target.value);
              setSelectedIds([]);
            }}
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

      {(folder === "inbox" || folder === "sent" || folder === "trash") &&
        !loading &&
        filtered.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-company/10 bg-white px-4 py-2.5 shadow-[0_2px_10px_rgba(25,55,85,.035)]">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleAllVisible}
                className="size-4 rounded border-slate-300 accent-company focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-company/25 focus-visible:ring-offset-2"
                aria-label={`Select all visible ${folder} messages`}
              />
              Select all
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs tabular-nums text-muted">
                {selectedIds.length} selected
              </span>
              <Button
                variant="danger"
                disabled={selectedIds.length === 0 || bulkBusy}
                onClick={
                  folder === "inbox"
                    ? moveSelectedToTrash
                    : folder === "sent"
                      ? () => setConfirmSentDelete(true)
                      : () => setConfirmTrashDelete(true)
                }
                className="min-h-9 rounded-xl px-3.5 py-2 text-xs"
              >
                {folder === "inbox" ? (
                  <Archive size={15} />
                ) : (
                  <Trash2 size={15} />
                )}
                {bulkBusy
                  ? folder === "inbox"
                    ? "Moving…"
                    : "Deleting…"
                  : folder === "inbox"
                    ? `Move to Trash${selectedIds.length ? ` (${selectedIds.length})` : ""}`
                    : folder === "trash"
                      ? `Delete permanently${selectedIds.length ? ` (${selectedIds.length})` : ""}`
                      : `Delete${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
              </Button>
              {folder === "trash" && (
                <Button
                  variant="secondary"
                  disabled={selectedIds.length === 0 || bulkBusy}
                  onClick={() => setConfirmTrashRestore(true)}
                  className="min-h-9 rounded-xl px-3.5 py-2 text-xs"
                >
                  <Undo2 size={15} />
                  Restore{selectedIds.length ? ` (${selectedIds.length})` : ""}
                </Button>
              )}
            </div>
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
                className={`group relative grid min-h-17 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 border-b border-slate-300/64 px-4 py-2 transition-[transform,box-shadow,background-color] duration-200 ease-out last:border-b-0 hover:z-1 hover:-translate-y-px hover:shadow-[0_5px_14px_rgba(20,50,100,.18)] hover:bg-[#f5f8fc] focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-company sm:grid-cols-[minmax(130px,210px)_minmax(0,1fr)_76px_auto] sm:gap-4 sm:px-5 ${unread ? "bg-[#f7faff]" : "bg-white"} ${folder === "inbox" || folder === "sent" || folder === "trash" ? "pl-12" : ""} ${selectedIds.includes(message.id) ? "bg-company-soft/65" : ""}`}
              >
                {(folder === "inbox" ||
                  folder === "sent" ||
                  folder === "trash") && (
                  <label
                    className="absolute left-3 top-1/2 z-10 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-lg transition hover:bg-company-soft"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                    title="Select message"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(message.id)}
                      onChange={() => toggleSelected(message.id)}
                      className="size-4 rounded border-slate-300 accent-company focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-company/25 focus-visible:ring-offset-2"
                      aria-label={`Select ${message.subject || "message"}`}
                    />
                  </label>
                )}
                {unread && (
                  <span className="absolute inset-y-2 left-0 w-0.75 rounded-r bg-company" />
                )}
                <div
                  className={`min-w-0 pl-8 truncate text-[15px] sm:pr-1 ${unread ? "font-semibold text-slate-800" : "font-medium text-slate-600"}`}
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
                    - {(message.body || "").replace(/\s+/g, " ").slice(0, 140)}
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
                          action(e, message.id, emails.restoreEmail, {
                            title: "Restore this message?",
                            description:
                              "This message will be moved from Trash back to your Inbox.",
                            confirmLabel: "Restore message",
                            tone: "warning",
                          })
                        }
                      >
                        <Undo2 size={16} />
                      </IconButton>
                      <IconButton
                        title="Delete permanently"
                        aria-label="Delete permanently"
                        onClick={(e) =>
                          action(e, message.id, emails.permanentlyDelete, {
                            title: "Permanently delete this message?",
                            description:
                              "This message and its stored attachments will be permanently removed. This action cannot be undone.",
                            confirmLabel: "Delete permanently",
                          })
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
                      onClick={(e) =>
                        action(e, message.id, emails.deleteDraft, {
                          title: "Permanently delete this draft?",
                          description:
                            "This draft will be permanently removed and cannot be recovered.",
                          confirmLabel: "Delete draft",
                        })
                      }
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
      <ConfirmDialog
        open={confirmSentDelete}
        title="Delete selected sent messages?"
        description="These messages will be removed from your Sent folder. Recipients' inbox copies will remain available. This action cannot be undone from your Sent folder."
        confirmLabel="Delete messages"
        loading={bulkBusy}
        onCancel={() => setConfirmSentDelete(false)}
        onConfirm={deleteSelectedSent}
      />
      <ConfirmDialog
        open={confirmTrashRestore}
        title="Restore selected messages?"
        description={`The ${selectedIds.length} selected message(s) will be moved from Trash back to your Inbox.`}
        confirmLabel="Restore messages"
        tone="warning"
        loading={bulkBusy}
        onCancel={() => setConfirmTrashRestore(false)}
        onConfirm={restoreSelectedTrash}
      />
      <ConfirmDialog
        open={confirmTrashDelete}
        title="Permanently delete selected messages?"
        description={`The ${selectedIds.length} selected message(s) will be permanently removed from your Trash. This action cannot be undone.`}
        confirmLabel="Delete permanently"
        loading={bulkBusy}
        onCancel={() => setConfirmTrashDelete(false)}
        onConfirm={permanentlyDeleteSelectedTrash}
      />
      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.title}
        description={pendingAction?.description}
        confirmLabel={pendingAction?.confirmLabel}
        tone={pendingAction?.tone}
        loading={actionBusy}
        onCancel={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
      />
    </section>
  );
}
