import { apiRequest, jsonBody } from "./api.js";
export const getEmployees = () => apiRequest("/employees");
export const createEmployee = (data) =>
  apiRequest("/employees", { method: "POST", body: jsonBody(data) });
export const updateEmployeeStatus = (id, is_active) =>
  apiRequest(`/employees/${id}/status`, {
    method: "PATCH",
    body: jsonBody({ is_active }),
  });

export const updateEmployeeProfile = (id, data) => {
  const body = new FormData();
  body.append("employee_code", data.employee_code);
  body.append("name", data.name);
  body.append("email", data.email);
  body.append("designation", data.designation);
  body.append("phone", data.phone);
  if (data.profile_photo) body.append("profile_photo", data.profile_photo);
  return apiRequest(`/employees/${id}/profile`, { method: "PATCH", body });
};

export const updateMyProfilePhoto = (file) => {
  const body = new FormData();
  body.append("profile_photo", file);
  return apiRequest("/employees/me/photo", { method: "PUT", body });
};

export const resetEmployeePassword = (id, newPassword) =>
  apiRequest(`/employees/${id}/reset-password`, {
    method: "POST",
    body: jsonBody({ newPassword }),
  });
