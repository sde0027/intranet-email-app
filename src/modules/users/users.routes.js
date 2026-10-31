import { Router } from "express";
import {
  createEmployeeController,
  getAllEmployeesController,
} from "./users.controller.js";

const router = Router();

router.post("/", createEmployeeController);
router.get("/", getAllEmployeesController);

export default router;
