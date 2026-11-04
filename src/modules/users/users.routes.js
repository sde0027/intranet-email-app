import { Router } from "express";
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import {
  createEmployeeController,
  getAllEmployeesController,
  updateEmployeeStatusController,
  updateEmployeeProfileController,
  getEmployeePhotoController,
  getMyProfileController,
} from "./users.controller.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();
const profilePhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
}).single("profile_photo");

// Any authenticated employee may view their own profile and employee profile images.
// Keep /me before the administrator-only middleware.
router.get("/me", getMyProfileController);
router.get("/:id/photo", getEmployeePhotoController);

// All employee-management operations below are administrator-only.
router.use(authorize("ADMIN"));
router.post("/", createEmployeeController);
router.get("/", getAllEmployeesController);
router.patch("/:id/status", updateEmployeeStatusController);
router.patch("/:id/profile", (req, res, next) => {
  profilePhotoUpload(req, res, (error) => {
    if (!error) return next();
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ error: "Profile photo must be 5 MB or smaller." });
    }
    return res.status(400).json({ error: error.message || "Invalid profile photo upload." });
  });
}, async (req, res, next) => {
  try {
    if (req.file) {
      const detected = await fileTypeFromBuffer(req.file.buffer);
      if (!detected || !["image/jpeg", "image/png", "image/webp"].includes(detected.mime)) {
        return res.status(400).json({ error: "Profile photo must be a valid JPEG, PNG, or WebP image." });
      }
      req.profilePhoto = { buffer: req.file.buffer, mimeType: detected.mime };
    }
    next();
  } catch (error) {
    next(error);
  }
}, updateEmployeeProfileController);

export default router;
