import assert from "node:assert/strict";
import { db } from "../src/database/connection.js";
import { createEmployee } from "../src/modules/users/users.service.js";

const baseUrl = "http://localhost:3000";
const password = "TestPassword123!";

const testUserIds = [];

async function createTestUser(name, email) {
  const user = await createEmployee({ name, email, password });
  testUserIds.push(user.id);
  return user;
}

async function loginAs(email) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  assert.equal(response.status, 200);

  return response.headers.get("set-cookie").split(";")[0];
}

async function getEmployees(cookie) {
  const options = cookie ? { headers: { Cookie: cookie } } : {};

  return fetch(`${baseUrl}/api/employees`, options);
}

async function runTests() {
  try {
    const employee = await createTestUser(
      "Directory Test Employee",
      `employee-${Date.now()}@example.test`,
    );

    const admin = await createTestUser(
      "Directory Test Admin",
      `admin-${Date.now()}@example.test`,
    );

    db.prepare(
      `
      UPDATE users SET role = 'ADMIN' WHERE id = ?
    `,
    ).run(admin.id);

    const employeeCookie = await loginAs(employee.email);
    const adminCookie = await loginAs(admin.email);

    console.log("PASS: Test users created and logged in");

    // 1. Anonymous request
    const anonymousResponse = await getEmployees(null);

    assert.equal(anonymousResponse.status, 401);
    console.log("PASS: Anonymous retrieval rejected");

    // 2. Employee request
    const employeeResponse = await getEmployees(employeeCookie);

    assert.equal(employeeResponse.status, 403);
    console.log("PASS: Employee denied directory access");

    // 3. Admin request
    const adminResponse = await getEmployees(adminCookie);

    assert.equal(adminResponse.status, 200);

    const body = await adminResponse.json();

    assert.ok(Array.isArray(body.employees));
    assert.equal(body.count, body.employees.length);

    const retrievedEmployee = body.employees.find(
      (user) => user.id === employee.id,
    );

    assert.ok(retrievedEmployee);
    assert.equal(retrievedEmployee.email, employee.email);
    assert.equal(retrievedEmployee.role, "EMPLOYEE");

    assert.equal("password_hash" in retrievedEmployee, false);

    console.log("PASS: Admin retrieved employee directory");
    console.log("PASS: Employee data contains no password hashes");
  } finally {
    for (const userId of testUserIds) {
      db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    }

    console.log("CLEANUP: Temporary employees removed");
  }
}

try {
  await runTests();
  console.log("\nAll employee retrieval tests passed.");
} catch (error) {
  console.error("\nTEST FAILED:", error);
  process.exitCode = 1;
} finally {
  db.close();
}
