import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { sendEmail, getInbox } from "./emails.controller.js";

const router = Router();

router.post("/send", authenticate, sendEmail);
router.get("/inbox", authenticate, getInbox);

export default router;
