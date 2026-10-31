import { db } from "../database/connection.js";

export function authenticate(req, res, next) {
  try {
    const sessionUser = req.session?.user;

    if (!sessionUser?.id) {
      return res.status(401).json({
        error: "Authentication required.",
      });
    }

    // Fetch the user's current account status and role.
    const user = db
      .prepare(
        `
      SELECT id, name, email, role, is_active
      FROM users
      WHERE id = ?
    `,
      )
      .get(sessionUser.id);

    // Reject missing or deactivated accounts.
    if (!user || !user.is_active) {
      return req.session.destroy((error) => {
        if (error) {
          return next(error);
        }

        res.status(401).json({
          error: "Authentication required.",
        });
      });
    }

    // Make the current database user available to later middleware.
    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
}
