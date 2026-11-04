import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as authService from "../services/auth.service.js";

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [checking, setChecking] = useState(true);

  // The HttpOnly cookie is the source of truth. Restore the user from the
  // backend on every app load, including a fresh tab with no local user cache.
  useEffect(() => {
    let active = true;

    authService.getCurrentSession()
      .then((result) => {
        if (active) {
          setUser(result.employee ?? null);
          setExpiresAt(result.expiresAt ?? null);
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
          setExpiresAt(null);
        }
      })
      .finally(() => {
        if (active) setChecking(false);
      });

    return () => { active = false; };
  }, []);

  // End the local authenticated view at the same fixed deadline enforced by
  // the server. User activity never changes this timestamp.
  useEffect(() => {
    if (!user || !Number.isFinite(Number(expiresAt))) return undefined;

    const remaining = Number(expiresAt) - Date.now();
    if (remaining <= 0) {
      setUser(null);
      setExpiresAt(null);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setUser(null);
      setExpiresAt(null);
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [user, expiresAt]);

  const signIn = useCallback(async (email, password, mode) => {
    const result = await authService.login({ email, password });
    if (result.user.role !== (mode === "admin" ? "ADMIN" : "EMPLOYEE")) {
      await authService.logout().catch(() => {});
      throw new Error(mode === "admin" ? "This account does not have administrator access." : "Please use the administrator sign-in option for this account.");
    }
    setUser(result.user);
    setExpiresAt(result.expiresAt);
    return result.user;
  }, []);

  const signOut = useCallback(async () => {
    try { await authService.logout(); }
    finally { setUser(null); setExpiresAt(null); }
  }, []);

  const value = useMemo(() => ({ user, checking, signIn, signOut, setUser }), [user, checking, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
