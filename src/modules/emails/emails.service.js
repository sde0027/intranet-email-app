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

function validateRecipients(to, cc, bcc, { requireTo = true } = {}) {
  const groups = [
    { type: "TO", values: to },
    { type: "CC", values: cc },
    { type: "BCC", values: bcc },
  ];

  for (const group of groups) {
    if (!Array.isArray(group.values)) {
      throw new EmailServiceError(
        `${group.type} recipients must be an array.`,
        400,
        "INVALID_RECIPIENTS",
      );
    }

    for (const value of group.values) {
      const validId = Number.isSafeInteger(value) && value > 0;
      const validEmail =
        typeof value === "string" &&
        value.trim() === value &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

      if (!validId && !validEmail) {
        throw new EmailServiceError(
          "Recipients must be positive employee IDs or valid email addresses.",
          400,
          "INVALID_RECIPIENT",
        );
      }
    }
  }

  if (requireTo && to.length === 0) {
    throw new EmailServiceError(
      "At least one TO recipient is required.",
      400,
      "TO_RECIPIENT_REQUIRED",
    );
  }

  return groups;
}

// Resolve both legacy numeric IDs and email addresses to active employee IDs.
// Email matching is case-insensitive because users.email uses COLLATE NOCASE.
function resolveRecipientGroups(to, cc = [], bcc = [], options = {}) {
  const groups = validateRecipients(to, cc, bcc, options);
  const findById = db.prepare(`
    SELECT id FROM users WHERE id = ? AND is_active = 1
  `);
  const findByEmail = db.prepare(`
    SELECT id FROM users WHERE email = ? COLLATE NOCASE AND is_active = 1
  `);

  const resolvedGroups = groups.map((group) => ({
    type: group.type,
    ids: group.values.map((value) => {
      const employee =
        typeof value === "number"
          ? findById.get(value)
          : findByEmail.get(value);

      if (!employee) {
        throw new EmailServiceError(
          "One or more recipients do not exist or are inactive.",
          400,
          "INVALID_RECIPIENT",
        );
      }

      return employee.id;
    }),
  }));

  const allIds = resolvedGroups.flatMap((group) => group.ids);
  if (new Set(allIds).size !== allIds.length) {
    throw new EmailServiceError(
      "Duplicate recipients are not allowed.",
      400,
      "DUPLICATE_RECIPIENTS",
    );
  }

  return resolvedGroups;
}

function insertRecipientGroups(emailId, groups) {
  const insertRecipient = db.prepare(`
    INSERT INTO email_recipients (email_id, recipient_id, recipient_type)
    VALUES (?, ?, ?)
  `);

  for (const group of groups) {
    for (const recipientId of group.ids) {
      insertRecipient.run(emailId, recipientId, group.type);
    }
  }
}

function getDraftRecipients(emailId) {
  const rows = db.prepare(`
    SELECT
      er.recipient_type,
      u.id,
      u.name,
      u.email
    FROM email_recipients er
    INNER JOIN users u ON u.id = er.recipient_id
    WHERE er.email_id = ?
    ORDER BY
      CASE er.recipient_type
        WHEN 'TO' THEN 1
        WHEN 'CC' THEN 2
        WHEN 'BCC' THEN 3
      END,
      u.name
  `).all(emailId);

  const recipients = { to: [], cc: [], bcc: [] };
  for (const row of rows) {
    recipients[row.recipient_type.toLowerCase()].push({
      id: row.id,
      name: row.name,
      email: row.email,
    });
  }
  return recipients;
}

