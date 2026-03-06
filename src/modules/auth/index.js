import createAuthRoutes from "./routes/authRoutes.js";
import AuthRepository from "./repositories/AuthRepository.js";
import AuthService from "./services/AuthService.js";
import AuthController from "./controllers/AuthController.js";
import { signJWT } from "../../common/security/jwt.js";

function createAuthModule({ jwtSecret, jwtExpiresInSeconds, adminEmails = [] }) {
  const authRepository = new AuthRepository();
  const tokenService = (payload, expiresInSeconds) =>
    signJWT(payload, jwtSecret, expiresInSeconds);

  const authService = new AuthService(
    authRepository,
    tokenService,
    jwtExpiresInSeconds,
    adminEmails,
  );
  const authController = new AuthController(authService);
  const router = createAuthRoutes(authController);

  return {
    router,
    service: authService,
  };
}

export default createAuthModule;
