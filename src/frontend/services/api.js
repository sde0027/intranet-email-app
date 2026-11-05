import { notifySessionInvalidated } from "./session-sync.js";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

export async function apiRequest(path, options = {}) {
  const { headers = {}, ...rest } = options;
  const isFormData = rest.body instanceof FormData;
  const response = await fetch(`${API_BASE}/api${path}`, {
    credentials: "include",
    ...rest,
    headers: {
      ...(rest.body && !isFormData
        ? { "Content-Type": "application/json" }
        : {}),
      ...headers,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : null;
  if (!response.ok) {
    // A protected API response can reveal that the server-side session was
    // destroyed or expired. Clear stale authenticated views in every tab.
    if (response.status === 401 && path !== "/auth/login") {
      notifySessionInvalidated("server-rejected-session");
    }
    const error = new Error(
      payload?.error || `Request failed (${response.status}).`,
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export const jsonBody = (value) => JSON.stringify(value);
