import express from "express";
import { db } from "./database/connection.js";
const app = express();

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

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

export default app;
