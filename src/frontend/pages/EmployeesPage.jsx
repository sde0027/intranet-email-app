import { useEffect, useState } from "react";
import { Camera, Pencil, Power, Search, UserPlus, X } from "lucide-react";
import * as users from "../services/users.service.js";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Alert,
  Avatar,
  Button,
  Field,
  IconButton,
  LoadingState,
  PageHeading,
  TextInput,
  ConfirmDialog,
} from "../components/ui.jsx";

const emptyCreateForm = {
  employee_code: "",
  name: "",
  email: "",
  password: "",
  designation: "",
  phone: "",
};
const inputProtection = {
  autoComplete: "new-password",
  "data-lpignore": "true",
  "data-1p-ignore": "true",
};

export default function EmployeesPage() {
  const { user, setUser } = useAuth();
  const [employees, setEmployees] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [query, setQuery] = useState(""),
    [showForm, setShowForm] = useState(false),
    [busy, setBusy] = useState(false),
    [form, setForm] = useState(emptyCreateForm),
    [editing, setEditing] = useState(null),
    [editForm, setEditForm] = useState({
      name: "",
      email: "",
      designation: "",
      phone: "",
      profile_photo: null,
    }),
    [photoPreview, setPhotoPreview] = useState(""),
    [pendingDeactivation, setPendingDeactivation] = useState(null),
    [statusBusy, setStatusBusy] = useState(false);
  async function load() {
    setLoading(true);
    try {
      const result = await users.getEmployees();
      setEmployees(
        (result.employees || []).map((employee) => ({
          ...employee,
          profile_photo_url: employee.profile_photo_url
            ? `${employee.profile_photo_url}?v=${Date.now()}`
            : null,
        })),
      );
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await users.createEmployee(form);
      setForm(emptyCreateForm);
      setShowForm(false);
      setSuccess("Employee account created successfully.");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function openEditor(employee) {
    setEditing(employee);
    setEditForm({
      employee_code: employee.employee_code || "",
      name: employee.name || "",
      email: employee.email || "",
      designation: employee.designation || "",
      phone: employee.phone || "",
      profile_photo: null,
    });
    setPhotoPreview("");
    setError("");
    setSuccess("");
  }
  function closeEditor() {
    setEditing(null);
    setPhotoPreview("");
    setEditForm({
      employee_code: "",
      name: "",
      email: "",
      designation: "",
      phone: "",
      profile_photo: null,
    });
  }
  function choosePhoto(file) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Profile photo must be 5 MB or smaller.");
      return;
    }
    setEditForm((current) => ({ ...current, profile_photo: file }));
    setPhotoPreview(URL.createObjectURL(file));
    setError("");
  }
  async function saveProfile(e) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const result = await users.updateEmployeeProfile(editing.id, editForm);
      if (Number(user?.id) === Number(editing.id) && result.employee) {
        const refreshedUser = {
          ...user,
          ...result.employee,
          profile_photo_url: result.employee.profile_photo_url
            ? `${result.employee.profile_photo_url}?v=${Date.now()}`
            : null,
        };
        setUser(refreshedUser);
      }
      closeEditor();
      setSuccess(`${editForm.name}'s profile was updated.`);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function toggle(employee) {
    const next = employee.is_active !== 1;
    if (!next) {
      setPendingDeactivation(employee);
      return;
    }
    try {
      await users.updateEmployeeStatus(employee.id, true);
      await load();
    } catch (e) {
      setError(e.message);
    }
  }
  async function confirmDeactivation() {
    if (!pendingDeactivation) return;
    setStatusBusy(true);
    try {
      await users.updateEmployeeStatus(pendingDeactivation.id, false);
      setPendingDeactivation(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setStatusBusy(false);
    }
  }
  const visible = employees.filter((employee) =>
    `${employee.employee_code} ${employee.name} ${employee.email} ${employee.role} ${employee.designation || ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <section>
      <PageHeading
        eyebrow="ADMINISTRATION"
        title="Employees"
        description="Manage employee accounts, profile details, and workspace access."
        action={
          <Button onClick={() => setShowForm((value) => !value)}>
            <UserPlus size={17} />
            {showForm ? "Close form" : "Create employee"}
          </Button>
        }
      />
      {error && !editing && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {success && (
        <div className="mb-4">
          <Alert tone="success">{success}</Alert>
        </div>
      )}
      {showForm && (
        <form
          onSubmit={create}
          autoComplete="off"
          data-form-type="other"
          className="mb-5 rounded-2xl border border-line/80 bg-white p-5 shadow-[0_4px_18px_rgba(25,55,85,.045)] sm:p-6"
        >
          <h2 className="mb-5 text-base font-semibold text-company-dark">
            Create employee account
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Field label="Employee ID">
              <TextInput
                required
                minLength={1}
                maxLength={32}
                name="intranet-employee-create-code"
                {...inputProtection}
                value={form.employee_code}
                onChange={(e) =>
                  setForm((v) => ({
                    ...v,
                    employee_code: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="e.g. SDE-001"
              />
            </Field>
            <Field label="Full name">
              <TextInput
                required
                maxLength={120}
                name="intranet-employee-create-name"
                {...inputProtection}
                value={form.name}
                onChange={(e) =>
                  setForm((v) => ({ ...v, name: e.target.value }))
                }
                placeholder="Employee name"
              />
            </Field>
            <Field label="Company email">
              <TextInput
                required
                type="email"
                name="intranet-employee-create-email"
                {...inputProtection}
                value={form.email}
                onChange={(e) =>
                  setForm((v) => ({ ...v, email: e.target.value }))
                }
                placeholder="name@company.com"
              />
            </Field>
            <Field label="Temporary password">
              <TextInput
                required
                minLength={8}
                type="password"
                name="intranet-employee-create-temporary-secret"
                {...inputProtection}
                value={form.password}
                onChange={(e) =>
                  setForm((v) => ({ ...v, password: e.target.value }))
                }
                placeholder="At least 8 characters"
              />
            </Field>
            <Field label="Designation">
              <TextInput
                maxLength={120}
                name="intranet-employee-create-designation"
                {...inputProtection}
                value={form.designation}
                onChange={(e) =>
                  setForm((v) => ({ ...v, designation: e.target.value }))
                }
                placeholder="e.g. Software Engineer"
              />
            </Field>
            <Field label="Phone number">
              <TextInput
                type="tel"
                maxLength={30}
                name="intranet-employee-create-phone"
                {...inputProtection}
                value={form.phone}
                onChange={(e) =>
                  setForm((v) => ({ ...v, phone: e.target.value }))
                }
                placeholder="Contact number"
              />
            </Field>
          </div>
          <Button className="mt-5" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </Button>
        </form>
      )}

      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-line/80 bg-white p-3.5 shadow-[0_3px_14px_rgba(25,55,85,.045)] sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search
            size={17}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <TextInput
            className="h-10 border-transparent bg-slate-50 pl-10"
            name="intranet-employee-directory-filter"
            {...inputProtection}
            placeholder="Search employees"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <span className="px-1 text-xs text-muted">
          {employees.length} accounts
        </span>
      </div>
      {loading ? (
        <LoadingState>Loading employees…</LoadingState>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-line/80 bg-white shadow-[0_4px_20px_rgba(25,55,85,.045)]">
          <div className="hidden grid-cols-[minmax(220px,1fr)_100px_100px_130px_130px] gap-4 border-b border-slate-100 bg-slate-50 px-5 py-3 text-[10px] font-bold uppercase tracking-[.12em] text-slate-400 lg:grid">
            <span>Employee</span>
            <span>Role</span>
            <span>Status</span>
            <span>Profile</span>
            <span>Access</span>
          </div>
          {visible.map((employee) => (
            <div
              key={employee.id}
              className="grid gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center lg:grid-cols-[minmax(220px,1fr)_100px_100px_130px_130px] lg:gap-4 lg:px-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  name={employee.name}
                  photo={employee.profile_photo_url}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {employee.name}
                  </p>
                  <p className="truncate text-[11px] font-semibold tracking-wide text-company">
                    {employee.employee_code}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {employee.designation || employee.email}
                  </p>
                  {employee.designation && (
                    <p className="truncate text-xs text-slate-400">
                      {employee.email}
                    </p>
                  )}
                </div>
              </div>
              <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {employee.role}
              </span>
              <span
                className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-semibold ${employee.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
              >
                {employee.is_active ? "Active" : "Inactive"}
              </span>
              <Button
                variant="secondary"
                className="min-h-10 px-4 text-xs"
                onClick={() => openEditor(employee)}
              >
                <Pencil size={8} /> Edit profile
              </Button>
              <Button
                variant="danger"
                className="min-h-10 px-4 text-xs"
                onClick={() => toggle(employee)}
              >
                <Power size={14} />
                {employee.is_active ? "Deactivate" : "Activate"}
              </Button>
            </div>
          ))}
          {!visible.length && (
            <div className="px-5 py-12 text-center text-sm text-muted">
              No employees match your search.
            </div>
          )}
        </div>
      )}

      {editing && (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !busy) closeEditor();
          }}
        >
          <section
            className="my-auto max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-[26px] border border-white/70 bg-white p-5 shadow-[0_24px_80px_rgba(10,30,50,.24)] sm:p-7"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[.15em] text-company/65">
                  Employee profile
                </p>
                <h2
                  id="profile-modal-title"
                  className="text-xl font-semibold text-company-dark"
                >
                  Edit profile
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Update personal and contact information for {editing.name}.
                </p>
              </div>
              <IconButton
                onClick={closeEditor}
                disabled={busy}
                aria-label="Close"
              >
                <X size={19} />
              </IconButton>
            </div>
            <form
              onSubmit={saveProfile}
              autoComplete="off"
              data-form-type="other"
            >
              <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-slate-50 p-4">
                <Avatar
                  name={editing.name}
                  photo={photoPreview || editing.profile_photo_url}
                  size="lg"
                />
                <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-line bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-alice">
                  <Camera size={15} /> Choose photo
                  <input
                    type="file"
                    autoComplete="new-password"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => choosePhoto(e.target.files?.[0])}
                  />
                </label>
                <small className="text-xs text-muted">
                  JPEG, PNG or WebP · Maximum 5 MB
                </small>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Employee ID">
                  <TextInput
                    required
                    minLength={2}
                    maxLength={32}
                    name="intranet-employee-profile-code"
                    {...inputProtection}
                    value={editForm.employee_code}
                    onChange={(e) =>
                      setEditForm((v) => ({
                        ...v,
                        employee_code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="e.g. SDE-001"
                  />
                </Field>
                <Field label="Full name">
                  <TextInput
                    required
                    maxLength={120}
                    name="intranet-employee-profile-name"
                    {...inputProtection}
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((v) => ({ ...v, name: e.target.value }))
                    }
                  />
                </Field>
                <Field label="Designation">
                  <TextInput
                    maxLength={120}
                    name="intranet-employee-profile-designation"
                    {...inputProtection}
                    value={editForm.designation}
                    onChange={(e) =>
                      setEditForm((v) => ({
                        ...v,
                        designation: e.target.value,
                      }))
                    }
                    placeholder="Job designation"
                  />
                </Field>
                <Field label="Phone number">
                  <TextInput
                    type="tel"
                    maxLength={30}
                    name="intranet-employee-profile-phone"
                    {...inputProtection}
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm((v) => ({ ...v, phone: e.target.value }))
                    }
                    placeholder="Contact number"
                  />
                </Field>
                <Field label="Company email">
                  <TextInput
                    required
                    type="email"
                    maxLength={254}
                    name="intranet-employee-profile-email"
                    {...inputProtection}
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((v) => ({ ...v, email: e.target.value }))
                    }
                    placeholder="name@company.com"
                  />
                </Field>
              </div>
              {error && (
                <div className="mt-4">
                  <Alert>{error}</Alert>
                </div>
              )}
              <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeEditor}
                  disabled={busy}
                >
                  Cancel
                </Button>
                <Button disabled={busy}>
                  {busy ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
      <ConfirmDialog
        open={Boolean(pendingDeactivation)}
        tone="warning"
        title={`Deactivate ${pendingDeactivation?.name || "this employee"}?`}
        description="They will immediately lose access to the intranet. Their account and existing records will remain intact, and an administrator can reactivate the account later."
        confirmLabel="Deactivate account"
        loading={statusBusy}
        onCancel={() => setPendingDeactivation(null)}
        onConfirm={confirmDeactivation}
      />
    </section>
  );
}
