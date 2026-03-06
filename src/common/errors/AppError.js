class AppError extends Error {
  constructor(message, code = "INTERNAL_ERROR", statusCode = 500, details = null) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export default AppError;
