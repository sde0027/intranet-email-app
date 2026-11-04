import { useEffect, useState } from "react";
import { Archive, ChevronLeft, ChevronRight, MailOpen, RefreshCw, Search, Star, Trash2, Undo2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as emails from "../services/emails.service.js";

const initials = (name="?") => name.split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
const dateLabel = (value) => { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return ""; return date.toDateString() === new Date().toDateString() ? date.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : date.toLocaleDateString([], {month:"short",day:"numeric"}); };
export default function MessageList({ folder, title, subtitle }) {
  const [data,setData] = useState({messages:[],drafts:[],pagination:null}); const [loading,setLoading]=useState(true); const [error,setError]=useState(""); const [page,setPage]=useState(1); const [search,setSearch]=useState(""); const [refresh,setRefresh]=useState(0); const navigate=useNavigate();
  useEffect(()=>{ let active=true; setLoading(true); setError(""); const loaders={inbox:emails.getInbox,sent:emails.getSent,trash:emails.getTrash,drafts:emails.getDrafts}; loaders[folder](page).then((result)=>{if(active)setData(result);}).catch((e)=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);}); return ()=>{active=false;}; },[folder,page,refresh]);
  const rows = folder === "drafts" ? data.drafts || [] : data.messages || [];
  const filtered=rows.filter((m)=>`${m.subject||""} ${m.sender_name||""} ${m.body||""}`.toLowerCase().includes(search.toLowerCase()));
  async function action(event,id,fn){event.stopPropagation();try{await fn(id);setRefresh(v=>v+1);}catch(e){setError(e.message);}}
  const pagination=data.pagination;
  return <section className="mail-view">
    <div className="page-heading"><div><p className="eyebrow">YOUR WORKSPACE</p><h1>{title}</h1><p>{subtitle}</p></div><button className="refresh-button" onClick={()=>setRefresh(v=>v+1)} aria-label="Refresh messages"><RefreshCw size={16}/></button></div>
    <div className="mail-toolbar"><div className="mail-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${title.toLowerCase()}`}/></div><div className="toolbar-meta">{pagination ? `${pagination.total} ${pagination.total === 1 ? "message" : "messages"}` : ""}</div></div>
    {error && <div className="inline-alert">{error}</div>}
    {loading ? <div className="loading-state"><span className="button-spinner"/> Loading {title.toLowerCase()}…</div> : filtered.length === 0 ? <div className="empty-state"><div className="empty-icon"><MailOpen size={25}/></div><h2>{search ? "No matching messages" : `Your ${title.toLowerCase()} is clear`}</h2><p>{search ? "Try a different search term." : folder === "inbox" ? "Messages sent to you will appear here." : folder === "drafts" ? "Unsent messages you save will be kept here." : "There is nothing to display right now."}</p></div> : <div className="message-table">{filtered.map((message)=>{
      const sender=folder === "sent" ? (message.recipients?.to||[]).map(r=>r.name).join(", ") || "No recipients" : message.sender_name || "Draft";
      const date=message.sent_at || message.created_at;
      return <article key={message.id} className={`message-row ${message.is_read === 0 ? "unread" : ""}`} onClick={()=>navigate(folder === "drafts" ? `/compose?draft=${message.id}` : `/message/${message.id}`)} tabIndex="0" onKeyDown={e=>e.key==="Enter"&&navigate(folder === "drafts"?`/compose?draft=${message.id}`:`/message/${message.id}`)}>
        <span className="message-avatar">{initials(sender)}</span><div className="message-sender">{sender}</div><div className="message-content"><strong>{message.subject || "(No subject)"}</strong><span>{(message.body||"").replace(/\s+/g," ").slice(0,105)}</span></div><time>{dateLabel(date)}</time>
        <div className="message-actions">{folder === "trash" ? <><button title="Restore" onClick={e=>action(e,message.id,emails.restoreEmail)}><Undo2 size={16}/></button><button title="Delete permanently" onClick={e=>action(e,message.id,emails.permanentlyDelete)}><Trash2 size={16}/></button></> : folder === "drafts" ? <button title="Delete draft" onClick={e=>action(e,message.id,emails.deleteDraft)}><Trash2 size={16}/></button> : folder !== "sent" ? <button title="Move to trash" onClick={e=>action(e,message.id,emails.moveToTrash)}><Archive size={16}/></button> : null}</div>
      </article>;
    })}</div>}
    <div className="pagination"><span>{pagination ? `Page ${pagination.page} of ${Math.max(pagination.totalPages,1)}` : ""}</span><div><button disabled={!pagination?.hasPreviousPage} onClick={()=>setPage(p=>p-1)} aria-label="Previous page"><ChevronLeft size={17}/></button><button disabled={!pagination?.hasNextPage} onClick={()=>setPage(p=>p+1)} aria-label="Next page"><ChevronRight size={17}/></button></div></div>
  </section>;
}
