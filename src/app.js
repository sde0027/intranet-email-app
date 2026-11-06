import express from "express";
import { db } from "./database/connection.js";
import { config } from "./config/config.js";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { createLoginRateLimiter } from "./middleware/login-rate-limit.js";
// session imports
import session from "express-session";
import { SQLiteSessionStore, SESSION_TTL_MS } from "./middleware/sqlite-session-store.js";
import { cleanupExpiredTrashService } from "./modules/emails/emails.service.js";
import { cleanupOrphanedProfilePhotos } from "./modules/users/users.service.js";
import { backfillAttachmentContentHashes } from "./modules/attachments/attachments.service.js";

// Route imports
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import emailsRoutes from "./modules/emails/emails.routes.js";

// Auth imports
import { authenticate } from "./middleware/authenticate.js";
if (!config.sessionSecret) {
  throw new Error("SESSION_SECRET is missing from the environment configuration.");
}

const sessionStore = new SQLiteSessionStore();

const sessionMiddleware = session({
  name: "intranet.sid",
  secret: config.sessionSecret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: false,
  cookie: {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    maxAge: SESSION_TTL_MS,
  },
});

const app = express();
// Parse incoming request message bodies
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
// middleware
app.use(sessionMiddleware);
app.use(
  "/api/auth",
  createLoginRateLimiter(config.loginRateLimit),
  authRoutes,
);
app.use("/api/employees", authenticate, usersRoutes);
app.use("/api/emails", emailsRoutes);

app.get("/api/health", (req, res) => {
  try {
    const result = db.prepare("SELECT 1 AS connected").get();

    res.status(200).json({
      status: "ok",
      database: result.connected === 1 ? "connected" : "error",
    });
  } catch (error) {
    console.error("Database health check failed:", error.message);

    res.status(503).json({
      status: "error",
      database: "unavailable",
    });
  }
});

// Keep unknown endpoints and unexpected errors in the same JSON API format.
app.use("/api", notFoundHandler);
app.use(errorHandler);

async function runMaintenance() {
  // Clean expired sessions.
  try {
    sessionStore.clearExpired();
  } catch (error) {
    console.error("Session cleanup failed:", error.message);
  }

  // Remove profile-photo files left behind by failed updates or process crashes.
  try {
    const deletedCount = cleanupOrphanedProfilePhotos();
    if (deletedCount > 0) {
      console.log(`Profile photo cleanup completed: ${deletedCount} orphaned files removed.`);
    }
  } catch (error) {
    console.error("Profile photo cleanup failed:", error.message);
  }

  // Backfill hashes for attachment records created before deduplication was enabled.
  try {
    const updatedCount = await backfillAttachmentContentHashes();
    if (updatedCount > 0) {
      console.log(`Attachment hash migration completed: ${updatedCount} records updated.`);
    }
  } catch (error) {
    console.error("Attachment hash backfill failed:", error.message);
  }

  // Permanently remove recipient associations for expired Trash items.
  try {
    const deletedCount = cleanupExpiredTrashService();

    if (deletedCount > 0) {
      console.log(
        `Trash cleanup completed: ${deletedCount} expired email associations removed.`,
      );
    }
  } catch (error) {
    console.error("Trash cleanup failed:", error.message);
  }
}

const cleanupTimer = setInterval(() => {
  runMaintenance().catch((error) => console.error("Maintenance task failed:", error));
}, 60 * 60 * 1000);

cleanupTimer.unref();

export { runMaintenance };

export default app;
