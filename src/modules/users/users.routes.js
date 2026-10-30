import { Router } from "express";
import { createEmployeeController } from "./users.controller.js";

const router = Router();

router.post("/", createEmployeeController);

export default router;
