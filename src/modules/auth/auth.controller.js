import { login } from "./auth.service.js";
import { SESSION_TTL_MS } from "../../middleware/sqlite-session-store.js";

export async function loginController(req, res, next) {
  try {
    const user = await login(req.body ?? {});

    // Regenerate the session ID after successful authentication.
    req.session.regenerate((error) => {
      if (error) {
        return next(error);
      }

      // Store only the information needed to identify the user.
      req.session.user = {
        id: user.id,
        role: user.role,
      };

      // Set one fixed deadline. Requests and user activity never extend it.
      req.session.authExpiresAt = Date.now() + SESSION_TTL_MS;
      req.session.cookie.expires = new Date(req.session.authExpiresAt);

      // Save the session before responding to the client.
      req.session.save((saveError) => {
        if (saveError) {
          return next(saveError);
        }

        res.status(200).json({
          message: "Login successful.",
          user,
          expiresAt: req.session.authExpiresAt,
        });
      });
    });
  } catch (error) {
    next(error);
  }
}

export function logoutController(req, res, next) {
  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }

    res.clearCookie("intranet.sid", {
      path: "/",
    });

    return res.status(200).json({
      message: "Logout successful.",
    });
  });
}
