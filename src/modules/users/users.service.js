import argon2 from "argon2";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { db } from "../../database/connection.js";
import { config } from "../../config/config.js";

export const profilePhotoDirectory = path.join(
  config.database.directory,
  "profile-photos",
);

fs.mkdirSync(profilePhotoDirectory, { recursive: true });

const employeeSelect = `
  SELECT id, employee_code, name, email, role, is_active, designation, phone,
         CASE WHEN profile_photo IS NULL THEN NULL
              ELSE '/api/employees/' || id || '/photo' END AS profile_photo_url,
         created_at
  FROM users
`;

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

export async function createEmployee(input = {}) {
  const payload = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const { name, email, password } = payload;
  const employeeCode = normalizeEmployeeCode(payload.employee_code);
  const designation = typeof input.designation === "string" ? input.designation.trim() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";

  if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
    throw validationError("Name, employee ID, email, and password are required.");
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanName || !cleanEmail || !password || !employeeCode) {
    throw validationError("Name, employee ID, email, and password are required.");
  }
  if (cleanName.length > 120) throw validationError("Name must be 120 characters or fewer.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw validationError("Enter a valid email address.");
  if (password.length < 8) throw validationError("Password must contain at least 8 characters.");
  validateProfileFields(designation, phone);

  const passwordHash = await argon2.hash(password);
  try {
    const result = db.prepare(`
      INSERT INTO users (employee_code, name, email, password_hash, designation, phone)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(employeeCode, cleanName, cleanEmail, passwordHash, designation, phone);
    return db.prepare(`${employeeSelect} WHERE id = ?`).get(result.lastInsertRowid);
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      const codeOwner = db.prepare("SELECT 1 FROM users WHERE employee_code = ? COLLATE NOCASE").get(employeeCode);
      const conflict = new Error(codeOwner
        ? "This employee ID is already assigned. Choose a different ID."
        : "An account with this email already exists.");
      conflict.statusCode = 409;
      throw conflict;
    }
    throw error;
  }
}

export function getAllEmployees() {
  return db.prepare(`${employeeSelect} ORDER BY name COLLATE NOCASE ASC`).all();
}

export function getEmployeeById(id) {
  const employeeId = Number(id);
  if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
    throw validationError("Invalid employee ID.");
  }

  const employee = db.prepare(`${employeeSelect} WHERE id = ?`).get(employeeId);
  if (!employee) {
    const error = new Error("Employee not found.");
    error.statusCode = 404;
    throw error;
  }
  return employee;
}

export function updateEmployeeStatus(id, isActive) {
  const employeeId = Number(id);
  if (!Number.isSafeInteger(employeeId) || employeeId <= 0) throw validationError("Invalid employee ID.");
  if (typeof isActive !== "boolean") throw validationError("is_active must be a boolean.");

  const result = db.prepare("UPDATE users SET is_active = ? WHERE id = ?").run(isActive ? 1 : 0, employeeId);
  if (result.changes === 0) {
    const error = new Error("Employee not found.");
    error.statusCode = 404;
    throw error;
  }
  return db.prepare(`${employeeSelect} WHERE id = ?`).get(employeeId);
}

function normalizeEmployeeCode(value) {
  if (typeof value !== "string") throw validationError("Employee ID is required.");
  const code = value.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{0,31}$/.test(code)) {
    throw validationError("Employee ID must be 1–32 characters and contain only letters, numbers, hyphens, or underscores.");
  }
  return code;
}

function validateProfileFields(designation, phone) {
  if (typeof designation !== "string" || designation.length > 120) {
    throw validationError("Designation must be 120 characters or fewer.");
  }
  if (typeof phone !== "string" || phone.length > 30) {
    throw validationError("Phone number must be 30 characters or fewer.");
  }
}

export function updateEmployeeProfile({ id, input = {}, photo }) {
  const employeeId = Number(id);
  if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
    throw validationError("Invalid employee ID.");
  }
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw validationError("Profile update must be a valid object.");
  }

  const current = db.prepare(
    "SELECT id, employee_code, name, email, designation, phone, profile_photo FROM users WHERE id = ?",
  ).get(employeeId);
  if (!current) {
    const error = new Error("Employee not found.");
    error.statusCode = 404;
    throw error;
  }

  const has = (field) => Object.prototype.hasOwnProperty.call(input, field);
  const updates = {};

  if (has("employee_code")) {
    const employeeCode = normalizeEmployeeCode(input.employee_code);
    if (!employeeCode) throw validationError("Employee ID is required.");
    const codeOwner = db.prepare(
      "SELECT id FROM users WHERE employee_code = ? COLLATE NOCASE AND id <> ?",
    ).get(employeeCode, employeeId);
    if (codeOwner) {
      const conflict = new Error("This employee ID is already assigned. Choose a different ID.");
      conflict.statusCode = 409;
      throw conflict;
    }
    updates.employee_code = employeeCode;
  }

  if (has("name")) {
    if (typeof input.name !== "string") throw validationError("Name must be a string.");
    const name = input.name.trim();
    if (!name) throw validationError("Name cannot be empty.");
    if (name.length > 120) throw validationError("Name must be 120 characters or fewer.");
    updates.name = name;
  }

  if (has("email")) {
    if (typeof input.email !== "string") throw validationError("Email must be a string.");
    const email = input.email.trim().toLowerCase();
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw validationError("Enter a valid email address.");
    }

    const emailOwner = db.prepare(
      "SELECT id FROM users WHERE email = ? COLLATE NOCASE AND id <> ?",
    ).get(email, employeeId);
    if (emailOwner) {
      const conflict = new Error("An account with this email already exists.");
      conflict.statusCode = 409;
      throw conflict;
    }
    updates.email = email;
  }

  if (has("designation")) {
    if (typeof input.designation !== "string") {
      throw validationError("Designation must be a string.");
    }
    const designation = input.designation.trim();
    // Empty optional values are treated as "not supplied" so a form that
    // submits blank untouched fields cannot erase existing profile data.
    if (designation !== "") {
      if (designation.length > 120) {
        throw validationError("Designation must be 120 characters or fewer.");
      }
      updates.designation = designation;
    }
  }

  if (has("phone")) {
    if (typeof input.phone !== "string") throw validationError("Phone number must be a string.");
    const phone = input.phone.trim();
    // Same rule as designation: blank means preserve the stored value.
    if (phone !== "") {
      if (phone.length > 30) throw validationError("Phone number must be 30 characters or fewer.");
      updates.phone = phone;
    }
  }

  if (photo && (!Buffer.isBuffer(photo.buffer) || photo.buffer.length === 0)) {
    throw validationError("The uploaded profile photo is empty or invalid.");
  }
  if (Object.keys(updates).length === 0 && !photo) {
    throw validationError("Provide at least one profile field or a profile photo to update.");
  }

  let storageName = current.profile_photo;
  let newPhotoPath = null;
  if (photo) {
    const extensionByMime = {
      "image/jpeg": ".jpg",
      "image/png": ".png",
      "image/webp": ".webp",
    };
    const extension = extensionByMime[photo.mimeType];
    if (!extension) {
      throw validationError("Profile photo must be a JPEG, PNG, or WebP image.");
    }

    storageName = `${randomUUID()}${extension}`;
    newPhotoPath = path.join(profilePhotoDirectory, storageName);
    try {
      fs.writeFileSync(newPhotoPath, photo.buffer, { flag: "wx" });
    } catch (error) {
      // A failed write can leave a partially-created file behind.
      try {
        fs.unlinkSync(newPhotoPath);
      } catch (cleanupError) {
        if (cleanupError.code !== "ENOENT") {
          console.error("Unable to remove partially-written profile photo:", cleanupError.message);
        }
      }
      const storageError = new Error("Unable to store the profile photo.");
      storageError.statusCode = 500;
      storageError.cause = error;
      throw storageError;
    }
  }

  if (photo) updates.profile_photo = storageName;

  const columns = Object.keys(updates);
  const assignments = columns.map((column) => `${column} = ?`).join(", ");
  const values = columns.map((column) => updates[column]);

  try {
    db.prepare(`UPDATE users SET ${assignments} WHERE id = ?`).run(...values, employeeId);
  } catch (error) {
    if (newPhotoPath) {
      try {
        fs.unlinkSync(newPhotoPath);
      } catch (cleanupError) {
        if (cleanupError.code !== "ENOENT") {
          console.error("Unable to remove uncommitted profile photo:", cleanupError.message);
        }
      }
    }
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      const codeOwner = updates.employee_code
        ? db.prepare("SELECT 1 FROM users WHERE employee_code = ? COLLATE NOCASE AND id <> ?").get(updates.employee_code, employeeId)
        : null;
      const conflict = new Error(codeOwner
        ? "This employee ID is already assigned. Choose a different ID."
        : "An account with this email already exists.");
      conflict.statusCode = 409;
      throw conflict;
    }
    throw error;
  }

  // The database update has committed. An obsolete image is safe to leave
  // temporarily if filesystem cleanup fails; the active DB reference is valid.
  if (photo && current.profile_photo) {
    const oldPath = path.join(profilePhotoDirectory, current.profile_photo);
    try {
      fs.unlinkSync(oldPath);
    } catch (cleanupError) {
      if (cleanupError.code !== "ENOENT") {
        console.error("Unable to remove previous profile photo:", cleanupError.message);
      }
    }
  }

  return db.prepare(`${employeeSelect} WHERE id = ?`).get(employeeId);
}

export function getEmployeePhoto(id) {
  const employeeId = Number(id);
  if (!Number.isSafeInteger(employeeId) || employeeId <= 0) throw validationError("Invalid employee ID.");
  const employee = db.prepare("SELECT profile_photo FROM users WHERE id = ?").get(employeeId);
  if (!employee) {
    const error = new Error("Employee not found.");
    error.statusCode = 404;
    throw error;
  }
  if (!employee.profile_photo) {
    const error = new Error("Profile photo not found.");
    error.statusCode = 404;
    throw error;
  }
  // Only serve filenames generated by this service. This also prevents a
  // corrupted database value from escaping the profile-photo directory.
  const filename = employee.profile_photo;
  const validFilename = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i;
  if (typeof filename !== "string" || !validFilename.test(filename) || path.basename(filename) !== filename) {
    const error = new Error("Profile photo not found.");
    error.statusCode = 404;
    throw error;
  }

  const filePath = path.join(profilePhotoDirectory, filename);
  let fileStats;
  try {
    fileStats = fs.statSync(filePath);
  } catch (error) {
    if (error.code === "ENOENT") {
      const missing = new Error("Profile photo file is missing.");
      missing.statusCode = 404;
      throw missing;
    }
    throw error;
  }

  if (!fileStats.isFile()) {
    const error = new Error("Profile photo not found.");
    error.statusCode = 404;
    throw error;
  }
  return filePath;
}

/**
 * Remove profile-photo files that are no longer referenced by any user.
 * Only files matching the UUID naming convention generated by this service
 * are eligible, so unrelated files in the directory are left untouched.
 */
export function cleanupOrphanedProfilePhotos() {
  const referencedNames = new Set(
    db.prepare("SELECT profile_photo FROM users WHERE profile_photo IS NOT NULL").all()
      .map((row) => row.profile_photo),
  );
  const generatedFilename = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp)$/i;
  let deletedCount = 0;

  for (const entry of fs.readdirSync(profilePhotoDirectory, { withFileTypes: true })) {
    if (!entry.isFile() || !generatedFilename.test(entry.name) || referencedNames.has(entry.name)) {
      continue;
    }

    try {
      fs.unlinkSync(path.join(profilePhotoDirectory, entry.name));
      deletedCount += 1;
    } catch (error) {
      if (error.code !== "ENOENT") {
        console.error(`Unable to remove orphaned profile photo ${entry.name}:`, error.message);
      }
    }
  }

  return deletedCount;
}
