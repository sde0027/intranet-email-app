import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../services/api.js";
import * as authService from "../services/auth.service.js";

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("intranet.user") || "null"); } catch { return null; }
  });
  const [checking, setChecking] = useState(Boolean(user));

  useEffect(() => {
    if (!user) { setChecking(false); return; }
    let active = true;
    apiRequest("/emails/unread-count")
      .catch((error) => {
        if (active && error.status === 401) {
          setUser(null);
          sessionStorage.removeItem("intranet.user");
        }
      })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, []);

  const signIn = useCallback(async (email, password, mode) => {
    const result = await authService.login({ email, password });
    if (result.user.role !== (mode === "admin" ? "ADMIN" : "EMPLOYEE")) {
      await authService.logout().catch(() => {});
      throw new Error(mode === "admin" ? "This account does not have administrator access." : "Please use the administrator sign-in option for this account.");
    }
    setUser(result.user);
    sessionStorage.setItem("intranet.user", JSON.stringify(result.user));
    return result.user;
  }, []);

  const signOut = useCallback(async () => {
    try { await authService.logout(); }
    finally { setUser(null); sessionStorage.removeItem("intranet.user"); }
  }, []);

  const value = useMemo(() => ({ user, checking, signIn, signOut, setUser }), [user, checking, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
