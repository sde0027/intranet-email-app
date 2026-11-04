import {
  createEmployee,
  getAllEmployees,
  updateEmployeeStatus,
  updateEmployeeProfile,
  getEmployeePhoto,
  getEmployeeById,
} from "./users.service.js";


export function getMyProfileController(req, res, next) {
  try {
    const employee = getEmployeeById(req.user.id);
    return res.status(200).json({ employee });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    return next(error);
  }
}

export async function createEmployeeController(req, res, next) {
  try {
    const employee = await createEmployee(req.body);
    res.status(201).json({ message: "Employee created successfully.", employee });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    next(error);
  }
}

export function getAllEmployeesController(req, res, next) {
  try {
    const employees = getAllEmployees();
    res.status(200).json({ count: employees.length, employees });
  } catch (error) { next(error); }
}

export function updateEmployeeStatusController(req, res, next) {
  try {
    if (Number(req.params.id) === req.session.user.id && req.body?.is_active === false) {
      return res.status(400).json({ error: "You cannot deactivate your own account." });
    }
    const employee = updateEmployeeStatus(req.params.id, req.body?.is_active);
    res.status(200).json({ message: "Employee status updated successfully.", employee });
  } catch (error) { next(error); }
}

export function updateEmployeeProfileController(req, res, next) {
  try {
    const employee = updateEmployeeProfile({
      id: req.params.id,
      input: req.body ?? {},
      photo: req.profilePhoto,
    });
    res.status(200).json({ message: "Employee profile updated successfully.", employee });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    next(error);
  }
}

export function getEmployeePhotoController(req, res, next) {
  try {
    const filePath = getEmployeePhoto(req.params.id);
    return res.sendFile(filePath, {
      headers: {
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    next(error);
  }
}
