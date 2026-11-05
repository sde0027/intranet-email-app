import { useState } from "react";
import {
  Eye,
  EyeOff,
  ArrowUpRight,
  ShieldCheck,
  Cpu,
  CircuitBoard,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PublicNav from "../components/PublicNav.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import {
  Alert,
  AppLoadingScreen,
  Button,
  Eyebrow,
  TextInput,
} from "../components/ui.jsx";
import bg from "../assets/jet.png";

const products = [
  [
    "Electronics engineering",
    "Design, development and integration capabilities.",
  ],
  [
    "Defence electronics",
    "Precision-focused electronic systems and solutions.",
  ],
  [
    "Manufacturing excellence",
    "From engineering concepts to dependable products.",
  ],
  [
    "System integration",
    "Connected hardware, electronics and control systems.",
  ],
];
const clientele = [
  "Defence research & development",
  "Aerospace and strategic systems",
  "Electronics manufacturing",
  "Industrial engineering",
  "Research institutions",
];

export default function LoginPage() {
  const [mode, setMode] = useState("user"),
    [identifier, setIdentifier] = useState(""),
    [password, setPassword] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [errors, setErrors] = useState({}),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const { signIn } = useAuth(),
    navigate = useNavigate();
  async function handleSubmit(event) {
    event.preventDefault();
    const next = {};
    if (!identifier.trim())
      next.email = "Enter your employee ID or company email.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    setMessage("");
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await signIn(identifier.trim(), password, mode);
      navigate("/inbox", { replace: true });
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }
  const switchMode = (value) => {
    setMode(value);
    setErrors({});
    setMessage("");
  };

  if (busy) {
    return (
      <AppLoadingScreen
        message="Signing you in…"
        detail="Verifying your credentials and opening your workspace"
      />
    );
  }

  return (
    <div className="relative isolate flex min-h-screen flex-col overflow-x-hidden bg-[#eaf2f5] text-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center"
        style={{
          backgroundImage: `linear-gradient(115deg,rgba(238,247,250,.24),rgba(231,243,247,.18) 45%,rgba(220,237,243,.92)),url(${bg})`,
        }}
      />
      <PublicNav />
      <main className="mx-auto grid w-full max-w-375 flex-1 grid-cols-1 items-center gap-7 px-5 py-7 sm:px-8 lg:px-12 xl:grid-cols-[minmax(0,1fr)_minmax(360px,440px)_minmax(0,1fr)] xl:gap-[clamp(20px,3vw,54px)]">
        <section
          className="mx-auto hidden w-full min-w-0 max-w-107.5 xl:block"
          aria-label="Company sectors"
        >
          <div className="mb-5">
            <p className="text-[9px] font-bold tracking-[.2em] text-[#ebf3f5a7]">
              OUR NETWORK
            </p>
            <h2 className="mt-2 font-sans text-[clamp(19px,2vw,26px)] font-bold leading-[1.3] tracking-tight text-[#032230]">
              Trusted relationships.
              <br />
              Shared progress.
            </h2>
          </div>
          <div className="h-87.5 overflow-hidden mask-[linear-gradient(transparent,black_9%,black_91%,transparent)]">
            <div className="flex animate-[login-reel-up_54s_linear_infinite] flex-col gap-3 will-change-transform">
              {[...clientele, ...clientele].map((item, i) => (
                <article
                  key={`${item}-${i}`}
                  aria-hidden={i >= clientele.length}
                  className="flex min-h-20.5 items-center gap-3.5 rounded-2xl border border-[#0c536f]/10 bg-white/70 px-4 py-4 shadow-[0_8px_26px_rgba(17,70,91,.045)] backdrop-blur-xl"
                >
                  <span className="text-[10px] font-bold tracking-wider text-[#1698ba]">
                    0{(i % clientele.length) + 1}
                  </span>
                  <div className="grid flex-1 gap-1">
                    <strong className="text-xs font-bold text-[#1b485e]">
                      {item}
                    </strong>
                    <small className="text-[10px] text-[#7a909b]">
                      Industry & institutional ecosystem
                    </small>
                  </div>
                  <ArrowUpRight size={17} className="text-[#5e94a8]" />
                </article>
              ))}
            </div>
          </div>
          <p className="mt-4 text-[10px] tracking-wide text-[#011928]">
            Built on collaboration, engineering and trust.
          </p>
        </section>

        <section className="mx-auto w-full max-w-115 rounded-3xl border border-white/90 bg-white/64 p-6 shadow-[0_28px_80px_rgba(12,65,86,.14),0_2px_8px_rgba(12,65,86,.04)] backdrop-blur-2xl animate-[login-card-in_.55s_cubic-bezier(.2,.8,.2,1)_both] sm:p-8">
          <div className="mb-7 flex items-center gap-2.5">
            {/* <span className="grid size-[38px] place-items-center rounded-xl bg-[#e5f4f8] text-[#087fa1]">
              <ShieldCheck size={23} />
            </span> */}
            {/* <span className="text-[9px] font-bold tracking-[.16em] text-[#688390]">
              SECURE EMPLOYEE PORTAL
            </span> */}
          </div>
          <p className="mb-2 text-[9px] font-bold tracking-[.2em] text-[#1488a9]">
            {mode === "admin" ? "ADMINISTRATOR ACCESS" : "WELCOME BACK"}
          </p>
          <h1 className="font-sans text-[clamp(23px,2.2vw,29px)] font-extrabold leading-tight tracking-tight text-[#123c51]">
            {mode === "admin"
              ? "Administrator sign in"
              : "Sign in to your workspace"}
          </h1>
          <p className="mb-6 mt-2.5 text-xs leading-relaxed text-[#718693]">
            {mode === "admin"
              ? "Manage your organisation's internal workspace."
              : "Access your company email and internal workspace."}
          </p>
          <div
            className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-[#edf3f6] p-1.5"
            role="group"
            aria-label="Sign-in mode"
          >
            <button
              type="button"
              onClick={() => switchMode("user")}
              className={`rounded-lg px-3 py-2.5 text-[11px] font-semibold transition-colors duration-200 ${mode === "user" ? "bg-white text-[#07516b] shadow-[0_2px_8px_rgba(17,65,83,.1)]" : "text-[#718794] hover:text-[#34576a]"}`}
            >
              Employee
            </button>
            <button
              type="button"
              onClick={() => switchMode("admin")}
              className={`rounded-lg px-3 py-2.5 text-[11px] font-semibold transition-colors duration-200 ${mode === "admin" ? "bg-white text-[#07516b] shadow-[0_2px_8px_rgba(17,65,83,.1)]" : "text-[#718794] hover:text-[#34576a]"}`}
            >
              Administrator
            </button>
          </div>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col">
            <label
              htmlFor="login-email"
              className="mb-2 text-[10px] font-bold text-[#34576a]"
            >
              Employee ID or company email
            </label>
            <TextInput
              id="login-email"
              type="text"
              autoComplete="username"
              placeholder="EMP-0001 or name@company.com"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                setErrors((v) => ({ ...v, email: "" }));
              }}
              aria-invalid={Boolean(errors.email)}
              className={errors.email ? "border-red-400" : ""}
            />
            {errors.email && (
              <small className="mt-1.5 text-[10px] text-red-600">
                {errors.email}
              </small>
            )}
            <div className="mb-2 mt-4">
              <label
                htmlFor="login-password"
                className="text-[10px] font-bold text-[#34576a]"
              >
                Password
              </label>
            </div>
            <div className="relative">
              <TextInput
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((v) => ({ ...v, password: "" }));
                }}
                aria-invalid={Boolean(errors.password)}
                className={`pr-12 ${errors.password ? "border-red-400" : ""}`}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1.5 top-1.5 grid size-8 place-items-center rounded-lg text-[#77909d] transition-colors hover:bg-[#edf5f7] hover:text-[#087fa1]"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
            {errors.password && (
              <small className="mt-1.5 text-[10px] text-red-600">
                {errors.password}
              </small>
            )}
            {message && <Alert>{message}</Alert>}
            <Button
              type="submit"
              disabled={busy}
              className="mt-6 min-h-11.5 w-full rounded-xl bg-linear-to-r from-[#08799b] to-[#087fa7] text-[11px] font-bold shadow-[0_7px_18px_rgba(4,112,147,.18)] transition duration-200 hover:-translate-y-px hover:shadow-[0_10px_22px_rgba(4,112,147,.24)]"
            >
              {busy
                ? "Signing in…"
                : mode === "admin"
                  ? "Access administrator workspace"
                  : "Sign in securely"}
              <ArrowUpRight size={17} />
            </Button>
          </form>
          <div className="mt-6 flex items-center justify-center gap-2 border-t border-[#edf1f3] pt-5 text-center text-[9px] text-[#2f3639]">
            <ShieldCheck size={15} className="text-[#134851]" />
            Protected company access · Session-based authentication
          </div>
        </section>

        <section
          className="mx-auto hidden w-full min-w-0 max-w-107.5 xl:block"
          aria-label="Company capabilities"
        >
          <div className="mb-5">
            <p className="text-[9px] font-bold tracking-[.2em] text-[#1488a9]">
              WHAT WE DO
            </p>
            <h2 className="mt-2 font-sans text-[clamp(19px,2vw,26px)] font-bold leading-[1.3] tracking-tight text-[#16445a]">
              Engineering ideas
              <br />
              into real solutions.
            </h2>
          </div>
          <div className="h-87.5 overflow-hidden mask-[linear-gradient(transparent,black_9%,black_91%,transparent)]">
            <div className="flex animate-[login-reel-up_42s_linear_infinite] flex-col gap-3 will-change-transform">
              {[...products, ...products].map(([name, desc], i) => (
                <article
                  key={`${name}-${i}`}
                  aria-hidden={i >= products.length}
                  className="flex min-h-30 items-start gap-3 rounded-2xl border border-[#0c536f]/10 bg-white/70 p-4 shadow-[0_8px_26px_rgba(17,70,91,.045)] backdrop-blur-xl"
                >
                  <span className="grid size-9.75 shrink-0 place-items-center rounded-xl bg-[#e3f3f7] text-[#0785a7]">
                    {i % 2 ? <CircuitBoard size={21} /> : <Cpu size={21} />}
                  </span>
                  <div className="grid gap-1.5">
                    <small className="text-[8px] font-bold tracking-[.15em] text-[#0e91b2]">
                      CAPABILITY / 0{(i % products.length) + 1}
                    </small>
                    <strong className="text-xs font-bold text-[#1b485e]">
                      {name}
                    </strong>
                    <p className="m-0 text-[10px] leading-relaxed text-[#718895]">
                      {desc}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <p className="mt-4 text-[10px] tracking-wide text-[#011928]">
            Technology shaped around real-world requirements.
          </p>
        </section>
        <section className="mx-auto w-full max-w-115 xl:hidden">
          <p className="mb-3 text-[9px] font-bold tracking-[.2em] text-[#1488a9]">
            WHAT WE DO
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {products.map(([name, desc]) => (
              <article
                key={name}
                className="rounded-xl border border-[#0c536f]/10 bg-white/70 p-3"
              >
                <strong className="text-xs text-[#1b485e]">{name}</strong>
                <p className="mt-1 text-[10px] leading-relaxed text-[#718895]">
                  {desc}
                </p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="mx-auto flex w-full max-w-375 flex-wrap justify-between gap-2 px-5 py-4 text-[10px] text-[#011928] sm:px-8 lg:px-12">
        <span>
          © {new Date().getFullYear()} Sri Datta Electronics Pvt. Ltd.
        </span>
        <span>Internal company portal</span>
      </footer>
    </div>
  );
}
