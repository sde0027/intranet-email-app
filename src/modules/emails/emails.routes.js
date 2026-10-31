import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { sendEmail } from "./emails.controller.js";

const router = Router();

router.post("/send", authenticate, sendEmail);

export default router;
