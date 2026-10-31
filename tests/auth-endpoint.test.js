import assert from "node:assert/strict";
import { db } from "../src/database/connection.js";
import { createEmployee } from "../src/modules/users/users.service.js";

const baseUrl = "http://localhost:3000";
const email = `auth-http-${Date.now()}@example.test`;
const password = "TestPassword123!";

let userId;

async function runTests() {
  try {
    const user = await createEmployee({
      name: "HTTP Authentication Test",
      email,
      password,
    });

    userId = user.id;
    console.log("PASS: Temporary employee created");

    // 1. Successful login
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    assert.equal(response.status, 200);

    const body = await response.json();

    assert.equal(body.message, "Login successful.");
    assert.equal(body.user.id, userId);
    assert.equal("password_hash" in body.user, false);

    const cookie = response.headers.get("set-cookie");

    assert.ok(cookie, "Session cookie was not returned");
    assert.ok(cookie.includes("HttpOnly"));

    console.log("PASS: Login succeeds and returns a session cookie");

    // 2. Incorrect password
    const failedResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: "WrongPassword123!",
      }),
    });

    assert.equal(failedResponse.status, 401);

    console.log("PASS: Incorrect password rejected over HTTP");
  } finally {
    if (userId !== undefined) {
      db.prepare("DELETE FROM users WHERE id = ?").run(userId);
      console.log("CLEANUP: Temporary employee removed");
    }
  }
}

try {
  await runTests();
  console.log("\nAll authentication endpoint tests passed.");
} catch (error) {
  console.error("\nTEST FAILED:", error);
  process.exitCode = 1;
} finally {
  db.close();
}
