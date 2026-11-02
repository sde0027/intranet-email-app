import {
  sendEmailService,
  getInboxService,
  getSentService,
  createDraftService,
  getDraftsService,
  getDraftService,
  updateDraftService,
  deleteDraftService,
  markEmailReadService,
  getUnreadCountService,
  replyToEmailService,
  replyAllToEmailService,
  forwardEmailService,
  moveEmailToTrashService,
  getTrashService,
  restoreEmailService,
  permanentlyDeleteEmailService,
  EmailServiceError,
} from "./emails.service.js";

import {
  validateUploadedFiles,
  cleanupUploadedFiles,
} from "../attachments/attachments.service.js";

export async function sendEmail(req, res) {
  const files = req.files ?? [];

  try {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      cleanupUploadedFiles(files);

      return res.status(400).json({
        error: "A valid request body is required.",
      });
    }

    // Multipart form fields arrive as strings.
    // Parse recipient arrays while keeping JSON requests unchanged.
    function parseRecipientField(value) {
      if (typeof value !== "string") {
        return value;
      }

      try {
        return JSON.parse(value);
      } catch {
        throw new EmailServiceError(
          "Recipient fields must contain valid JSON arrays.",
          400,
          "INVALID_RECIPIENTS",
        );
      }
    }

    const to = parseRecipientField(req.body.to);
    const cc =
      req.body.cc === undefined ? [] : parseRecipientField(req.body.cc);
    const bcc =
      req.body.bcc === undefined ? [] : parseRecipientField(req.body.bcc);

    // Check actual file signatures before saving metadata.
    await validateUploadedFiles(files);

    const result = sendEmailService({
      senderId: req.user.id,
      to,
      cc,
      bcc,
      subject: req.body.subject ?? "",
      body: req.body.body ?? "",
      attachments: files,
    });

    return res.status(201).json({
      message: "Email sent successfully.",
      email: result,
      attachments: files.map((file) => ({
        original_name: file.originalname,
        mime_type: file.mimetype,
        size_bytes: file.size,
      })),
    });
  } catch (error) {
    // If sending or validation fails, remove the uploaded files.
    cleanupUploadedFiles(files);

    if (error instanceof EmailServiceError || (error.status && error.code)) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code,
      });
    }

    console.error("Email sending failed:", error);

    return res.status(500).json({
      error: "Unable to send email.",
    });
  }
}

export function getInbox(req, res) {
  try {
    const userId = req.user.id;

    const page = req.query.page ?? "1";
    const limit = req.query.limit ?? "20";

    // Validate pagination parameters.
    if (
      typeof page !== "string" ||
      typeof limit !== "string" ||
      !/^[1-9]\d*$/.test(page) ||
      !/^[1-9]\d*$/.test(limit)
    ) {
      return res.status(400).json({
        error: "Page and limit must be positive integers.",
      });
    }

    const pageNumber = Number(page);
    const pageSize = Number(limit);

    if (
      !Number.isSafeInteger(pageNumber) ||
      !Number.isSafeInteger(pageSize) ||
      pageSize > 100
    ) {
      return res.status(400).json({
        error: "Invalid pagination parameters. Maximum limit is 100.",
      });
    }

    const result = getInboxService({
      userId,
      page: pageNumber,
      limit: pageSize,
    });

    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof EmailServiceError) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code,
      });
    }

    console.error("Inbox retrieval failed:", error);

    return res.status(500).json({
      error: "Unable to retrieve inbox messages.",
    });
  }
}

export function getSent(req, res) {
  try {
    const userId = req.user.id;

    const page = req.query.page ?? "1";
    const limit = req.query.limit ?? "20";

    if (
      typeof page !== "string" ||
      typeof limit !== "string" ||
      !/^[1-9]\d*$/.test(page) ||
      !/^[1-9]\d*$/.test(limit)
    ) {
      return res.status(400).json({
        error: "Page and limit must be positive integers.",
      });
    }

    const pageNumber = Number(page);
    const pageSize = Number(limit);

    if (
      !Number.isSafeInteger(pageNumber) ||
      !Number.isSafeInteger(pageSize) ||
      pageSize > 100 ||
      !Number.isSafeInteger((pageNumber - 1) * pageSize)
    ) {
      return res.status(400).json({
        error: "Invalid pagination parameters. Maximum limit is 100.",
      });
    }

    const result = getSentService({
      userId,
      page: pageNumber,
      limit: pageSize,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Sent messages retrieval failed:", error);

    return res.status(500).json({
      error: "Unable to retrieve sent messages.",
    });
  }
}

function handleDraftError(error, res, operation) {
  if (error instanceof EmailServiceError) {
    return res.status(error.status).json({
      error: error.message,
      code: error.code,
    });
  }

  console.error(`${operation} failed:`, error);

  return res.status(500).json({
    error: `Unable to ${operation.toLowerCase()}.`,
  });
}

function parseDraftId(value) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) ? id : null;
}

