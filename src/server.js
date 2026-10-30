import app from "./app.js";
import { config } from "./config/config.js";
import { db } from "./database/connection.js";
import "./database/migrate.js";

const server = app.listen(config.port, "0.0.0.0", () => {
  console.log(`Server running on port ${config.port}`);
  console.log(`Health check: http://localhost:${config.port}/api/health`);
});

function shutdown() {
  console.log("Shutting down server...");

  server.close(() => {
    db.close();
    console.log("Database connection closed.");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("Graceful shutdown timed out.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
