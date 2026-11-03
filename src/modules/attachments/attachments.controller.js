import {
  AttachmentServiceError,
  getEmailAttachmentsService,
  getAttachmentDownloadService,
} from "./attachments.service.js";

function parsePositiveId(value) {
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) {
    return null;
  }

  const id = Number(value);

  return Number.isSafeInteger(id) ? id : null;
}

function handleAttachmentError(error, res, operation) {
  if (error instanceof AttachmentServiceError) {
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

export function getEmailAttachments(req, res) {
  try {
    const emailId = parsePositiveId(req.params.id);

    if (emailId === null) {
      return res.status(400).json({
        error: "Invalid email ID.",
      });
    }

    const attachments = getEmailAttachmentsService({
      emailId,
      userId: req.user.id,
    });

    return res.status(200).json({
      attachments,
    });
  } catch (error) {
    return handleAttachmentError(error, res, "Retrieve attachments");
  }
}

export function downloadAttachment(req, res) {
  try {
    const attachmentId = parsePositiveId(req.params.attachmentId);

    if (attachmentId === null) {
      return res.status(400).json({
        error: "Invalid attachment ID.",
      });
    }

    const attachment = getAttachmentDownloadService({
      attachmentId,
      userId: req.user.id,
    });

    return res.download(
      attachment.filePath,
      attachment.original_name,
      {
        headers: {
          "Content-Type": attachment.mime_type,
          "X-Content-Type-Options": "nosniff",
        },
      },
      (error) => {
        if (error) {
          if (!res.headersSent) {
            console.error("Attachment download failed:", error);
            res.status(500).json({
              error: "Unable to download attachment.",
            });
          } else {
            console.error("Attachment download interrupted:", error);
          }
        }
      },
    );
  } catch (error) {
    return handleAttachmentError(error, res, "Download attachment");
  }
}
