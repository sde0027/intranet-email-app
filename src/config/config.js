import path from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDirectory = path.dirname(currentFile);

// Project root: intranet-email-app/
export const PROJECT_ROOT = path.resolve(currentDirectory, "../../");

export const config = {
  port: Number(process.env.PORT) || 3000,

  database: {
    directory: path.join(PROJECT_ROOT, "data"),
    filename: "intranet-email.sqlite",
  },
};