function parsePagination(query) {
  const page = query.page ?? "1";
  const limit = query.limit ?? "20";

  if (
    typeof page !== "string" ||
    typeof limit !== "string" ||
    !/^[1-9]\d*$/.test(page) ||
    !/^[1-9]\d*$/.test(limit)
  ) {
    return null;
  }

  const pageNumber = Number(page);
  const pageSize = Number(limit);

  if (
    !Number.isSafeInteger(pageNumber) ||
    !Number.isSafeInteger(pageSize) ||
    pageSize > 100 ||
    !Number.isSafeInteger((pageNumber - 1) * pageSize)
  ) {
    return null;
  }

  return {
    page: pageNumber,
    limit: pageSize,
  };
}

export function createDraft(req, res) {
  try {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({
        error: "A valid JSON request body is required.",
      });
    }

    const result = createDraftService({
      senderId: req.user.id,
      subject: req.body.subject,
      body: req.body.body,
    });

    return res.status(201).json({
      message: "Draft saved successfully.",
      draft: result,
    });
  } catch (error) {
    return handleDraftError(error, res, "Create draft");
  }
}

export function getDrafts(req, res) {
  try {
    const pagination = parsePagination(req.query);

    if (!pagination) {
      return res.status(400).json({
        error: "Invalid pagination parameters. Maximum limit is 100.",
      });
    }

    const result = getDraftsService({
      senderId: req.user.id,
      ...pagination,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleDraftError(error, res, "Retrieve drafts");
  }
}

export function getDraft(req, res) {
  try {
    const draftId = parseDraftId(req.params.id);

    if (draftId === null) {
      return res.status(400).json({
        error: "Invalid draft ID.",
      });
    }

    const result = getDraftService({
      senderId: req.user.id,
      draftId,
    });

    return res.status(200).json({
      draft: result,
    });
  } catch (error) {
    return handleDraftError(error, res, "Retrieve draft");
  }
}

export function updateDraft(req, res) {
  try {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({
        error: "A valid JSON request body is required.",
      });
    }

    const draftId = parseDraftId(req.params.id);

    if (draftId === null) {
      return res.status(400).json({
        error: "Invalid draft ID.",
      });
    }

    const result = updateDraftService({
      senderId: req.user.id,
      draftId,
      subject: req.body.subject,
      body: req.body.body,
    });

    return res.status(200).json({
      message: "Draft updated successfully.",
      draft: result,
    });
  } catch (error) {
    return handleDraftError(error, res, "Update draft");
  }
}

export function deleteDraft(req, res) {
  try {
    const draftId = parseDraftId(req.params.id);

    if (draftId === null) {
      return res.status(400).json({
        error: "Invalid draft ID.",
      });
    }

    deleteDraftService({
      senderId: req.user.id,
      draftId,
    });

    return res.status(200).json({
      message: "Draft deleted successfully.",
    });
  } catch (error) {
    return handleDraftError(error, res, "Delete draft");
  }
}

function parseEmailId(value) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) ? id : null;
}

function updateReadStatus(req, res, isRead) {
  try {
    const emailId = parseEmailId(req.params.id);

    if (emailId === null) {
      return res.status(400).json({
        error: "Invalid email ID.",
      });
    }

    const result = markEmailReadService({
      emailId,
      recipientId: req.user.id,
      isRead,
    });

    return res.status(200).json({
      message: isRead ? "Email marked as read." : "Email marked as unread.",
      email: result,
    });
  } catch (error) {
    if (error instanceof EmailServiceError) {
      return res.status(error.status).json({
        error: error.message,
        code: error.code,
      });
    }

    console.error("Read status update failed:", error);

    return res.status(500).json({
      error: "Unable to update email read status.",
    });
  }
}

export function markAsRead(req, res) {
  return updateReadStatus(req, res, 1);
}

export function markAsUnread(req, res) {
  return updateReadStatus(req, res, 0);
}

