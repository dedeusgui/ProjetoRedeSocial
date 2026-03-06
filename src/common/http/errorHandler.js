import AppError from "../errors/AppError.js";
import { sendError } from "./responses.js";

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    sendError(
      res,
      {
        code: error.code,
        message: error.message,
        details: error.details,
      },
      error.statusCode,
    );
    return;
  }

  sendError(
    res,
    {
      code: "INTERNAL_ERROR",
      message: "Unexpected server error",
    },
    500,
  );
}

export default errorHandler;
