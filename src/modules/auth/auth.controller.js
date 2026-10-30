import { login } from "./auth.service.js";

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

      // Save the session before responding to the client.
      req.session.save((saveError) => {
        if (saveError) {
          return next(saveError);
        }

        res.status(200).json({
          message: "Login successful.",
          user,
        });
      });
    });
  } catch (error) {
    next(error);
  }
}
