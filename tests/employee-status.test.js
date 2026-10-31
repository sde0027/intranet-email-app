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

  const cookie = response.headers.get("set-cookie");
  assert.ok(cookie);

  return cookie.split(";")[0];
}

async function updateStatus(cookie, id, isActive) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (cookie) {
    headers.Cookie = cookie;
  }

  return fetch(`${baseUrl}/api/employees/${id}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ is_active: isActive }),
  });
}

async function runTests() {
  try {
    // Create three test accounts.
    const employee = await createTestUser(
      "Status Test Employee",
      `employee-${Date.now()}@example.test`,
    );

    const target = await createTestUser(
      "Target Test Employee",
      `target-${Date.now()}@example.test`,
    );

    const admin = await createTestUser(
      "Status Test Admin",
      `admin-${Date.now()}@example.test`,
    );

    db.prepare(
      `
      UPDATE users SET role = 'ADMIN' WHERE id = ?
    `,
    ).run(admin.id);

    const employeeCookie = await loginAs(employee.email);
    const targetCookie = await loginAs(target.email);
    const adminCookie = await loginAs(admin.email);

    console.log("PASS: Test accounts created and logged in");

    // 1. Anonymous request.
    const anonymousResponse = await updateStatus(null, target.id, false);

    assert.equal(anonymousResponse.status, 401);
    console.log("PASS: Anonymous status update rejected");

    // 2. Employee request.
    const employeeResponse = await updateStatus(
      employeeCookie,
      target.id,
      false,
    );

    assert.equal(employeeResponse.status, 403);
    console.log("PASS: Employee denied status update");

    // 3. Invalid employee ID.
    const invalidIdResponse = await updateStatus(adminCookie, "invalid", false);

    assert.equal(invalidIdResponse.status, 400);
    console.log("PASS: Invalid employee ID rejected");

    // 4. Invalid status value.
    const invalidStatusResponse = await updateStatus(
      adminCookie,
      target.id,
      "inactive",
    );

    assert.equal(invalidStatusResponse.status, 400);
    console.log("PASS: Invalid status value rejected");

    // 5. Nonexistent employee.
    const missingResponse = await updateStatus(adminCookie, 999999999, false);

    assert.equal(missingResponse.status, 404);
    console.log("PASS: Nonexistent employee rejected");

    // 6. Prevent administrator from deactivating themselves.
    const selfDeactivationResponse = await updateStatus(
      adminCookie,
      admin.id,
      false,
    );

    assert.equal(selfDeactivationResponse.status, 400);
    console.log("PASS: Self-deactivation prevented");

    // 7. Admin deactivates target employee.
    const deactivationResponse = await updateStatus(
      adminCookie,
      target.id,
      false,
    );

    assert.equal(deactivationResponse.status, 200);

    const body = await deactivationResponse.json();
    assert.equal(body.employee.is_active, 0);

    console.log("PASS: Admin deactivated employee");

    // 8. Existing session must no longer grant access.
    const staleSessionResponse = await fetch(`${baseUrl}/api/employees`, {
      headers: { Cookie: targetCookie },
    });

    assert.equal(staleSessionResponse.status, 401);
    console.log("PASS: Deactivated employee's existing session rejected");

    // 9. Admin reactivates target employee.
    const activationResponse = await updateStatus(adminCookie, target.id, true);

    assert.equal(activationResponse.status, 200);

    const activationBody = await activationResponse.json();
    assert.equal(activationBody.employee.is_active, 1);

    console.log("PASS: Admin reactivated employee");
  } finally {
    for (const userId of testUserIds) {
      db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    }

    console.log("CLEANUP: Temporary employees removed");
  }
}

try {
  await runTests();
  console.log("\nAll employee status tests passed.");
} catch (error) {
  console.error("\nTEST FAILED:", error);
  process.exitCode = 1;
} finally {
  db.close();
}
