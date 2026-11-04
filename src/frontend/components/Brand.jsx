import logo from "../assets/logo.webp";
export default function Brand({ compact = false, light = false }) {
  return <a className={`brand ${light ? "brand-light" : ""}`} href="/" aria-label="Sri Datta Electronics home">
    <img src={logo} alt="" width="46" height="46" />
    {!compact && <span><strong>Sri Datta Electronics</strong><small>PRIVATE LIMITED</small></span>}
  </a>;
}
