import { useEffect, useState } from "react";
import { Camera, Pencil, Power, Search, UserPlus, UserRound, X } from "lucide-react";
import * as users from "../services/users.service.js";
import { useAuth } from "../context/AuthContext.jsx";

const emptyCreateForm = { name: "", email: "", password: "", designation: "", phone: "" };
const initials = (name = "User") => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

function EmployeeAvatar({ employee, large = false }) {
  const photo = employee.profile_photo_url;
  return <span className={`avatar ${large ? "avatar-large" : "avatar-small"} profile-photo-frame`}>
    {photo ? <img src={photo} alt={`${employee.name}'s profile`} /> : initials(employee.name)}
  </span>;
}

export default function EmployeesPage() {
  const { user, setUser } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyCreateForm);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ name: "", designation: "", phone: "", profile_photo: null });
  const [photoPreview, setPhotoPreview] = useState("");

  async function load() {
    setLoading(true);
    try {
      const result = await users.getEmployees();
      setEmployees((result.employees || []).map((employee) => ({ ...employee, profile_photo_url: employee.profile_photo_url ? `${employee.profile_photo_url}?v=${Date.now()}` : null })));
      setError("");
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault(); setBusy(true); setError(""); setSuccess("");
    try {
      await users.createEmployee(form);
      setForm(emptyCreateForm); setShowForm(false); setSuccess("Employee account created successfully."); await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  function openEditor(employee) {
    setEditing(employee);
    setEditForm({ name: employee.name || "", designation: employee.designation || "", phone: employee.phone || "", profile_photo: null });
    setPhotoPreview(""); setError(""); setSuccess("");
  }

  function closeEditor() {
    setEditing(null); setPhotoPreview(""); setEditForm({ name: "", designation: "", phone: "", profile_photo: null });
  }

  function choosePhoto(file) {
    if (!file) return;
    if (! ["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("Choose a JPEG, PNG, or WebP image."); return; }
    if (file.size > 5 * 1024 * 1024) { setError("Profile photo must be 5 MB or smaller."); return; }
    setEditForm((current) => ({ ...current, profile_photo: file }));
    setPhotoPreview(URL.createObjectURL(file)); setError("");
  }

  async function saveProfile(e) {
    e.preventDefault(); if (!editing) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const result = await users.updateEmployeeProfile(editing.id, editForm);
      if (Number(user?.id) === Number(editing.id) && result.employee) {
        const refreshedUser = { ...user, ...result.employee, profile_photo_url: result.employee.profile_photo_url ? `${result.employee.profile_photo_url}?v=${Date.now()}` : null };
        setUser(refreshedUser); sessionStorage.setItem("intranet.user", JSON.stringify(refreshedUser));
      }
      closeEditor(); setSuccess(`${editForm.name}'s profile was updated.`); await load();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  async function toggle(employee) {
    const next = employee.is_active !== 1;
    if (!window.confirm(`${next ? "Activate" : "Deactivate"} ${employee.name}'s account?`)) return;
    try { await users.updateEmployeeStatus(employee.id, next); await load(); }
    catch (e) { setError(e.message); }
  }

  const visible = employees.filter((employee) => `${employee.name} ${employee.email} ${employee.role} ${employee.designation || ""}`.toLowerCase().includes(query.toLowerCase()));

  return <section className="employees-view">
    <div className="page-heading"><div><p className="eyebrow">ADMINISTRATION</p><h1>Employees</h1><p>Manage employee accounts, profile details, and workspace access.</p></div><button className="primary-button" onClick={() => setShowForm((value) => !value)}><UserPlus size={17} />{showForm ? "Close form" : "Create employee"}</button></div>
    {error && !editing && <div className="inline-alert">{error}</div>}
    {success && <div className="inline-success">{success}</div>}
    {showForm && <form className="employee-form" onSubmit={create}>
      <h2>Create employee account</h2>
      <div className="employee-form-grid">
        <label>Full name<input required maxLength={120} autoComplete="off" value={form.name} onChange={(e) => setForm((v) => ({ ...v, name: e.target.value }))} placeholder="Employee name" /></label>
        <label>Company email<input required type="email" autoComplete="off" value={form.email} onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))} placeholder="name@company.com" /></label>
        <label>Temporary password<input required minLength={8} type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))} placeholder="At least 8 characters" /></label>
        <label>Designation<input maxLength={120} autoComplete="off" value={form.designation} onChange={(e) => setForm((v) => ({ ...v, designation: e.target.value }))} placeholder="e.g. Software Engineer" /></label>
        <label>Phone number<input type="tel" maxLength={30} autoComplete="off" value={form.phone} onChange={(e) => setForm((v) => ({ ...v, phone: e.target.value }))} placeholder="Contact number" /></label>
      </div>
      <button className="primary-button" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
    </form>}
    <div className="employee-toolbar"><div className="mail-search"><Search size={17} /><input placeholder="Search employees" value={query} onChange={(e) => setQuery(e.target.value)} /></div><span>{employees.length} accounts</span></div>
    {loading ? <div className="loading-state">Loading employees…</div> : <div className="employee-table">
      <div className="employee-table-head"><span>EMPLOYEE</span><span>ROLE</span><span>STATUS</span><span>PROFILE</span><span>ACCESS</span></div>
      {visible.map((employee) => <div className="employee-row" key={employee.id}>
        <div className="employee-identity"><EmployeeAvatar employee={employee} /><span><strong>{employee.name}</strong><small>{employee.designation || employee.email}</small>{employee.designation && <small>{employee.email}</small>}</span></div>
        <span className="role-chip">{employee.role}</span>
        <span className={`status-chip ${employee.is_active ? "enabled" : "disabled"}`}>{employee.is_active ? "Active" : "Inactive"}</span>
        <button className="employee-edit" onClick={() => openEditor(employee)}><Pencil size={14} />Edit profile</button>
        <button className="employee-toggle" onClick={() => toggle(employee)}><Power size={15} />{employee.is_active ? "Deactivate" : "Activate"}</button>
      </div>)}
      {!visible.length && <div className="employee-empty">No employees match your search.</div>}
    </div>}

    {editing && <div className="profile-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) closeEditor(); }}>
      <section className="profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
        <div className="profile-modal-heading"><div><p className="eyebrow">EMPLOYEE PROFILE</p><h2 id="profile-modal-title">Edit profile</h2><p>Update personal and contact information for {editing.name}.</p></div><button className="icon-button" type="button" onClick={closeEditor} disabled={busy} aria-label="Close"><X size={19} /></button></div>
        <form onSubmit={saveProfile}>
          <div className="profile-photo-picker"><span className="avatar avatar-large profile-photo-frame">{photoPreview ? <img src={photoPreview} alt="Selected profile preview" /> : editing.profile_photo_url ? <img src={editing.profile_photo_url} alt={`${editing.name}'s current profile`} /> : initials(editing.name)}</span><label className="secondary-button"><Camera size={15} />Choose photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => choosePhoto(e.target.files?.[0])} /></label><small>JPEG, PNG or WebP · Maximum 5 MB</small></div>
          <div className="profile-edit-grid">
            <label>Full name<input required maxLength={120} autoComplete="off" value={editForm.name} onChange={(e) => setEditForm((v) => ({ ...v, name: e.target.value }))} /></label>
            <label>Designation<input maxLength={120} autoComplete="off" value={editForm.designation} onChange={(e) => setEditForm((v) => ({ ...v, designation: e.target.value }))} placeholder="Job designation" /></label>
            <label>Phone number<input type="tel" maxLength={30} autoComplete="off" value={editForm.phone} onChange={(e) => setEditForm((v) => ({ ...v, phone: e.target.value }))} placeholder="Contact number" /></label>
            <label>Company email<input value={editing.email} disabled /></label>
          </div>
          {editing && error && <div className="inline-alert">{error}</div>}
          <div className="profile-modal-actions"><button type="button" className="secondary-button" onClick={closeEditor} disabled={busy}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button></div>
        </form>
      </section>
    </div>}
  </section>;
}
