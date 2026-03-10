import AppError from "../errors/AppError.js";
import {
  POST_MEDIA_MAX_FILE_SIZE_MB,
  POST_MEDIA_MAX_ITEMS,
} from "../media/postMedia.js";
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

  if (error?.name === "MulterError") {
    const isFileSizeError = error.code === "LIMIT_FILE_SIZE";
    const isFileCountError = error.code === "LIMIT_FILE_COUNT";
    const message = isFileSizeError
      ? `Cada imagem deve ter no máximo ${POST_MEDIA_MAX_FILE_SIZE_MB} MB.`
      : isFileCountError
        ? `Você pode enviar até ${POST_MEDIA_MAX_ITEMS} imagens por envio.`
        : "Os arquivos enviados são inválidos.";
    const details = isFileSizeError
      ? {
          field: "media",
          maxFileSizeMb: POST_MEDIA_MAX_FILE_SIZE_MB,
        }
      : isFileCountError
        ? {
            field: "media",
            maxItemsPerRequest: POST_MEDIA_MAX_ITEMS,
          }
        : {
            field: "media",
          };

    sendError(
      res,
      {
        code: "VALIDATION_ERROR",
        message,
        details,
      },
      400,
    );
    return;
  }

  sendError(
    res,
    {
      code: "INTERNAL_ERROR",
      message: "Ocorreu um erro interno inesperado.",
    },
    500,
  );
}

export default errorHandler;
