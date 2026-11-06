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

function passwordValidationError(message, statusCode = 400, code = "INVALID_PASSWORD") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function validateNewPassword(password) {
  if (typeof password !== "string" || password.length < 8) {
    throw passwordValidationError("New password must contain at least 8 characters.");
  }
}

// Remove every persisted session belonging to an employee. Session payloads
// are JSON written by express-session; malformed legacy rows are left alone.
function deleteUserSessions(userId) {
  const rows = db.prepare("SELECT sid, sess FROM sessions").all();
  const removeSession = db.prepare("DELETE FROM sessions WHERE sid = ?");

  for (const row of rows) {
    try {
      const sessionData = JSON.parse(row.sess);
      if (Number(sessionData?.user?.id) === Number(userId)) {
        removeSession.run(row.sid);
      }
    } catch {
      // Do not let an unrelated malformed session prevent password changes.
    }
  }
}

export async function changeUserPassword({ userId, currentPassword, newPassword }) {
  if (typeof currentPassword !== "string" || !currentPassword) {
    throw passwordValidationError("Current password is required.");
  }
  validateNewPassword(newPassword);

  const user = db.prepare(
    "SELECT id, password_hash FROM users WHERE id = ? AND is_active = 1",
  ).get(userId);

  if (!user) {
    throw passwordValidationError("Account not found or inactive.", 404, "ACCOUNT_NOT_FOUND");
  }

  const currentMatches = await argon2.verify(user.password_hash, currentPassword);
  if (!currentMatches) {
    throw passwordValidationError("Current password is incorrect.", 401, "CURRENT_PASSWORD_INCORRECT");
  }

  if (await argon2.verify(user.password_hash, newPassword)) {
    throw passwordValidationError("New password must be different from your current password.");
  }

  const passwordHash = await argon2.hash(newPassword);
  const updateAndInvalidate = db.transaction(() => {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, userId);
    deleteUserSessions(userId);
  });
  updateAndInvalidate();

  return { passwordChanged: true, sessionsInvalidated: true };
}

// Administrator-only password reset. The route enforcing ADMIN authorization
// is the security boundary; this service still validates the target account.
export async function resetUserPassword({ userId, newPassword }) {
  validateNewPassword(newPassword);

  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
  if (!user) {
    throw passwordValidationError("Employee not found.", 404, "EMPLOYEE_NOT_FOUND");
  }

  const passwordHash = await argon2.hash(newPassword);
  const resetAndInvalidate = db.transaction(() => {
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, userId);
    deleteUserSessions(userId);
  });
  resetAndInvalidate();

  return { passwordReset: true, sessionsInvalidated: true };
}
