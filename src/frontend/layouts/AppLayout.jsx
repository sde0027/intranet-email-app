import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ExternalLink,
  FileText,
  Inbox,
  LogOut,
  Menu,
  Package,
  Plus,
  Send,
  Shield,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import Brand from "../components/Brand.jsx";
import {
  Avatar,
  Button,
  ConfirmDialog,
  IconButton,
} from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const companyPortals = [
  {
    label: "Attendance Management",
    shortLabel: "Attendance",
    icon: CalendarDays,
    url: import.meta.env.VITE_ATTENDANCE_PORTAL_URL,
  },
  {
    label: "Product Inventory",
    shortLabel: "Inventory",
    icon: Package,
    url: import.meta.env.VITE_INVENTORY_PORTAL_URL,
  },
];

const links = [
  { to: "/inbox", label: "Inbox", icon: Inbox },
  { to: "/sent", label: "Sent", icon: Send },
  { to: "/drafts", label: "Drafts", icon: FileText },
  { to: "/trash", label: "Trash", icon: Trash2 },
];

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  async function handleLogout() {
    setSigningOut(true);
    try {
      await signOut();
      setConfirmSignOut(false);
      navigate("/", { replace: true });
    } finally {
      setSigningOut(false);
    }
  }
  const navClass = ({ isActive }) =>
    `flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm transition-all duration-200 ${isActive ? "bg-company-soft font-semibold text-company" : "text-slate-600 hover:bg-slate-100 hover:text-company"}`;

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-[#f3f7fb]">
      <header className="z-20 flex h-18 shrink-0 items-center gap-3 border-b border-line/80 bg-white/95 px-4 shadow-[0_2px_10px_rgba(20,55,85,.045)] backdrop-blur-xl sm:px-6 lg:px-8">
        <IconButton
          className="md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </IconButton>
        <Brand />
        <nav
          aria-label="Company portals"
          className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3"
        >
          {companyPortals.map(({ label, shortLabel, icon: Icon, url }) => (
            <a
              key={label}
              href={url || "#"}
              target={url ? "_blank" : undefined}
              rel={url ? "noopener noreferrer" : undefined}
              aria-disabled={!url}
              title={
                url ? `Open ${label}` : `${label} portal URL is not configured`
              }
              onClick={(event) => {
                if (!url) event.preventDefault();
              }}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 shadow-[0_1px_3px_rgba(20,50,80,.06)] transition duration-200 hover:-translate-y-px hover:border-company/30 hover:bg-company-soft hover:text-company hover:shadow-[0_4px_12px_rgba(20,50,80,.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-company/30 focus-visible:ring-offset-2 aria-disabled:cursor-not-allowed aria-disabled:opacity-45 aria-disabled:hover:translate-y-0 aria-disabled:hover:border-slate-200 aria-disabled:hover:bg-white aria-disabled:hover:text-slate-600 aria-disabled:hover:shadow-[0_1px_3px_rgba(20,50,80,.06)] sm:px-3.5 sm:text-sm"
            >
              <Icon size={16} className="shrink-0" />
              <span className="hidden sm:inline">{shortLabel}</span>
              <span className="sr-only sm:hidden">{label}</span>
              <ExternalLink
                size={12}
                className="hidden text-slate-400 sm:block"
              />
            </a>
          ))}
        </nav>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {mobileOpen && (
          <button
            className="absolute inset-0 z-20 bg-slate-950/25 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
        )}
        <aside
          className={`absolute inset-y-0 left-0 z-30 flex w-72 shrink-0 flex-col border-r border-line/80 bg-white px-4 py-6 shadow-[4px_0_18px_rgba(20,55,85,.025)] transition-transform duration-300 ease-out md:relative md:z-0 md:translate-x-0 ${mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}`}
        >
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-100 bg-linear-to-br from-white to-slate-50 p-3.5 shadow-sm">
            <Avatar
              name={user?.name}
              photo={user?.profile_photo_url}
              size="lg"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">
                {user?.name}
              </p>
              <p className="truncate text-xs text-muted">
                {user?.designation ||
                  (user?.role === "ADMIN" ? "Administrator" : "Employee")}
              </p>
              <p className="mt-0.5 truncate text-[11px] font-semibold tracking-wide text-company">
                ID: {user?.employee_code}
              </p>
              <p className="truncate text-[11px] text-slate-400">
                {user?.email}
              </p>
            </div>
          </div>
          <Button
            className="mb-7 min-h-12 w-full justify-center"
            onClick={() => {
              navigate("/compose");
              setMobileOpen(false);
            }}
          >
            <Plus size={18} /> Compose email
          </Button>
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">
            Mailbox
          </p>
          <nav className="grid gap-1">
            {links.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setMobileOpen(false)}
                className={navClass}
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          {user?.role === "ADMIN" && (
            <>
              <p className="mb-2 mt-7 flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">
                <Shield size={13} /> Administration
              </p>
              <nav>
                <NavLink
                  to="/employees"
                  onClick={() => setMobileOpen(false)}
                  className={navClass}
                >
                  <Users size={18} />
                  <span>Employees</span>
                </NavLink>
              </nav>
            </>
          )}
          <div className="mt-auto border-t border-line pt-4">
            <div className="mb-3 flex items-center gap-2 px-3 text-xs text-slate-400">
              <span className="size-2 rounded-full bg-emerald-500" /> Internal
              network workspace
            </div>
            <button
              onClick={() => setConfirmSignOut(true)}
              disabled={signingOut}
              className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-sm text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <LogOut size={17} />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 scroll-smooth overflow-y-auto overscroll-y-contain px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10 xl:px-12">
          <div
            key={location.pathname}
            className="mx-auto w-full max-w-375 animate-[content-enter_.22s_ease-out]"
          >
            <Outlet />
          </div>
        </main>
      </div>
      <ConfirmDialog
        open={confirmSignOut}
        title="Sign out of your account?"
        description="You will be signed out of this browser session. Any unsaved changes may be lost."
        confirmLabel="Sign out"
        loading={signingOut}
        onCancel={() => setConfirmSignOut(false)}
        onConfirm={handleLogout}
      />
    </div>
  );
}
