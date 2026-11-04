import { CalendarDays, ExternalLink, Home, Package } from "lucide-react";
import Brand from "./Brand.jsx";

const portals = [
  { label: "Attendance", icon: CalendarDays, url: import.meta.env.VITE_ATTENDANCE_PORTAL_URL },
  { label: "Product inventory", icon: Package, url: import.meta.env.VITE_INVENTORY_PORTAL_URL },
];

export default function PublicNav() {
  return <header className="public-header"><Brand light /><nav className="public-links" aria-label="Company portals">
    <a href="/"><Home size={16}/> <span>Home</span></a>
    {portals.map(({ label, icon: Icon, url }) => <a key={label} href={url || "#"} target={url ? "_blank" : undefined} rel={url ? "noopener noreferrer" : undefined} aria-disabled={!url} title={url ? `Open ${label}` : `${label} portal URL is not configured`} onClick={event => { if (!url) event.preventDefault(); }}><Icon size={16}/> <span>{label}</span><ExternalLink size={12}/></a>)}
  </nav></header>;
}
