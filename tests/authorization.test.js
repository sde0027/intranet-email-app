import assert from "node:assert/strict";
import { db } from "../src/database/connection.js";
import { createEmployee } from "../src/modules/users/users.service.js";

const baseUrl = "http://localhost:3000";
const password = "TestPassword123!";

const testUserIds = [];

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

async function requestAdminEndpoint(cookie) {
  const options = cookie ? { headers: { Cookie: cookie } } : {};

  return fetch(`${baseUrl}/api/test/admin`, options);
}

async function runTests() {
  try {
    // Create employee
    const employee = await createEmployee({
      name: "Authorization Test Employee",
      email: `employee-${Date.now()}@example.test`,
      password,
    });

    testUserIds.push(employee.id);

    // Create admin using the same service, then promote the test user.
    const admin = await createEmployee({
      name: "Authorization Test Admin",
      email: `admin-${Date.now()}@example.test`,
      password,
    });

    testUserIds.push(admin.id);

    db.prepare(
      `
      UPDATE users SET role = 'ADMIN' WHERE id = ?
    `,
    ).run(admin.id);

    // Obtain sessions
    const employeeCookie = await loginAs(employee.email);
    const adminCookie = await loginAs(admin.email);

    console.log("PASS: Test users created and logged in");

    // 1. Employee denied
    const employeeResponse = await requestAdminEndpoint(employeeCookie);

    assert.equal(employeeResponse.status, 403);
    console.log("PASS: Employee denied admin access");

    // 2. Admin allowed
    const adminResponse = await requestAdminEndpoint(adminCookie);

    assert.equal(adminResponse.status, 200);
    console.log("PASS: Admin granted access");

    // 3. Anonymous request denied
    const anonymousResponse = await requestAdminEndpoint(null);

    assert.equal(anonymousResponse.status, 401);
    console.log("PASS: Unauthenticated request rejected");
  } finally {
    for (const userId of testUserIds) {
      db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    }

    console.log("CLEANUP: Temporary users removed");
  }
}

try {
  await runTests();
  console.log("\nAll authorization tests passed.");
} catch (error) {
  console.error("\nTEST FAILED:", error);
  process.exitCode = 1;
} finally {
  db.close();
}
