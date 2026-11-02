import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import {
  sendEmail,
  getInbox,
  getSent,
  createDraft,
  getDrafts,
  getDraft,
  updateDraft,
  deleteDraft,
  markAsRead,
  markAsUnread,
  getUnreadCount,
  replyToEmail,
  replyAllToEmail,
  forwardEmail,
  moveEmailToTrash,
  getTrash,
  restoreEmail,
  permanentlyDeleteEmail,
} from "./emails.controller.js";

import { uploadAttachments } from "../attachments/attachments.storage.js";

import {
  getEmailAttachments,
  downloadAttachment,
} from "../attachments/attachments.controller.js";

const router = Router();

router.post("/send", authenticate, uploadAttachments, sendEmail);
router.get("/inbox", authenticate, getInbox);
router.get("/sent", authenticate, getSent);
router.get("/trash", authenticate, getTrash);

router.post("/drafts", authenticate, createDraft);
router.get("/drafts", authenticate, getDrafts);
router.get("/drafts/:id", authenticate, getDraft);
router.patch("/drafts/:id", authenticate, updateDraft);
router.delete("/drafts/:id", authenticate, deleteDraft);

router.get("/unread-count", authenticate, getUnreadCount);
router.patch("/:id/read", authenticate, markAsRead);
router.patch("/:id/unread", authenticate, markAsUnread);

router.post("/:id/reply", authenticate, uploadAttachments, replyToEmail);
router.post("/:id/reply-all", authenticate, uploadAttachments, replyAllToEmail);
router.post("/:id/forward", authenticate, uploadAttachments, forwardEmail);

router.get(
  "/attachments/:attachmentId/download",
  authenticate,
  downloadAttachment,
);
router.get("/:id/attachments", authenticate, getEmailAttachments);

router.delete("/:id", authenticate, moveEmailToTrash);
router.patch("/:id/restore", authenticate, restoreEmail);
router.delete("/:id/permanent", authenticate, permanentlyDeleteEmail);

export default router;
