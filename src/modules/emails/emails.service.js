import {
  insertAttachmentMetadata,
  getEmailAttachmentsService,
} from "../attachments/attachments.service.js";
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
  parentEmailId = null,
  attachments = [],
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
      status,
      parent_email_id
    )
    VALUES (?, ?, ?, 'DRAFT',?)
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
    SELECT id, sender_id, subject, status, parent_email_id, created_at, sent_at
    FROM emails
    WHERE id = ?
  `);

  // 6. Execute all writes inside one transaction.
  const sendTransaction = db.transaction(() => {
    const emailResult = insertEmail.run(senderId, subject, body, parentEmailId);

    const emailId = Number(emailResult.lastInsertRowid);

    for (const group of groups) {
      for (const recipientId of group.ids) {
        insertRecipient.run(emailId, recipientId, group.type);
      }
    }
    insertAttachmentMetadata(emailId, attachments);

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

export function getSentService({ userId, page, limit }) {
  const offset = (page - 1) * limit;

  // Count all sent messages belonging to this sender.
  const countSent = db.prepare(`
    SELECT COUNT(*) AS total
    FROM emails
    WHERE sender_id = ?
      AND status = 'SENT'
  `);

  // Retrieve the current page of sent messages.
  const getSent = db.prepare(`
    SELECT
      id,
      subject,
      body,
      created_at,
      sent_at
    FROM emails
    WHERE sender_id = ?
      AND status = 'SENT'
    ORDER BY sent_at DESC, id DESC
    LIMIT ? OFFSET ?
  `);

  const total = countSent.get(userId).total;

  const messages = getSent.all(userId, limit, offset);

  // If the page is empty, there are no recipient records to retrieve.
  if (messages.length === 0) {
    return {
      messages: [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: false,
        hasPreviousPage: page > 1,
      },
    };
  }

  // Retrieve recipients for only the messages on this page.
  const emailIds = messages.map((message) => message.id);
  const placeholders = emailIds.map(() => "?").join(", ");

  const getRecipients = db.prepare(`
    SELECT
      er.email_id,
      er.recipient_type,
      u.id AS recipient_id,
      u.name AS recipient_name,
      u.email AS recipient_email
    FROM email_recipients er
    INNER JOIN users u
      ON u.id = er.recipient_id
    WHERE er.email_id IN (${placeholders})
    ORDER BY
      CASE er.recipient_type
        WHEN 'TO' THEN 1
        WHEN 'CC' THEN 2
        WHEN 'BCC' THEN 3
      END,
      u.name
  `);

  const recipients = getRecipients.all(...emailIds);

  // Prepare a recipient collection for each message.
  const recipientMap = new Map(
    emailIds.map((id) => [
      id,
      {
        to: [],
        cc: [],
        bcc: [],
      },
    ]),
  );

  for (const recipient of recipients) {
    const groups = recipientMap.get(recipient.email_id);

    const recipientDetails = {
      id: recipient.recipient_id,
      name: recipient.recipient_name,
      email: recipient.recipient_email,
    };

    const groupName = recipient.recipient_type.toLowerCase();

    groups[groupName].push(recipientDetails);
  }

  // Attach the recipient collections to their messages.
  const messagesWithRecipients = messages.map((message) => ({
    ...message,
    recipients: recipientMap.get(message.id),
  }));

  return {
    messages: messagesWithRecipients,

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

// Shared query for retrieving a draft owned by a specific employee.
const findDraft = db.prepare(`
  SELECT
    id,
    sender_id,
    subject,
    body,
    status,
    created_at
  FROM emails
  WHERE id = ?
    AND sender_id = ?
    AND status = 'DRAFT'
