import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { config } from "../config/config.js";

fs.mkdirSync(config.database.directory, { recursive: true });

const databasePath = path.join(
  config.database.directory,
  config.database.filename,
);

export const db = new Database(databasePath);

// Enforce relationships between database records.
db.pragma("foreign_keys = ON");

// Wait briefly if another operation holds a database lock.
db.pragma("busy_timeout = 5000");

// Enable write-ahead logging for better reader/writer concurrency.
db.pragma("journal_mode = WAL");
