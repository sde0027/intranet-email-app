import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import multer from "multer";
import { config } from "../../config/config.js";

export const attachmentDirectory = path.join(
  config.database.directory,
  "attachments",
);

fs.mkdirSync(attachmentDirectory, { recursive: true });

const allowedTypes = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, attachmentDirectory);
  },

  filename: (req, file, callback) => {
    // Never use a user-provided filename as a storage path.
    callback(null, randomUUID());
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 30 * 1024 * 1024, // 30 MB per file
    files: 5,
  },

  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    if (allowedTypes[extension] !== file.mimetype) {
      return callback(new Error("Unsupported file extension or MIME type."));
    }

    callback(null, true);
  },
});

export function uploadAttachments(req, res, next) {
  upload.array("attachments", 5)(req, res, (error) => {
    if (!error) {
      return next();
    }

    // Remove any files Multer managed to save before encountering an error.
    for (const file of req.files ?? []) {
      try {
        fs.unlinkSync(file.path);
      } catch {
        // Cleanup is best-effort.
      }
    }

    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        error: "Each attachment must be 30 MB or smaller.",
      });
    }

    if (
      error.code === "LIMIT_FILE_COUNT" ||
      error.code === "LIMIT_UNEXPECTED_FILE"
    ) {
      return res.status(400).json({
        error: "Maximum of 5 attachments is allowed.",
      });
    }

    return res.status(400).json({
      error: error.message || "Invalid attachment upload.",
    });
  });
}