`);

// Retrieve one sent email if the current user is its sender or recipient.
export function getEmailByIdService({ emailId, userId }) {
  // 1. Verify that the email exists and the user has access.
  const email = db
    .prepare(
      `
    SELECT
      e.id,
      e.sender_id,
      e.subject,
      e.body,
      e.status,
      e.parent_email_id,
      e.created_at,
      e.sent_at,

      sender.name AS sender_name,
      sender.email AS sender_email

    FROM emails e

    INNER JOIN users sender
      ON sender.id = e.sender_id

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

  if (!email) {
    throw new EmailServiceError("Email not found.", 404, "EMAIL_NOT_FOUND");
  }

  // 2. Determine whether the current user is the sender.
  const isSender = email.sender_id === userId;

  // 3. Retrieve the current user's recipient-specific information.
  const userRecipient = isSender
    ? null
    : db
        .prepare(
          `
        SELECT recipient_type, is_read
        FROM email_recipients
        WHERE email_id = ?
          AND recipient_id = ?
      `,
        )
        .get(emailId, userId);

  // 4. Retrieve recipients.
  // The sender can see everyone, including BCC recipients.
  // Other recipients can see TO and CC, but never the BCC list.
  const recipients = db
    .prepare(
      `
    SELECT
      er.recipient_type,
      u.id AS recipient_id,
      u.name AS recipient_name,
      u.email AS recipient_email

    FROM email_recipients er

    INNER JOIN users u
      ON u.id = er.recipient_id

    WHERE er.email_id = ?
      AND (
        ? = 1
        OR er.recipient_type IN ('TO', 'CC')
      )

    ORDER BY
      CASE er.recipient_type
        WHEN 'TO' THEN 1
        WHEN 'CC' THEN 2
        WHEN 'BCC' THEN 3
      END,
      u.name
  `,
    )
    .all(emailId, isSender ? 1 : 0);

  // 5. Organize recipients into TO, CC and BCC groups.
  const recipientGroups = {
    to: [],
    cc: [],
    bcc: [],
  };

  for (const recipient of recipients) {
    const group = recipient.recipient_type.toLowerCase();

    recipientGroups[group].push({
      id: recipient.recipient_id,
      name: recipient.recipient_name,
      email: recipient.recipient_email,
    });
  }

  // 6. Retrieve attachment metadata.
  const attachments = getEmailAttachmentsService({
    emailId,
    userId,
  });

  // 7. Return the complete email.
  return {
    id: email.id,
    subject: email.subject,
    body: email.body,
    status: email.status,
    parent_email_id: email.parent_email_id,
    created_at: email.created_at,
    sent_at: email.sent_at,

    sender: {
      id: email.sender_id,
      name: email.sender_name,
      email: email.sender_email,
    },

    recipients: recipientGroups,

    is_sender: isSender,
    recipient_type: userRecipient?.recipient_type ?? null,
    is_read: userRecipient?.is_read ?? null,

    attachments,
  };
}

// Create a new draft.
export function createDraftService({ senderId, subject = "", body = "" }) {
  if (typeof subject !== "string" || typeof body !== "string") {
    throw new EmailServiceError(
      "Subject and body must be strings.",
      400,
      "INVALID_DRAFT",
    );
  }

  const insertDraft = db.prepare(`
    INSERT INTO emails (
      sender_id,
      subject,
      body,
      status
    )
    VALUES (?, ?, ?, 'DRAFT')
  `);

  const result = insertDraft.run(senderId, subject, body);

  return findDraft.get(Number(result.lastInsertRowid), senderId);
}

