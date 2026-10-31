import assert from "node:assert/strict";
import { db } from "../src/database/connection.js";
import { createEmployee } from "../src/modules/users/users.service.js";

const baseUrl = "http://localhost:3000";
const password = "TestPassword123!";

const testUsers = [];
let createdEmployeeId;

async function createTestUser(name, email) {
  const user = await createEmployee({ name, email, password });
  testUsers.push(user.id);
  return user;
}

async function loginAs(email) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  assert.equal(response.status, 200);

  const cookie = response.headers.get("set-cookie");
  assert.ok(cookie);

  return cookie.split(";")[0];
}

async function createEmployeeRequest(cookie, employeeData) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (cookie) {
    headers.Cookie = cookie;
  }

  return fetch(`${baseUrl}/api/employees`, {
    method: "POST",
    headers,
    body: JSON.stringify(employeeData),
  });
}

async function runTests() {
  try {
    // Prepare test users.
    const employee = await createTestUser(
      "Test Employee",
      `employee-${Date.now()}@example.test`,
    );

    const admin = await createTestUser(
      "Test Admin",
      `admin-${Date.now()}@example.test`,
    );

    // Promote the second test user to ADMIN.
    db.prepare(
      `
      UPDATE users SET role = 'ADMIN' WHERE id = ?
    `,
    ).run(admin.id);

    const employeeCookie = await loginAs(employee.email);
    const adminCookie = await loginAs(admin.email);

    console.log("PASS: Test users created and logged in");

    // Test 1: Anonymous request.
    const anonymousResponse = await createEmployeeRequest(null, {
      name: "Anonymous User",
      email: "anonymous@example.test",
      password,
    });

    assert.equal(anonymousResponse.status, 401);
    console.log("PASS: Anonymous employee creation rejected");

    // Test 2: Employee attempting to create another employee.
    const employeeResponse = await createEmployeeRequest(employeeCookie, {
      name: "Unauthorized User",
      email: "unauthorized@example.test",
      password,
    });

    assert.equal(employeeResponse.status, 403);
    console.log("PASS: Employee denied employee creation");

    // Test 3: Admin creates employee.
    const newEmployeeData = {
      name: "New Test Employee",
      email: `new-employee-${Date.now()}@example.test`,
      password,
    };

    const adminResponse = await createEmployeeRequest(
      adminCookie,
      newEmployeeData,
    );

    assert.equal(adminResponse.status, 201);

    const adminBody = await adminResponse.json();

    assert.equal(adminBody.employee.name, newEmployeeData.name);
    assert.equal(adminBody.employee.email, newEmployeeData.email);
    assert.equal(adminBody.employee.role, "EMPLOYEE");
    assert.equal("password_hash" in adminBody.employee, false);

    createdEmployeeId = adminBody.employee.id;
    testUsers.push(createdEmployeeId);

    console.log("PASS: Admin successfully created employee");

    // Test 4: Duplicate email.
    const duplicateResponse = await createEmployeeRequest(
      adminCookie,
      newEmployeeData,
    );

    assert.equal(duplicateResponse.status, 409);
    console.log("PASS: Duplicate email rejected");

    // Test 5: Invalid input.
    const invalidResponse = await createEmployeeRequest(adminCookie, {
      name: "",
      email: "not-an-email",
      password: "123",
    });

    assert.equal(invalidResponse.status, 400);
    console.log("PASS: Invalid employee data rejected");

    // Test 6: Confirm persistence.
    const storedEmployee = db
      .prepare(
        `
      SELECT id, name, email, role
      FROM users
      WHERE id = ?
    `,
      )
      .get(createdEmployeeId);

    assert.ok(storedEmployee);
    assert.equal(storedEmployee.email, newEmployeeData.email);

    console.log("PASS: Employee persisted in SQLite");
  } finally {
    for (const userId of testUsers) {
      db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    }

    console.log("CLEANUP: Temporary employees removed");
  }
}

try {
  await runTests();
  console.log("\nAll employee creation tests passed.");
} catch (error) {
  console.error("\nTEST FAILED:", error);
  process.exitCode = 1;
} finally {
  db.close();
}
