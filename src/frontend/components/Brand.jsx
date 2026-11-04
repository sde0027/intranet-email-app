import logo from "../assets/logo.webp";
export default function Brand({ compact = false, light = false }) {
  return (
    <a
      className={`flex shrink-0 items-center gap-2.5 ${light ? "text-white" : "text-company"}`}
      href="/"
      aria-label="Sri Datta Electronics home"
    >
      <img
        src={logo}
        alt=""
        width="42"
        height="42"
        className="size-10 rounded-full object-contain shadow-2xl"
      />
      {!compact && (
        <span className="grid leading-tight">
          <strong className="text-sm text-shadow-2xl font-bold tracking-tight sm:text-base">
            Sri Datta Electronics
          </strong>
          <small className="mt-0.5 text-[9px] font-semibold tracking-[.2em] opacity-70">
            PRIVATE LIMITED
          </small>
        </span>
      )}
    </a>
  );
}
