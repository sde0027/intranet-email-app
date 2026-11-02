import {
  sendEmailService,
  getInboxService,
  getSentService,
  createDraftService,
  getDraftsService,
  getDraftService,
  updateDraftService,
  deleteDraftService,
  EmailServiceError,
} from "./emails.service.js";

export function sendEmail(req, res) {
  try {
    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({
        error: "A valid JSON request body is required.",
      });
    }

    const senderId = req.user.id;

    const { to, cc, bcc, subject, body } = req.body;

    const result = sendEmailService({
      senderId,
      to,
      cc,
      bcc,
      subject,
      body,
    });

    return res.status(201).json({
      message: "Email sent successfully.",
      email: result,
    });
  } catch (error) {
    if (error instanceof EmailServiceError) {
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
