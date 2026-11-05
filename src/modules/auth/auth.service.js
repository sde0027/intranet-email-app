import argon2 from "argon2";
import { db } from "../../database/connection.js";

export async function login({ identifier, email, password }) {
  const loginIdentifier = typeof identifier === "string" ? identifier : email;
  if (typeof loginIdentifier !== "string" || typeof password !== "string") {
    const error = new Error("Employee ID or email and password are required.");
    error.statusCode = 400;
    throw error;
  }

  const cleanIdentifier = loginIdentifier.trim();

  if (!cleanIdentifier || !password) {
    const error = new Error("Employee ID or email and password are required.");
    error.statusCode = 400;
    throw error;
  }

  const lookup = cleanIdentifier.includes("@")
    ? db.prepare(`
        SELECT id, employee_code, name, email, password_hash, role, is_active, designation, phone, profile_photo
        FROM users WHERE email = ? COLLATE NOCASE
      `)
    : db.prepare(`
        SELECT id, employee_code, name, email, password_hash, role, is_active, designation, phone, profile_photo
        FROM users WHERE employee_code = ? COLLATE NOCASE
      `);
  const user = lookup.get(cleanIdentifier);

  if (!user || !user.is_active) {
    const error = new Error("Invalid employee ID/email or password.");
    error.statusCode = 401;
    throw error;
  }

  const passwordMatches = await argon2.verify(user.password_hash, password);

  if (!passwordMatches) {
    const error = new Error("Invalid employee ID/email or password.");
    error.statusCode = 401;
    throw error;
  }

  return {
    id: user.id,
    employee_code: user.employee_code,
    name: user.name,
    email: user.email,
    role: user.role,
    designation: user.designation,
    phone: user.phone,
    profile_photo_url: user.profile_photo ? `/api/employees/${user.id}/photo` : null,
  };
}
