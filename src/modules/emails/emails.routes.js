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
} from "./emails.controller.js";

const router = Router();

router.post("/send", authenticate, sendEmail);
router.get("/inbox", authenticate, getInbox);
router.get("/sent", authenticate, getSent);

router.post("/drafts", authenticate, createDraft);
router.get("/drafts", authenticate, getDrafts);
router.get("/drafts/:id", authenticate, getDraft);
router.patch("/drafts/:id", authenticate, updateDraft);
router.delete("/drafts/:id", authenticate, deleteDraft);

router.get("/unread-count", authenticate, getUnreadCount);
router.patch("/:id/read", authenticate, markAsRead);
router.patch("/:id/unread", authenticate, markAsUnread);

export default router;
