import argon2 from "argon2";
import { db } from "../../database/connection.js";

export async function login({ email, password }) {
  if (typeof email !== "string" || typeof password !== "string") {
    const error = new Error("Email and password are required.");
    error.statusCode = 400;
    throw error;
  }

  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !password) {
    const error = new Error("Email and password are required.");
    error.statusCode = 400;
    throw error;
  }

  const user = db
    .prepare(
      `
    SELECT id, name, email, password_hash, role, is_active, designation, phone, profile_photo
    FROM users
    WHERE email = ?
  `,
    )
    .get(cleanEmail);

  if (!user || !user.is_active) {
    const error = new Error("Invalid email or password.");
    error.statusCode = 401;
    throw error;
  }

  const passwordMatches = await argon2.verify(user.password_hash, password);

  if (!passwordMatches) {
    const error = new Error("Invalid email or password.");
    error.statusCode = 401;
    throw error;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    designation: user.designation,
    phone: user.phone,
    profile_photo_url: user.profile_photo ? `/api/employees/${user.id}/photo` : null,
  };
}
