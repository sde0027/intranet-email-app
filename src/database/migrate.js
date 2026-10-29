import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./connection.js";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);
const migrationsDirectory = path.join(currentDirectory, "migrations");

// Track migrations that have already been applied.
db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL DEFAULT (
            strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        )
    );
`);

const migrationFiles = fs
  .readdirSync(migrationsDirectory)
  .filter((filename) => filename.endsWith(".sql"))
  .sort();

for (const filename of migrationFiles) {
  const alreadyApplied = db
    .prepare("SELECT 1 FROM schema_migrations WHERE filename = ?")
    .get(filename);

  if (alreadyApplied) {
    console.log(`Migration already applied: ${filename}`);
    continue;
  }

  const migrationPath = path.join(migrationsDirectory, filename);
  const sql = fs.readFileSync(migrationPath, "utf8");

  // Apply the schema and record the migration atomically.
  const applyMigration = db.transaction(() => {
    db.exec(sql);

    db.prepare("INSERT INTO schema_migrations (filename) VALUES (?)").run(
      filename,
    );
  });

  applyMigration();

  console.log(`Migration applied: ${filename}`);
}

console.log("Database migrations complete.");