// Retrieve all drafts belonging to an employee.
export function getDraftsService({ senderId, page, limit }) {
  const offset = (page - 1) * limit;

  const countDrafts = db.prepare(`
    SELECT COUNT(*) AS total
    FROM emails
    WHERE sender_id = ?
      AND status = 'DRAFT'
  `);

  const getDrafts = db.prepare(`
    SELECT
      id,
      subject,
      body,
      created_at
    FROM emails
    WHERE sender_id = ?
      AND status = 'DRAFT'
    ORDER BY created_at DESC, id DESC
    LIMIT ? OFFSET ?
  `);

  const total = countDrafts.get(senderId).total;

  const drafts = getDrafts.all(senderId, limit, offset);

  return {
    drafts,

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

// Retrieve one draft.
export function getDraftService({ senderId, draftId }) {
  const draft = findDraft.get(draftId, senderId);

  if (!draft) {
    throw new EmailServiceError("Draft not found.", 404, "DRAFT_NOT_FOUND");
  }

  return draft;
}

// Update an existing draft.
export function updateDraftService({ senderId, draftId, subject, body }) {
  const hasSubject = subject !== undefined;
  const hasBody = body !== undefined;

  if (!hasSubject && !hasBody) {
    throw new EmailServiceError(
      "Provide at least one field to update.",
      400,
      "EMPTY_UPDATE",
    );
  }

  if (
    (hasSubject && typeof subject !== "string") ||
    (hasBody && typeof body !== "string")
  ) {
    throw new EmailServiceError(
      "Subject and body must be strings.",
      400,
      "INVALID_DRAFT",
    );
  }

  const assignments = [];
  const values = [];

  if (hasSubject) {
    assignments.push("subject = ?");
    values.push(subject);
  }

  if (hasBody) {
    assignments.push("body = ?");
    values.push(body);
  }

  const updateDraft = db.prepare(`
    UPDATE emails
    SET ${assignments.join(", ")}
    WHERE id = ?
      AND sender_id = ?
      AND status = 'DRAFT'
  `);

  const result = updateDraft.run(...values, draftId, senderId);

  if (result.changes === 0) {
    throw new EmailServiceError("Draft not found.", 404, "DRAFT_NOT_FOUND");
  }

  return findDraft.get(draftId, senderId);
}

// Delete a draft.
export function deleteDraftService({ senderId, draftId }) {
  const deleteDraft = db.prepare(`
    DELETE FROM emails
    WHERE id = ?
      AND sender_id = ?
      AND status = 'DRAFT'
  `);

  const result = deleteDraft.run(draftId, senderId);

  if (result.changes === 0) {
    throw new EmailServiceError("Draft not found.", 404, "DRAFT_NOT_FOUND");
  }

  return true;
}

// Mark an email as read or unread for a specific recipient.
export function markEmailReadService({ emailId, recipientId, isRead }) {
  const updateReadStatus = db.prepare(`
    UPDATE email_recipients
    SET is_read = ?
    WHERE email_id = ?
      AND recipient_id = ?
      AND is_deleted = 0
      AND EXISTS (
        SELECT 1
        FROM emails
        WHERE emails.id = email_recipients.email_id
          AND emails.status = 'SENT'
      )
  `);

  const result = updateReadStatus.run(isRead, emailId, recipientId);

  if (result.changes === 0) {
    throw new EmailServiceError(
      "Email not found in your inbox.",
      404,
      "EMAIL_NOT_FOUND",
    );
  }

  return {
    id: emailId,
    is_read: isRead,
  };
}

// Retrieve the unread message count for the current recipient.
export function getUnreadCountService({ recipientId }) {
  const getCount = db.prepare(`
    SELECT COUNT(*) AS unread_count
    FROM email_recipients er
    INNER JOIN emails e
      ON e.id = er.email_id
    WHERE er.recipient_id = ?
      AND er.is_read = 0
      AND er.is_deleted = 0
      AND e.status = 'SENT'
  `);

  const result = getCount.get(recipientId);

  return {
    unreadCount: result.unread_count,
  };
}

// Retrieve an original email only if the current user received it.
function getReplySource(emailId, userId) {
  const source = db
    .prepare(
      `
    SELECT
      e.id,
      e.sender_id,
      e.subject,
      e.body,
      e.sent_at
    FROM emails e
    INNER JOIN email_recipients er
      ON er.email_id = e.id
    WHERE e.id = ?
      AND er.recipient_id = ?
      AND er.is_deleted = 0
      AND e.status = 'SENT'
  `,
    )
    .get(emailId, userId);

  if (!source) {
    throw new EmailServiceError(
      "Email not found in your inbox.",
      404,
      "EMAIL_NOT_FOUND",
    );
  }

  return source;
}

// Retrieve an original email that the user either sent or received.
function getForwardSource(emailId, userId) {
  const source = db
    .prepare(
      `
    SELECT
      e.id,
      e.sender_id,
      e.subject,
      e.body,
      e.sent_at,
      u.name AS sender_name,
      u.email AS sender_email
    FROM emails e
    INNER JOIN users u
      ON u.id = e.sender_id
    WHERE e.id = ?
      AND e.status = 'SENT'
      AND (
        e.sender_id = ?
        OR EXISTS (
          SELECT 1
          FROM email_recipients er
          WHERE er.email_id = e.id
            AND er.recipient_id = ?
            AND er.is_deleted = 0
        )
      )
  `,
    )
    .get(emailId, userId, userId);

  if (!source) {
    throw new EmailServiceError("Email not found.", 404, "EMAIL_NOT_FOUND");
  }

  return source;
}

// Avoid repeatedly adding prefixes.
function addSubjectPrefix(prefix, subject) {
  const normalizedSubject = subject.trim();

  if (!normalizedSubject) {
    return `${prefix}: (no subject)`;
  }

  const pattern = new RegExp(`^${prefix}\\s*:`, "i");

  if (pattern.test(normalizedSubject)) {
    return normalizedSubject;
  }

  return `${prefix}: ${normalizedSubject}`;
}

// Reply only to the original sender.
export function replyToEmailService({
  emailId,
  senderId,
  body,
  attachments = [],
}) {
  const original = getReplySource(emailId, senderId);

  return sendEmailService({
    senderId,
    to: [original.sender_id],
    cc: [],
    bcc: [],
    subject: addSubjectPrefix("Re", original.subject),
    body,
    parentEmailId: original.id,
    attachments,
  });
}

// Reply to the original sender and visible TO/CC recipients.
export function replyAllToEmailService({
  emailId,
  senderId,
  body,
  attachments = [],
}) {
  const original = getReplySource(emailId, senderId);

  const originalRecipients = db
    .prepare(
      `
      SELECT recipient_id, recipient_type
      FROM email_recipients
      WHERE email_id = ?
        AND recipient_type IN ('TO', 'CC')
    `,
    )
    .all(original.id);

  const to = [];
  const cc = [];

  if (original.sender_id !== senderId) {
    to.push(original.sender_id);
  }

  for (const recipient of originalRecipients) {
    const recipientId = recipient.recipient_id;

    if (recipientId === senderId) continue;

    if (to.includes(recipientId) || cc.includes(recipientId)) {
      continue;
    }

    if (recipient.recipient_type === "TO") {
      to.push(recipientId);
    } else {
      cc.push(recipientId);
    }
  }

  if (to.length === 0) {
    throw new EmailServiceError(
      "There are no valid recipients for this reply.",
      400,
      "NO_REPLY_RECIPIENTS",
    );
  }

  return sendEmailService({
    senderId,
    to,
    cc,
    bcc: [],
    subject: addSubjectPrefix("Re", original.subject),
    body,
    parentEmailId: original.id,
    attachments,
  });
}

// Forward an existing email to new recipients.
export function forwardEmailService({
  emailId,
  senderId,
  to,
  cc = [],
  bcc = [],
  body = "",
  attachments = [],
}) {
  const original = getForwardSource(emailId, senderId);

  if (typeof body !== "string") {
    throw new EmailServiceError(
      "Message body must be a string.",
      400,
      "INVALID_MESSAGE",
    );
  }

  const forwardedBody = [
    body,
    "",
    "---------- Forwarded message ----------",
    `From: ${original.sender_name} <${original.sender_email}>`,
    `Date: ${original.sent_at}`,
    `Subject: ${original.subject || "(no subject)"}`,
    "",
    original.body,
  ].join("\n");

  return sendEmailService({
    senderId,
    to,
    cc,
    bcc,
    subject: addSubjectPrefix("Fwd", original.subject),
    body: forwardedBody,
    parentEmailId: original.id,
    attachments,
  });
}

const TRASH_RETENTION_DAYS = 30;

// Move one recipient's copy of an email into Trash.
export function moveEmailToTrashService({ emailId, recipientId }) {
  const result = db
    .prepare(
      `
    UPDATE email_recipients
    SET
      is_deleted = 1,
      deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE email_id = ?
      AND recipient_id = ?
      AND is_deleted = 0
      AND EXISTS (
        SELECT 1
        FROM emails
        WHERE emails.id = email_recipients.email_id
          AND emails.status = 'SENT'
      )
  `,
    )
    .run(emailId, recipientId);

  if (result.changes === 0) {
    throw new EmailServiceError(
      "Email not found in your inbox.",
      404,
      "EMAIL_NOT_FOUND",
    );
  }

  return { id: emailId, is_deleted: 1 };
}

// Retrieve the current user's Trash with pagination.
export function getTrashService({ userId, page, limit }) {
  const offset = (page - 1) * limit;

  const countTrash = db.prepare(`
    SELECT COUNT(*) AS total
    FROM email_recipients er
    INNER JOIN emails e ON e.id = er.email_id
    WHERE er.recipient_id = ?
      AND er.is_deleted = 1
      AND e.status = 'SENT'
  `);

  const getTrash = db.prepare(`
    SELECT
      e.id,
      e.subject,
      e.body,
      e.sent_at,
      er.deleted_at,
      er.is_read,
      er.recipient_type,
      sender.id AS sender_id,
      sender.name AS sender_name,
      sender.email AS sender_email
    FROM email_recipients er
    INNER JOIN emails e ON e.id = er.email_id
    INNER JOIN users sender ON sender.id = e.sender_id
    WHERE er.recipient_id = ?
      AND er.is_deleted = 1
      AND e.status = 'SENT'
    ORDER BY er.deleted_at DESC, e.id DESC
    LIMIT ? OFFSET ?
  `);

  const total = countTrash.get(userId).total;
  const messages = getTrash.all(userId, limit, offset);

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

// Restore one email from Trash to Inbox.
export function restoreEmailService({ emailId, recipientId }) {
  const result = db
    .prepare(
      `
    UPDATE email_recipients
    SET
      is_deleted = 0,
      deleted_at = NULL
    WHERE email_id = ?
      AND recipient_id = ?
      AND is_deleted = 1
      AND EXISTS (
        SELECT 1
        FROM emails
        WHERE emails.id = email_recipients.email_id
          AND emails.status = 'SENT'
      )
  `,
    )
    .run(emailId, recipientId);

  if (result.changes === 0) {
    throw new EmailServiceError(
      "Email not found in your Trash.",
      404,
      "TRASH_EMAIL_NOT_FOUND",
    );
  }

  return { id: emailId, is_deleted: 0 };
}

// Permanently remove only this user's Trash entry.
// The original email and its attachments remain intact.
export function permanentlyDeleteEmailService({ emailId, recipientId }) {
  const result = db
    .prepare(
      `
    DELETE FROM email_recipients
    WHERE email_id = ?
      AND recipient_id = ?
      AND is_deleted = 1
      AND EXISTS (
        SELECT 1
        FROM emails
        WHERE emails.id = email_recipients.email_id
          AND emails.status = 'SENT'
      )
  `,
    )
    .run(emailId, recipientId);

  if (result.changes === 0) {
    throw new EmailServiceError(
      "Email not found in your Trash.",
      404,
      "TRASH_EMAIL_NOT_FOUND",
    );
  }

  return true;
}

// Remove recipient entries that have been in Trash for 30 days.
// This does not delete emails or physical attachment files.
export function cleanupExpiredTrashService() {
  const result = db
    .prepare(
      `
    DELETE FROM email_recipients
    WHERE is_deleted = 1
      AND deleted_at IS NOT NULL
      AND deleted_at <= strftime(
        '%Y-%m-%dT%H:%M:%fZ',
        'now',
        '-${TRASH_RETENTION_DAYS} days'
      )
  `,
    )
    .run();

  return result.changes;
}
