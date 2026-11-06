import { Router } from "express";
import { loginController, logoutController, changePasswordController } from "./auth.controller.js";
import { authenticate } from "../../middleware/authenticate.js";

const router = Router();

router.post("/login", loginController);
router.post("/logout", logoutController);
router.post("/change-password", authenticate, changePasswordController);

export default router;
