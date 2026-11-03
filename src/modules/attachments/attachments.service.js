import fs from "node:fs";
import { fileTypeFromFile } from "file-type";
import path from "node:path";
import yauzl from "yauzl";
import { TextDecoder } from "node:util";

import { db } from "../../database/connection.js";
import { attachmentDirectory, allowedTypes } from "./attachments.storage.js";

export class AttachmentServiceError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "AttachmentServiceError";
    this.status = status;
    this.code = code;
  }
}

const textExtensions = new Set([".txt", ".csv"]);

const officeRequiredEntries = {
  ".docx": ["[Content_Types].xml", "word/document.xml"],
  ".xlsx": ["[Content_Types].xml", "xl/workbook.xml"],
  ".pptx": ["[Content_Types].xml", "ppt/presentation.xml"],
};

// Validate UTF-8 text files.
// TXT and CSV do not have reliable magic signatures.
function validateTextFile(filePath) {
  const buffer = fs.readFileSync(filePath);

  try {
    const decoder = new TextDecoder("utf-8", { fatal: true });
    const content = decoder.decode(buffer);

    // Reject binary data disguised as text.
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(content)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// Check that a ZIP archive contains the required Office package entries.
// We inspect archive metadata without extracting its contents.
function validateOfficeArchive(filePath, extension) {
  const requiredEntries = officeRequiredEntries[extension];

  return new Promise((resolve) => {
    yauzl.open(
      filePath,
      {
        lazyEntries: true,
        autoClose: true,
        validateEntrySizes: true,
        strictFileNames: true,
      },
      (error, zipFile) => {
        if (error || !zipFile) {
          return resolve(false);
        }

        const foundEntries = new Set();
        let entryCount = 0;
        let settled = false;

        function finish(result) {
          if (settled) return;

          settled = true;
          resolve(result);
        }

        zipFile.on("error", () => {
          finish(false);
        });

        zipFile.on("end", () => {
          finish(requiredEntries.every((entry) => foundEntries.has(entry)));
        });

        zipFile.on("entry", (entry) => {
          entryCount++;

          if (entryCount > 10000) {
            finish(false);
            zipFile.close();
            return;
          }

          foundEntries.add(entry.fileName);
          zipFile.readEntry();
        });

        zipFile.readEntry();
      },
    );
  });
}

// Check that a ZIP archive contains the required Office package entries.
// We inspect archive metadata without extracting its contents.
export async function validateUploadedFiles(files = []) {
  for (const file of files) {
    const extension = path.extname(file.originalname).toLowerCase();

    const expectedMime = allowedTypes[extension];

    // 1. Validate extension and client-provided MIME type.
    if (!expectedMime || expectedMime !== file.mimetype) {
      throw new AttachmentServiceError(
        `Unsupported or invalid file: ${file.originalname}`,
        400,
        "INVALID_ATTACHMENT_TYPE",
      );
    }

    // 2. TXT and CSV require content validation instead of magic signatures.
    if (textExtensions.has(extension)) {
      if (!validateTextFile(file.path)) {
        throw new AttachmentServiceError(
          `Invalid text file: ${file.originalname}`,
          400,
          "INVALID_ATTACHMENT_TYPE",
        );
      }

      continue;
    }

    // 3. Detect the actual file type using its binary signature.
    const detectedType = await fileTypeFromFile(file.path);

    if (!detectedType || detectedType.mime !== expectedMime) {
      throw new AttachmentServiceError(
        `File signature does not match its declared type: ${file.originalname}`,
        400,
        "INVALID_ATTACHMENT_TYPE",
      );
    }

    // 4. Office documents need an additional structural validation.
    if (officeRequiredEntries[extension]) {
      const isValidOfficeDocument = await validateOfficeArchive(
        file.path,
        extension,
      );

      if (!isValidOfficeDocument) {
        throw new AttachmentServiceError(
          `Invalid Office document: ${file.originalname}`,
          400,
          "INVALID_ATTACHMENT_TYPE",
        );
      }
    }
  }
}

// Called inside the email sending database transaction.
export function insertAttachmentMetadata(emailId, files = []) {
  const insert = db.prepare(`
    INSERT INTO attachments (
      email_id,
      original_name,
      storage_name,
      mime_type,
      size_bytes
    )
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const file of files) {
    insert.run(
      emailId,
      file.originalname
        .replace(/\\/g, "/")
        .split("/")
        .pop()
        .replace(/[\u0000-\u001f\u007f]/g, "")
        .slice(0, 255) || "attachment",
      file.filename,
      file.mimetype,
      file.size,
    );
  }
}

// Retrieve attachments only when the user can access the email.
export function getEmailAttachmentsService({ emailId, userId }) {
  const attachments = db
    .prepare(
      `
    SELECT
      a.id,
      a.original_name,
      a.mime_type,
      a.size_bytes,
      a.created_at
    FROM attachments a
    INNER JOIN emails e
      ON e.id = a.email_id
    WHERE e.id = ?
      AND e.status = 'SENT'
      AND (
        e.sender_id = ?
        OR EXISTS (
          SELECT 1
          FROM email_recipients er
          WHERE er.email_id = e.id
            AND er.recipient_id = ?
        )
      )
    ORDER BY a.id
  `,
    )
    .all(emailId, userId, userId);

  // Distinguish an inaccessible/nonexistent email from an email with no files.
  const accessibleEmail = db
    .prepare(
      `
    SELECT 1
    FROM emails e
    WHERE e.id = ?
      AND e.status = 'SENT'
      AND (
        e.sender_id = ?
        OR EXISTS (
          SELECT 1
          FROM email_recipients er
          WHERE er.email_id = e.id
            AND er.recipient_id = ?
        )
      )
  `,
    )
    .get(emailId, userId, userId);

  if (!accessibleEmail) {
    throw new AttachmentServiceError(
      "Email not found.",
      404,
      "EMAIL_NOT_FOUND",
    );
  }

  return attachments;
}

// Retrieve a download only if the user can access its parent email.
export function getAttachmentDownloadService({ attachmentId, userId }) {
  const attachment = db
    .prepare(
      `
    SELECT
      a.id,
      a.original_name,
      a.mime_type,
      a.size_bytes,
      a.storage_name
    FROM attachments a
    INNER JOIN emails e
      ON e.id = a.email_id
    WHERE a.id = ?
      AND e.status = 'SENT'
      AND (
        e.sender_id = ?
        OR EXISTS (
          SELECT 1
          FROM email_recipients er
          WHERE er.email_id = e.id
            AND er.recipient_id = ?
        )
      )
  `,
    )
    .get(attachmentId, userId, userId);

  if (!attachment) {
    throw new AttachmentServiceError(
      "Attachment not found.",
      404,
      "ATTACHMENT_NOT_FOUND",
    );
  }

  // storage_name is generated by the server, never supplied by the user.
  const filePath = path.join(attachmentDirectory, attachment.storage_name);

  if (!fs.existsSync(filePath)) {
    throw new AttachmentServiceError(
      "Attachment file is missing from storage.",
      404,
      "ATTACHMENT_FILE_MISSING",
    );
  }

  return {
    ...attachment,
    filePath,
  };
}

// Remove uploaded files if the corresponding email transaction fails.
export function cleanupUploadedFiles(files = []) {
  for (const file of files) {
    try {
      fs.unlinkSync(file.path);
    } catch {
      // Cleanup is best-effort.
    }
  }
}
