import AppError from "../common/errors/AppError.js";

function roles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      next(new AppError("Autenticação necessária.", "UNAUTHENTICATED", 401));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError("Você não tem permissão para acessar este recurso.", "FORBIDDEN", 403));
      return;
    }

    next();
  };
}

export default roles;
