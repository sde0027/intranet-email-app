import assert from "node:assert/strict";
import { db } from "../src/database/connection.js";
import { createEmployee } from "../src/modules/users/users.service.js";
import { login } from "../src/modules/auth/auth.service.js";

const email = `auth-test-${Date.now()}@example.test`;
const password = "TestPassword123!";

let userId;

async function expectLoginFailure(credentials, expectedStatus) {
  await assert.rejects(
    login(credentials),
    (error) => error.statusCode === expectedStatus,
  );
}

async function runTests() {
  try {
    const user = await createEmployee({
      name: "Authentication Test User",
      email,
      password,
    });

    userId = user.id;
    console.log("PASS: Temporary employee created");

    // 1. Correct credentials
    const authenticatedUser = await login({ email, password });

    assert.equal(authenticatedUser.id, userId);
    assert.equal(authenticatedUser.email, email);
    assert.equal(authenticatedUser.role, "EMPLOYEE");
    assert.equal("password_hash" in authenticatedUser, false);

    console.log("PASS: Correct credentials accepted");

    // 2. Incorrect password
    await expectLoginFailure({ email, password: "WrongPassword123!" }, 401);

    console.log("PASS: Incorrect password rejected");

    // 3. Unknown email
    await expectLoginFailure(
      { email: "unknown-user@example.test", password },
      401,
    );

    console.log("PASS: Unknown email rejected");

    // 4. Inactive employee
    db.prepare(
      `
      UPDATE users SET is_active = 0 WHERE id = ?
    `,
    ).run(userId);

    await expectLoginFailure({ email, password }, 401);

    console.log("PASS: Inactive employee rejected");
  } finally {
    if (userId !== undefined) {
      db.prepare("DELETE FROM users WHERE id = ?").run(userId);
      console.log("CLEANUP: Temporary employee removed");
    }
  }
}

try {
  await runTests();
  console.log("\nAll authentication service tests passed.");
} catch (error) {
  console.error("\nTEST FAILED:", error);
  process.exitCode = 1;
} finally {
  db.close();
}
