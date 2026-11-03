export function notFoundHandler(req, res) {
  res.status(404).json({
    error: "The requested endpoint was not found.",
  });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let statusCode = Number(error.statusCode ?? error.status) || 500;
  let message = error.message || "An unexpected server error occurred.";

  // Normalize common middleware/parser errors into safe API responses.
  if (error.type === "entity.parse.failed") {
    statusCode = 400;
    message = "The request body contains invalid JSON.";
  } else if (error.type === "entity.too.large") {
    statusCode = 413;
    message = "The request body is too large.";
  } else if (error.code === "LIMIT_FILE_SIZE") {
    statusCode = 413;
    message = "An uploaded file exceeds the allowed size.";
  } else if (error.code?.startsWith("LIMIT_")) {
    statusCode = 400;
    message = "The uploaded files do not meet the request limits.";
  }

  if (!Number.isInteger(statusCode) || statusCode < 400 || statusCode > 599) {
    statusCode = 500;
  }

  if (statusCode >= 500) {
    console.error("Unhandled request error:", error);
    message = "An internal server error occurred.";
  }

  return res.status(statusCode).json({ error: message });
}
