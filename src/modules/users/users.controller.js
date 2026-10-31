import { createEmployee } from "./users.service.js";
import { getAllEmployees } from "./users.service.js";

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
