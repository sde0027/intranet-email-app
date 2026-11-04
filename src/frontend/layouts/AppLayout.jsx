import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Archive, Bell, ChevronDown, FileText, Inbox, LogOut, Mail, Menu, Plus, Send, Settings, Shield, Trash2, Users, X } from "lucide-react";
import { useState } from "react";
import Brand from "../components/Brand.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const initials = (name = "User") => name.split(/\s+/).slice(0,2).map((part)=>part[0]).join("").toUpperCase();
function ProfileAvatar({ user, small = false }) { return <span className={`avatar ${small ? "avatar-small" : "avatar-large"} profile-photo-frame`}>{user?.profile_photo_url ? <img src={user.profile_photo_url} alt="Profile" /> : initials(user?.name)}</span>; }
export default function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  async function handleLogout() { setSigningOut(true); try { await signOut(); navigate("/", { replace: true }); } finally { setSigningOut(false); } }
  const links = [
    { to: "/inbox", label: "Inbox", icon: Inbox },
    { to: "/sent", label: "Sent", icon: Send },
    { to: "/drafts", label: "Drafts", icon: FileText },
    { to: "/trash", label: "Trash", icon: Trash2 },
  ];
  return <div className="workspace">
    <header className="workspace-header"><button className="mobile-menu-button" onClick={()=>setMobileOpen(v=>!v)} aria-label="Toggle navigation">{mobileOpen ? <X/> : <Menu/>}</button><Brand/><div className="header-spacer"/><div className="workspace-search"><span>⌕</span><input placeholder="Search your workspace" aria-label="Search your workspace" disabled/><kbd>⌘ K</kbd></div><button className="icon-button" aria-label="Notifications"><Bell size={18}/></button><div className="header-user"><ProfileAvatar user={user} small /><span>{user?.name}</span><ChevronDown size={15}/></div></header>
    <div className="workspace-body">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="profile-card"><ProfileAvatar user={user} /><div className="profile-copy"><strong>{user?.name}</strong><span>{user?.designation || (user?.role === "ADMIN" ? "Administrator" : "Employee")}</span><small>{user?.email}</small>{user?.phone && <small>{user.phone}</small>}</div></div>
        <button className="compose-button" onClick={()=>{navigate("/compose");setMobileOpen(false);}}><Plus size={19}/> Compose email</button>
        <div className="side-label">MAILBOX</div><nav className="side-nav">{links.map(({to,label,icon:Icon})=><NavLink key={to} to={to} onClick={()=>setMobileOpen(false)} className={({isActive})=>isActive?"side-link active":"side-link"}><Icon size={18}/><span>{label}</span></NavLink>)}</nav>
        {user?.role === "ADMIN" && <><div className="side-label admin-label"><Shield size={14}/> ADMINISTRATION</div><nav className="side-nav"><NavLink to="/employees" onClick={()=>setMobileOpen(false)} className={({isActive})=>isActive?"side-link active":"side-link"}><Users size={18}/><span>Employees</span></NavLink></nav></>}
        <div className="sidebar-bottom"><div className="workspace-status"><span className="status-dot"/> Internal network workspace</div><button className="side-link logout-link" onClick={handleLogout} disabled={signingOut}><LogOut size={18}/><span>{signingOut ? "Signing out…" : "Sign out"}</span></button></div>
      </aside>
      {mobileOpen && <button className="sidebar-scrim" onClick={()=>setMobileOpen(false)} aria-label="Close navigation"/>}
      <main className="workspace-main"><Outlet/></main>
    </div>
  </div>;
}
