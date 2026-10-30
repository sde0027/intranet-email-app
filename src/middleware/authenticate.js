export function authenticate(req, res, next) {
  if (!req.session?.user?.id) {
    return res.status(401).json({
      error: "Authentication required.",
    });
  }

  next();
}
