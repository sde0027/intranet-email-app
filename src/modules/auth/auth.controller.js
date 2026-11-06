import { login, changeUserPassword } from "./auth.service.js";
import { db } from "../../database/connection.js";
import { SESSION_TTL_MS } from "../../middleware/sqlite-session-store.js";

export async function loginController(req, res, next) {
  try {
    if (req.session?.user?.id && Number(req.session.authExpiresAt) > Date.now()) {
      const currentUser = db
        .prepare("SELECT is_active FROM users WHERE id = ?")
        .get(req.session.user.id);

      if (currentUser?.is_active) {
        return res.status(409).json({
          code: "SESSION_ALREADY_ACTIVE",
          error: "An account is already signed in on this browser. Please sign out from the existing session before signing in here.",
        });
      }

      // The account is no longer allowed to use this session. Clear it and
      // ask the client to retry sign-in with a fresh browser session.
      return req.session.destroy((error) => {
        if (error) return next(error);
        res.clearCookie("intranet.sid", { path: "/" });
        return res.status(401).json({
          error: "Your previous session is no longer valid. Please sign in again.",
        });
      });
    }

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


export async function changePasswordController(req, res, next) {
  try {
    const result = await changeUserPassword({
      userId: req.user.id,
      currentPassword: req.body?.currentPassword,
      newPassword: req.body?.newPassword,
    });

    res.clearCookie("intranet.sid", { path: "/" });
    return res.status(200).json({
      message: "Password changed successfully. Please sign in again.",
      ...result,
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    return next(error);
  }
}
