import { apiRequest, jsonBody } from "./api.js";
export const login = (credentials) => apiRequest("/auth/login", { method: "POST", body: jsonBody(credentials) });
export const logout = () => apiRequest("/auth/logout", { method: "POST" });
export const getCurrentSession = () => apiRequest("/employees/me");

export const changePassword = (data) => apiRequest("/auth/change-password", { method: "POST", body: jsonBody(data) });
