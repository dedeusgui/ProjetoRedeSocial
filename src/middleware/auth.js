import AppError from "../common/errors/AppError.js";
import env from "../config/env.js";
import { verifyJWT } from "../common/security/jwt.js";
import User from "../models/user.js";

async function auth(req, res, next) {
  const authorization = req.headers.authorization ?? "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    next(new AppError("Authentication required", "UNAUTHENTICATED", 401));
    return;
  }

  try {
    const payload = verifyJWT(token, env.jwtSecret);
    const currentUser = await User.findById(payload.sub)
      .select("username role")
      .lean();

    if (!currentUser) {
      throw new AppError("Authentication required", "UNAUTHENTICATED", 401);
    }

    req.user = {
      id: payload.sub,
      role: currentUser.role,
      username: currentUser.username ?? payload.username,
    };
    next();
  } catch (error) {
    next(error);
  }
}

export default auth;