function getDraftWithRecipients(draft) {
  return draft ? { ...draft, recipients: getDraftRecipients(draft.id) } : draft;
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

  // 2. Resolve employee IDs and email addresses to active employee IDs.
  const groups = resolveRecipientGroups(to, cc, bcc, { requireTo: true });

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

    insertRecipientGroups(emailId, groups);
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
  // A user may be both the sender and a recipient (self-sent email).
  // In that case, their recipient row still owns the read/unread state.
  const userRecipient = db
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

// Create a new draft. Recipient groups are optional while composing.
export function createDraftService({
  senderId,
  subject = "",
  body = "",
  to = [],
  cc = [],
  bcc = [],
}) {
  if (typeof subject !== "string" || typeof body !== "string") {
    throw new EmailServiceError(
      "Subject and body must be strings.",
      400,
      "INVALID_DRAFT",
    );
  }

  const groups = resolveRecipientGroups(to, cc, bcc, { requireTo: false });

  const createDraftTransaction = db.transaction(() => {
    const insertDraft = db.prepare(`
      INSERT INTO emails (sender_id, subject, body, status)
      VALUES (?, ?, ?, 'DRAFT')
    `);
    const result = insertDraft.run(senderId, subject, body);
    const draftId = Number(result.lastInsertRowid);
    insertRecipientGroups(draftId, groups);
    return getDraftWithRecipients(findDraft.get(draftId, senderId));
  });

  return createDraftTransaction();
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

  const drafts = getDrafts.all(senderId, limit, offset).map(getDraftWithRecipients);

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

  return getDraftWithRecipients(draft);
}

// Update draft content and, when supplied, replace the corresponding recipient groups.
export function updateDraftService({
  senderId,
  draftId,
  subject,
  body,
  to,
  cc,
  bcc,
}) {
  const hasSubject = subject !== undefined;
  const hasBody = body !== undefined;
  const hasTo = to !== undefined;
  const hasCc = cc !== undefined;
  const hasBcc = bcc !== undefined;

  if (!hasSubject && !hasBody && !hasTo && !hasCc && !hasBcc) {
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

  const existingDraft = findDraft.get(draftId, senderId);
  if (!existingDraft) {
    throw new EmailServiceError("Draft not found.", 404, "DRAFT_NOT_FOUND");
  }

  const currentRecipients = getDraftRecipients(draftId);
  const changedGroups = resolveRecipientGroups(
    hasTo ? to : [],
    hasCc ? cc : [],
    hasBcc ? bcc : [],
    { requireTo: false },
  ).filter((group) =>
    (group.type === "TO" && hasTo) ||
    (group.type === "CC" && hasCc) ||
    (group.type === "BCC" && hasBcc),
  );

  const changedIds = (type) =>
    changedGroups.find((group) => group.type === type).ids;
  const finalRecipientIds = [
    ...(hasTo ? changedIds("TO") : currentRecipients.to.map((r) => r.id)),
    ...(hasCc ? changedIds("CC") : currentRecipients.cc.map((r) => r.id)),
    ...(hasBcc ? changedIds("BCC") : currentRecipients.bcc.map((r) => r.id)),
  ];
  if (new Set(finalRecipientIds).size !== finalRecipientIds.length) {
    throw new EmailServiceError(
      "Duplicate recipients are not allowed.",
      400,
      "DUPLICATE_RECIPIENTS",
    );
  }

  const updateTransaction = db.transaction(() => {
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
    if (assignments.length > 0) {
      db.prepare(`
        UPDATE emails
        SET ${assignments.join(", ")}
        WHERE id = ? AND sender_id = ? AND status = 'DRAFT'
      `).run(...values, draftId, senderId);
    }

    if (hasTo || hasCc || hasBcc) {
      const typesToReplace = [
        ...(hasTo ? ["TO"] : []),
        ...(hasCc ? ["CC"] : []),
        ...(hasBcc ? ["BCC"] : []),
      ];
      const placeholders = typesToReplace.map(() => "?").join(", ");
      db.prepare(`
        DELETE FROM email_recipients
        WHERE email_id = ? AND recipient_type IN (${placeholders})
      `).run(draftId, ...typesToReplace);

      insertRecipientGroups(draftId, changedGroups);
    }

    return getDraftWithRecipients(findDraft.get(draftId, senderId));
  });

  return updateTransaction();
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
