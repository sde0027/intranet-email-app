import { sendEmailService, EmailServiceError } from "./emails.service.js";

export function sendEmail(req, res) {
  try {
    const senderId = req.user.id;

    if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
      return res.status(400).json({
        error: "A valid JSON request body is required.",
      });
    }

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
