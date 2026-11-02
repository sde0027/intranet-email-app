import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { sendEmail, getInbox, getSent } from "./emails.controller.js";

const router = Router();

router.post("/send", authenticate, sendEmail);
router.get("/inbox", authenticate, getInbox);
router.get("/sent", authenticate, getSent);

export default router;
