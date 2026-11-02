import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

// Project root: intranet-email-app/
export const PROJECT_ROOT = path.resolve(currentDirectory, "../../");

function readBoolean(value, fallback = false) {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function readPositiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  port: readPositiveInteger(process.env.PORT, 3000),
  sessionSecret: process.env.SESSION_SECRET,
  cookieSecure: readBoolean(process.env.COOKIE_SECURE, false),
  loginRateLimit: {
    windowMs: readPositiveInteger(process.env.LOGIN_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    maxAttempts: readPositiveInteger(process.env.LOGIN_RATE_LIMIT_MAX, 10),
  },

  database: {
    directory: path.join(PROJECT_ROOT, "data"),
    filename: "intranet-email.sqlite",
  },
};
