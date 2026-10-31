import express from "express";
import { db } from "./database/connection.js";
import "dotenv/config";
// session imports
import session from "express-session";
import { SQLiteSessionStore } from "./middleware/sqlite-session-store.js";

// Route imports
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";

// Auth imports
import { authenticate } from "./middleware/authenticate.js";
import { authorize } from "./middleware/authorize.js";
if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET is missing from .env");
}

const sessionStore = new SQLiteSessionStore();

const sessionMiddleware = session({
  name: "intranet.sid",
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: false, // Change to true when HTTPS is configured.
    sameSite: "lax",
    maxAge: 8 * 60 * 60 * 1000,
  },
});

const app = express();
// Parse incoming request message bodies
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
// middleware
app.use(sessionMiddleware);
app.use("/api/auth", authRoutes);
app.use("/api/employees", authenticate, authorize("ADMIN"), usersRoutes);

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

const cleanupTimer = setInterval(
  () => {
    try {
      sessionStore.clearExpired();
    } catch (error) {
      console.error("Session cleanup failed:", error.message);
    }
  },
  60 * 60 * 1000,
);

cleanupTimer.unref();

export default app;
