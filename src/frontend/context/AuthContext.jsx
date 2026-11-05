import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as authService from "../services/auth.service.js";
import { notifySessionAuthenticated, notifySessionInvalidated, subscribeToSessionInvalidation } from "../services/session-sync.js";

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [checking, setChecking] = useState(true);

  const sessionRequestId = useRef(0);

  // The HttpOnly cookie is the source of truth. Every tab restores from the
  // backend, and a newer cross-tab event supersedes any older in-flight check.
  const refreshSession = useCallback(async () => {
    const requestId = ++sessionRequestId.current;
    setChecking(true);
    try {
      const result = await authService.getCurrentSession();
      if (requestId === sessionRequestId.current) {
        setUser(result.employee ?? null);
        setExpiresAt(result.expiresAt ?? null);
      }
    } catch {
      if (requestId === sessionRequestId.current) {
        setUser(null);
        setExpiresAt(null);
      }
    } finally {
      if (requestId === sessionRequestId.current) setChecking(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // A login in another tab is just as important as a logout: refresh the
  // shared cookie-backed session and route this tab into the authenticated app.
  useEffect(() => subscribeToSessionInvalidation((message) => {
    if (message.type === "SESSION_AUTHENTICATED") {
      // The browser now has a valid session. Restore it in this tab so it
      // enters the inbox without requiring a manual refresh.
      refreshSession();
      return;
    }

    // Do not make another protected request here: a 401-triggered invalidation
    // would otherwise cause a loop of repeated session checks.
    ++sessionRequestId.current;
    setUser(null);
    setExpiresAt(null);
    setChecking(false);
  }), [refreshSession]);

  // End the local authenticated view at the same fixed deadline enforced by
  // the server. User activity never changes this timestamp.
  useEffect(() => {
    if (!user || !Number.isFinite(Number(expiresAt))) return undefined;

    const remaining = Number(expiresAt) - Date.now();
    if (remaining <= 0) {
      notifySessionInvalidated("session-expired");
      setUser(null);
      setExpiresAt(null);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      notifySessionInvalidated("session-expired");
      setUser(null);
      setExpiresAt(null);
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [user, expiresAt]);

  const signIn = useCallback(async (identifier, password, mode) => {
    const result = await authService.login({ identifier, password });
    if (result.user.role !== (mode === "admin" ? "ADMIN" : "EMPLOYEE")) {
      await authService.logout().catch(() => {});
      throw new Error(mode === "admin" ? "This account does not have administrator access." : "Please use the administrator sign-in option for this account.");
    }
    // A successful login changes the shared browser session. Sibling tabs
    // re-check the backend and enter the inbox without requiring a refresh.
    notifySessionAuthenticated("account-signed-in");
    setUser(result.user);
    setExpiresAt(result.expiresAt);
    return result.user;
  }, []);

  const signOut = useCallback(async () => {
    try { await authService.logout(); }
    finally {
      notifySessionInvalidated("signed-out");
      setUser(null);
      setExpiresAt(null);
    }
  }, []);

  const value = useMemo(() => ({ user, checking, signIn, signOut, setUser }), [user, checking, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
