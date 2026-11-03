import { Router } from "express";
import { loginController, logoutController } from "./auth.controller.js";

const router = Router();

router.post("/login", loginController);
router.post("/logout", logoutController);

export default router;
