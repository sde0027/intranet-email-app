import { CalendarDays, ExternalLink, Home, Package } from "lucide-react";
import Brand from "./Brand.jsx";
const portals = [
  {
    label: "Attendance",
    icon: CalendarDays,
    url: import.meta.env.VITE_ATTENDANCE_PORTAL_URL,
  },
  {
    label: "Product inventory",
    icon: Package,
    url: import.meta.env.VITE_INVENTORY_PORTAL_URL,
  },
];
export default function PublicNav() {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
      <Brand light />
      <nav
        className="flex items-center gap-1 rounded-xl border border-white/20 bg-black/16 p-1 text-sm text-black font-semibold"
        aria-label="Company portals"
      >
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 transition hover:bg-black/35 hover:text-white/88 "
        >
          <Home size={16} />
          <span className="hidden sm:inline text-shadow-2xl hover:text-white/88">
            Home
          </span>
        </a>
        {portals.map(({ label, icon: Icon, url }) => (
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
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 opacity-90 transition hover:bg-black/35 hover:text-white/88 aria-disabled:cursor-not-allowed aria-disabled:opacity-45"
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{label}</span>
            <ExternalLink size={12} />
          </a>
        ))}
      </nav>
    </header>
  );
}
