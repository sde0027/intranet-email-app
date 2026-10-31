import { db } from "../../database/connection.js";

export class EmailServiceError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = "EmailServiceError";
    this.status = status;
    this.code = code;
  }
}

function validateRecipients(to, cc, bcc) {
  const groups = [
    { type: "TO", ids: to },
    { type: "CC", ids: cc },
    { type: "BCC", ids: bcc },
  ];

  for (const group of groups) {
    if (!Array.isArray(group.ids)) {
      throw new EmailServiceError(
        `${group.type} recipients must be an array.`,
        400,
        "INVALID_RECIPIENTS",
      );
    }

    for (const id of group.ids) {
      if (!Number.isSafeInteger(id) || id <= 0) {
        throw new EmailServiceError(
          "Recipient IDs must be positive integers.",
          400,
          "INVALID_RECIPIENT_ID",
        );
      }
    }
  }

  if (to.length === 0) {
    throw new EmailServiceError(
      "At least one TO recipient is required.",
      400,
      "TO_RECIPIENT_REQUIRED",
    );
  }

  const allIds = groups.flatMap((group) => group.ids);

  if (new Set(allIds).size !== allIds.length) {
    throw new EmailServiceError(
      "Duplicate recipients are not allowed.",
      400,
      "DUPLICATE_RECIPIENTS",
    );
  }

  return groups;
}

function validateMessage(subject, body) {
  if (typeof subject !== "string" || typeof body !== "string") {
    throw new EmailServiceError(
      "Subject and body must be strings.",
      400,
      "INVALID_MESSAGE",
    );
  }
}

export function sendEmailService({
  senderId,
  to,
  cc = [],
  bcc = [],
  subject = "",
  body = "",
}) {
  // 1. Validate message data.
  validateMessage(subject, body);

  // 2. Validate recipient data.
  const groups = validateRecipients(to, cc, bcc);

  // 3. Collect unique recipient IDs.
  const recipientIds = groups.flatMap((group) => group.ids);

  // 4. Verify that every recipient exists and is active.
  const placeholders = recipientIds.map(() => "?").join(", ");

  const activeRecipients = db
    .prepare(
      `
      SELECT id
      FROM users
      WHERE id IN (${placeholders})
      AND is_active = 1
    `,
    )
    .all(...recipientIds);

  if (activeRecipients.length !== recipientIds.length) {
    throw new EmailServiceError(
      "One or more recipients do not exist or are inactive.",
      400,
      "INVALID_RECIPIENT",
    );
  }

  // 5. Prepare database statements.
  const insertEmail = db.prepare(`
    INSERT INTO emails (
      sender_id,
      subject,
      body,
      status
    )
    VALUES (?, ?, ?, 'DRAFT')
  `);

  const insertRecipient = db.prepare(`
    INSERT INTO email_recipients (
      email_id,
      recipient_id,
      recipient_type
    )
    VALUES (?, ?, ?)
  `);

  const markAsSent = db.prepare(`
    UPDATE emails
    SET
      status = 'SENT',
      sent_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ?
  `);

  const getSentEmail = db.prepare(`
    SELECT id, sender_id, subject, status, created_at, sent_at
    FROM emails
    WHERE id = ?
  `);

  // 6. Execute all writes inside one transaction.
  const sendTransaction = db.transaction(() => {
    const emailResult = insertEmail.run(senderId, subject, body);

    const emailId = Number(emailResult.lastInsertRowid);

    for (const group of groups) {
      for (const recipientId of group.ids) {
        insertRecipient.run(emailId, recipientId, group.type);
      }
    }

    markAsSent.run(emailId);

    return getSentEmail.get(emailId);
  });

  return sendTransaction();
}

export function getInboxService({ userId, page, limit }) {
  const offset = (page - 1) * limit;

  // Retrieve the total number of inbox messages.
  const countInbox = db.prepare(`
    SELECT COUNT(*) AS total
    FROM email_recipients er
    INNER JOIN emails e
      ON e.id = er.email_id
    WHERE er.recipient_id = ?
      AND er.is_deleted = 0
      AND e.status = 'SENT'
  `);

  // Retrieve the current page of inbox messages.
  const getInbox = db.prepare(`
    SELECT
      e.id,
      e.subject,
      e.body,
      e.sent_at,

      sender.id AS sender_id,
      sender.name AS sender_name,
      sender.email AS sender_email,

      er.recipient_type,
      er.is_read

    FROM email_recipients er

    INNER JOIN emails e
      ON e.id = er.email_id

    INNER JOIN users sender
      ON sender.id = e.sender_id

    WHERE er.recipient_id = ?
      AND er.is_deleted = 0
      AND e.status = 'SENT'

    ORDER BY e.sent_at DESC, e.id DESC

    LIMIT ? OFFSET ?
  `);

  const total = countInbox.get(userId).total;

  const messages = getInbox.all(userId, limit, offset);

  return {
    messages,

    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
}
