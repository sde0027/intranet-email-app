import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Archive, Reply, ReplyAll, Forward, Paperclip, Download } from "lucide-react";
import * as emails from "../services/emails.service.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function MessagePage(){const {id}=useParams();const navigate=useNavigate();const {user}=useAuth();const [email,setEmail]=useState(null);const [error,setError]=useState("");
 useEffect(()=>{let alive=true;emails.getEmail(id).then(r=>{if(alive)setEmail(r.email);if(alive&&r.email?.is_read===0)emails.markRead(id,true).catch(()=>{});}).catch(e=>setError(e.message));return()=>{alive=false;};},[id]);
 if(error)return <div className="empty-state"><h2>Unable to open message</h2><p>{error}</p><button className="secondary-button" onClick={()=>navigate(-1)}>Go back</button></div>;if(!email)return <div className="loading-state">Opening message…</div>;
 const recipients=[...(email.recipients?.to||[]),...(email.recipients?.cc||[])];
 return <section className="message-detail"><button className="back-link" onClick={()=>navigate(-1)}><ArrowLeft size={16}/> Back to messages</button><div className="detail-toolbar"><button onClick={()=>emails.moveToTrash(id).then(()=>navigate("/inbox"))}><Archive size={17}/> Move to trash</button></div><h1>{email.subject||"(No subject)"}</h1><div className="message-meta"><span className="message-avatar">{email.sender?.name?.slice(0,1)||"?"}</span><div><strong>{email.sender?.name}</strong><small>{email.sender?.email}</small><small>To: {email.is_sender?recipients.map(r=>r.email).join(", ")||"Recipients hidden":user.email}</small></div><time>{email.sent_at?new Date(email.sent_at).toLocaleString():""}</time></div><article className="message-body">{email.body}</article>
 {email.attachments?.length>0&&<div className="detail-attachments"><strong><Paperclip size={16}/> Attachments</strong>{email.attachments.map(a=><a key={a.id} href={`/api/emails/attachments/${a.id}/download`}><Download size={15}/>{a.original_name}<small>{(a.size_bytes/1024/1024).toFixed(2)} MB</small></a>)}</div>}
 <div className="detail-actions"><button className="secondary-button" onClick={()=>navigate(`/compose?reply=${id}`)}><Reply size={16}/> Reply</button><button className="secondary-button" onClick={()=>navigate(`/compose?replyAll=${id}`)}><ReplyAll size={16}/> Reply all</button><button className="secondary-button" onClick={()=>navigate(`/compose?forward=${id}`)}><Forward size={16}/> Forward</button></div>
 </section>;
}
