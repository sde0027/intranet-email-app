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
  updateMyProfilePhotoController,
  resetEmployeePasswordController,
} from "./users.controller.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();
const profilePhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
}).single("profile_photo");

function handleProfilePhotoUpload(req, res, next) {
  profilePhotoUpload(req, res, async (error) => {
    if (error) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ error: "Profile photo must be 5 MB or smaller." });
      }
      return res.status(400).json({ error: error.message || "Invalid profile photo upload." });
    }

    try {
      if (req.file) {
        const detected = await fileTypeFromBuffer(req.file.buffer);
        if (!detected || !["image/jpeg", "image/png", "image/webp"].includes(detected.mime)) {
          return res.status(400).json({ error: "Profile photo must be a valid JPEG, PNG, or WebP image." });
        }
        req.profilePhoto = { buffer: req.file.buffer, mimeType: detected.mime };
      }
      return next();
    } catch (validationError) {
      return next(validationError);
    }
  });
}

// Any authenticated employee may view their own profile and employee profile images.
// Keep /me before the administrator-only middleware.
router.get("/me", getMyProfileController);
router.put("/me/photo", handleProfilePhotoUpload, updateMyProfilePhotoController);
router.get("/:id/photo", getEmployeePhotoController);

// All employee-management operations below are administrator-only.
router.use(authorize("ADMIN"));
router.post("/", createEmployeeController);
router.get("/", getAllEmployeesController);
router.patch("/:id/status", updateEmployeeStatusController);
router.post("/:id/reset-password", resetEmployeePasswordController);
router.patch("/:id/profile", handleProfilePhotoUpload, updateEmployeeProfileController);

export default router;
