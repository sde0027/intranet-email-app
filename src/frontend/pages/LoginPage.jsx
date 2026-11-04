import { useState } from "react";
import { Eye, EyeOff, ArrowUpRight, ShieldCheck, Cpu, CircuitBoard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PublicNav from "../components/PublicNav.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import bg from "../assets/bg.webp";

const products = [
  ["Electronics engineering", "Design, development and integration capabilities."],
  ["Defence electronics", "Precision-focused electronic systems and solutions."],
  ["Manufacturing excellence", "From engineering concepts to dependable products."],
  ["System integration", "Connected hardware, electronics and control systems."],
];
const clientele = ["Defence research & development", "Aerospace and strategic systems", "Electronics manufacturing", "Industrial engineering", "Research institutions"];

export default function LoginPage() {
  const [mode, setMode] = useState("user");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    const next = {};
    if (!email.trim()) next.email = "Enter your company email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter a valid email address.";
    if (!password) next.password = "Enter your password.";
    setErrors(next); setMessage("");
    if (Object.keys(next).length) return;
    setBusy(true);
    try { await signIn(email.trim(), password, mode); navigate("/inbox", { replace: true }); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }

  return <div className="login-page" style={{ "--login-bg": `url(${bg})` }}>
    <div className="login-backdrop"/><PublicNav />
    <main className="login-main">
      <section className="reel-column clientele-column" aria-label="Company sectors">
        <div className="reel-heading"><span>OUR NETWORK</span><h2>Trusted relationships.<br/>Shared progress.</h2></div>
        <div className="vertical-reel"><div className="reel-track clientele-track">{[...clientele, ...clientele].map((item, i) => <article className="clientele-card" key={`${item}-${i}`} aria-hidden={i >= clientele.length}><span className="reel-index">0{(i % clientele.length) + 1}</span><div><strong>{item}</strong><small>Industry & institutional ecosystem</small></div><ArrowUpRight size={17}/></article>)}</div></div>
        <p className="reel-footnote">Built on collaboration, engineering and trust.</p>
      </section>

      <section className="login-card">
        <div className="login-card-top"><div className="login-emblem"><ShieldCheck size={23}/></div><span>SECURE EMPLOYEE PORTAL</span></div>
        <p className="eyebrow">{mode === "admin" ? "ADMINISTRATOR ACCESS" : "WELCOME BACK"}</p>
        <h1>{mode === "admin" ? "Administrator sign in" : "Sign in to your workspace"}</h1>
        <p className="login-description">{mode === "admin" ? "Manage your organisation's internal workspace." : "Access your company email and internal workspace."}</p>
        <div className="mode-switch" role="group" aria-label="Sign-in mode">
          <button type="button" className={mode === "user" ? "active" : ""} onClick={() => {setMode("user");setErrors({});setMessage("");}}>Employee</button>
          <button type="button" className={mode === "admin" ? "active" : ""} onClick={() => {setMode("admin");setErrors({});setMessage("");}}>Administrator</button>
        </div>
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="login-email">Company email</label>
          <input id="login-email" type="email" autoComplete="username" placeholder="name@sridattaelectronics.com" value={email} onChange={(e) => {setEmail(e.target.value);setErrors((v)=>({...v,email:""}));}} aria-invalid={Boolean(errors.email)}/>
          {errors.email && <small className="field-error">{errors.email}</small>}
          <div className="password-label"><label htmlFor="login-password">Password</label></div>
          <div className="password-input"><input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(e)=>{setPassword(e.target.value);setErrors((v)=>({...v,password:""}));}} aria-invalid={Boolean(errors.password)}/><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={()=>setShowPassword(v=>!v)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div>
          {errors.password && <small className="field-error">{errors.password}</small>}
          {message && <div className="form-alert" role="alert">{message}</div>}
          <button className="sign-in-button" type="submit" disabled={busy}>{busy ? <span className="button-spinner"/> : null}{busy ? "Signing in…" : mode === "admin" ? "Access administrator workspace" : "Sign in securely"}<ArrowUpRight size={17}/></button>
        </form>
        <div className="login-assurance"><ShieldCheck size={15}/><span>Protected company access · Session-based authentication</span></div>
      </section>

      <section className="reel-column products-column" aria-label="Company capabilities">
        <div className="reel-heading"><span>WHAT WE DO</span><h2>Engineering ideas<br/>into real solutions.</h2></div>
        <div className="vertical-reel"><div className="reel-track product-track">{[...products, ...products].map(([name, desc], i)=><article className="product-card" key={`${name}-${i}`} aria-hidden={i >= products.length}><div className="product-symbol">{i % 2 ? <CircuitBoard size={21}/> : <Cpu size={21}/>}</div><div><small>CAPABILITY / 0{(i % products.length)+1}</small><strong>{name}</strong><p>{desc}</p></div></article>)}</div></div>
        <p className="reel-footnote">Technology shaped around real-world requirements.</p>
      </section>
    </main>
    <footer className="login-footer"><span>© {new Date().getFullYear()} Sri Datta Electronics Pvt. Ltd.</span><span>Internal company portal</span></footer>
  </div>;
}
