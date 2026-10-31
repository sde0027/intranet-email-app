import {
  sendEmailService,
  getInboxService,
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
