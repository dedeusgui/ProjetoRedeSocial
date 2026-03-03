function sendSuccess(res, data, statusCode = 200) {
  return res.status(statusCode).json({
    ok: true,
    data,
  });
}

function sendError(res, error, statusCode = 500) {
  return res.status(statusCode).json({
    ok: false,
    error,
  });
}

export { sendSuccess, sendError };
