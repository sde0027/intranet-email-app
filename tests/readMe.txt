import these in app.js before running the tests.

import { authenticate } from "./middleware/authenticate.js";
import { authorize } from "./middleware/authorize.js";


Also add these test routes after the middleware

// Temporary test endpoint: authentication
app.get(
  "/api/test/protected",
  authenticate,
  (req, res) => {
    res.json({ message: "You are authenticated." });
  }
);

// Temporary test endpoint: authorization
app.get(
  "/api/test/admin",
  authenticate,
  authorize("ADMIN"),
  (req, res) => {
    res.json({ message: "Admin access granted." });
  }
);