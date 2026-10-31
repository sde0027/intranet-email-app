import assert from "node:assert/strict";
import { db } from "../src/database/connection.js";
import { createEmployee } from "../src/modules/users/users.service.js";

const baseUrl = "http://localhost:3000";
const email = `middleware-test-${Date.now()}@example.test`;
const password = "TestPassword123!";

let userId;

async function runTests() {
  try {
    // 1. No session
    const unauthenticatedResponse = await fetch(
      `${baseUrl}/api/test/protected`,
    );

    assert.equal(unauthenticatedResponse.status, 401);
    console.log("PASS: Unauthenticated request rejected");

    // 2. Create temporary employee
    const user = await createEmployee({
      name: "Middleware Test User",
      email,
      password,
    });

    userId = user.id;
    console.log("PASS: Temporary employee created");

    // 3. Login and obtain session cookie
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    assert.equal(loginResponse.status, 200);

    const cookie = loginResponse.headers.get("set-cookie");
    assert.ok(cookie, "Session cookie missing");

    // 4. Access protected route using the cookie
    const protectedResponse = await fetch(`${baseUrl}/api/test/protected`, {
      headers: {
        Cookie: cookie.split(";")[0],
      },
    });

    assert.equal(protectedResponse.status, 200);

    const body = await protectedResponse.json();
    assert.equal(body.message, "You are authenticated.");

    console.log("PASS: Authenticated request accepted");
  } finally {
    if (userId !== undefined) {
      db.prepare("DELETE FROM users WHERE id = ?").run(userId);
      console.log("CLEANUP: Temporary employee removed");
    }
  }
}

try {
  await runTests();
  console.log("\nAll authentication middleware tests passed.");
} catch (error) {
  console.error("\nTEST FAILED:", error);
  process.exitCode = 1;
} finally {
  db.close();
}
