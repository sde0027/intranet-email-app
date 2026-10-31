import { Router } from "express";
import {
  createEmployeeController,
  getAllEmployeesController,
  updateEmployeeStatusController,
} from "./users.controller.js";

const router = Router();

router.post("/", createEmployeeController);
router.get("/", getAllEmployeesController);
router.patch("/:id/status", updateEmployeeStatusController);

export default router;
