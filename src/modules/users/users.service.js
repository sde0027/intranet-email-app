import argon2 from "argon2";
import { db } from "../../database/connection.js";

export async function createEmployee(input = {}) {
  const { name, email, password } = input ?? {};

  // Validate data types and required fields.
  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    const error = new Error("Name, email, and password are required.");
    error.statusCode = 400;
    throw error;
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanName || !cleanEmail || !password) {
    const error = new Error("Name, email, and password are required.");
    error.statusCode = 400;
    throw error;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    const error = new Error("Enter a valid email address.");
    error.statusCode = 400;
    throw error;
  }

  if (password.length < 8) {
    const error = new Error("Password must contain at least 8 characters.");
    error.statusCode = 400;
    throw error;
  }

  const passwordHash = await argon2.hash(password);

  try {
    const result = db
      .prepare(
        `
      INSERT INTO users (name, email, password_hash)
      VALUES (?, ?, ?)
    `,
      )
      .run(cleanName, cleanEmail, passwordHash);

    return db
      .prepare(
        `
      SELECT id, name, email, role, is_active, created_at
      FROM users
      WHERE id = ?
    `,
      )
      .get(result.lastInsertRowid);
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      const conflict = new Error("An account with this email already exists.");
      conflict.statusCode = 409;
      throw conflict;
    }

    throw error;
  }
}

export function getAllEmployees() {
  return db
    .prepare(
      `
    SELECT
      id,
      name,
      email,
      role,
      is_active,
      created_at
    FROM users
    ORDER BY name COLLATE NOCASE ASC
  `,
    )
    .all();
}

export function updateEmployeeStatus(id, isActive) {
  const employeeId = Number(id);

  if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
    const error = new Error("Invalid employee ID.");
    error.statusCode = 400;
    throw error;
  }

  if (typeof isActive !== "boolean") {
    const error = new Error("is_active must be a boolean.");
    error.statusCode = 400;
    throw error;
  }

  const result = db
    .prepare(
      `
    UPDATE users
    SET is_active = ?
    WHERE id = ?
  `,
    )
    .run(isActive ? 1 : 0, employeeId);

  if (result.changes === 0) {
    const error = new Error("Employee not found.");
    error.statusCode = 404;
    throw error;
  }

  return db
    .prepare(
      `
    SELECT id, name, email, role, is_active, created_at
    FROM users
    WHERE id = ?
  `,
    )
    .get(employeeId);
}