export function getUnreadCount(req, res) {
  try {
    const result = getUnreadCountService({
      recipientId: req.user.id,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error("Unread count retrieval failed:", error);

    return res.status(500).json({
      error: "Unable to retrieve unread count.",
    });
  }
}

function handleEmailActionError(error, res, operation) {
  if (error instanceof EmailServiceError || (error.status && error.code)) {
    return res.status(error.status).json({
      error: error.message,
      code: error.code,
    });
  }

  console.error(`${operation} failed:`, error);

  return res.status(500).json({
    error: `Unable to ${operation.toLowerCase()}.`,
  });
}

function validateEmailActionRequest(req, res) {
  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    res.status(400).json({
      error: "A valid JSON request body is required.",
    });

    return false;
  }

  const emailId = parseEmailId(req.params.id);

  if (emailId === null) {
    res.status(400).json({
      error: "Invalid email ID.",
    });

    return false;
  }

  return emailId;
}

function parseMultipartRecipients(value, defaultValue) {
  if (value === undefined || value === "") {
    return defaultValue;
  }

  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new EmailServiceError(
      "Recipient fields must contain valid JSON arrays.",
      400,
      "INVALID_RECIPIENTS",
    );
  }
}

async function handleEmailWithAttachments(req, res, operation) {
  const files = req.files ?? [];

  try {
    const emailId = validateEmailActionRequest(req, res);

    if (emailId === false) {
      cleanupUploadedFiles(files);
      return;
    }

    await validateUploadedFiles(files);

    const result = await operation(emailId, files);

    return res.status(201).json({
      message: "Email sent successfully.",
      email: result,
      attachments: files.map((file) => ({
        original_name: file.originalname,
        mime_type: file.mimetype,
        size_bytes: file.size,
      })),
    });
  } catch (error) {
    cleanupUploadedFiles(files);
    return handleEmailActionError(error, res, "Send email");
  }
}

export async function replyToEmail(req, res) {
  return handleEmailWithAttachments(req, res, (emailId, attachments) =>
    replyToEmailService({
      emailId,
      senderId: req.user.id,
      body: req.body.body ?? "",
      attachments,
    }),
  );
}

export async function replyAllToEmail(req, res) {
  return handleEmailWithAttachments(req, res, (emailId, attachments) =>
    replyAllToEmailService({
      emailId,
      senderId: req.user.id,
      body: req.body.body ?? "",
      attachments,
    }),
  );
}

export async function forwardEmail(req, res) {
  return handleEmailWithAttachments(req, res, (emailId, attachments) => {
    const to = parseMultipartRecipients(req.body.to, undefined);
    const cc = parseMultipartRecipients(req.body.cc, []);
    const bcc = parseMultipartRecipients(req.body.bcc, []);

    return forwardEmailService({
      emailId,
      senderId: req.user.id,
      to,
      cc,
      bcc,
      body: req.body.body ?? "",
      attachments,
    });
  });
}

export function moveEmailToTrash(req, res) {
  try {
    const emailId = parseEmailId(req.params.id);

    if (emailId === null) {
      return res.status(400).json({ error: "Invalid email ID." });
    }

    const result = moveEmailToTrashService({
      emailId,
      recipientId: req.user.id,
    });

    return res.status(200).json({
      message: "Email moved to Trash.",
      email: result,
    });
  } catch (error) {
    return handleEmailActionError(error, res, "Move email to Trash");
  }
}

export function getTrash(req, res) {
  try {
    const pagination = parsePagination(req.query);

    if (!pagination) {
      return res.status(400).json({
        error: "Invalid pagination parameters. Maximum limit is 100.",
      });
    }

    const result = getTrashService({
      userId: req.user.id,
      ...pagination,
    });

    return res.status(200).json(result);
  } catch (error) {
    return handleEmailActionError(error, res, "Retrieve Trash");
  }
}

export function restoreEmail(req, res) {
  try {
    const emailId = parseEmailId(req.params.id);

    if (emailId === null) {
      return res.status(400).json({ error: "Invalid email ID." });
    }

    const result = restoreEmailService({
      emailId,
      recipientId: req.user.id,
    });

    return res.status(200).json({
      message: "Email restored to Inbox.",
      email: result,
    });
  } catch (error) {
    return handleEmailActionError(error, res, "Restore email");
  }
}

export function permanentlyDeleteEmail(req, res) {
  try {
    const emailId = parseEmailId(req.params.id);

    if (emailId === null) {
      return res.status(400).json({ error: "Invalid email ID." });
    }

    permanentlyDeleteEmailService({
      emailId,
      recipientId: req.user.id,
    });

    return res.status(200).json({
      message: "Email permanently deleted from your Trash.",
    });
  } catch (error) {
    return handleEmailActionError(error, res, "Permanently delete email");
  }
}
