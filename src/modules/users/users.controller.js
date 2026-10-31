import { createEmployee } from "./users.service.js";
import { getAllEmployees } from "./users.service.js";
import { updateEmployeeStatus } from "./users.service.js";

export async function createEmployeeController(req, res, next) {
  try {
    const employee = await createEmployee(req.body);

    res.status(201).json({
      message: "Employee created successfully.",
      employee,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        error: error.message,
      });
    }

    next(error);
  }
}

export function getAllEmployeesController(req, res, next) {
  try {
    const employees = getAllEmployees();

    res.status(200).json({
      count: employees.length,
      employees,
    });
  } catch (error) {
    next(error);
  }
}

export function updateEmployeeStatusController(req, res, next) {
  try {
    // Prevent an administrator from accidentally deactivating
    // their own account and locking themselves out.
    if (
      Number(req.params.id) === req.session.user.id &&
      req.body?.is_active === false
    ) {
      return res.status(400).json({
        error: "You cannot deactivate your own account.",
      });
    }

    const employee = updateEmployeeStatus(req.params.id, req.body?.is_active);

    res.status(200).json({
      message: "Employee status updated successfully.",
      employee,
    });
  } catch (error) {
    next(error);
  }
}
