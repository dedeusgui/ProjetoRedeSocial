import AppError from "../../../common/errors/AppError.js";
import { requireFields } from "../../../common/validation/index.js";
import { hashPassword, verifyPassword } from "../../../common/security/password.js";

class AuthService {
  constructor(authRepository, tokenService, tokenTtlSeconds) {
    this.authRepository = authRepository;
    this.tokenService = tokenService;
    this.tokenTtlSeconds = tokenTtlSeconds;
  }

  async register(payload) {
    requireFields(payload, ["username", "email", "password"]);

    const username = payload.username.trim();
    const email = payload.email.trim().toLowerCase();

    const [existingByEmail, existingByUsername] = await Promise.all([
      this.authRepository.findByEmail(email),
      this.authRepository.findByUsername(username),
    ]);

    if (existingByEmail) {
      throw new AppError("Email already in use", "CONFLICT", 409);
    }

    if (existingByUsername) {
      throw new AppError("Username already in use", "CONFLICT", 409);
    }

    const user = await this.authRepository.createUser({
      username,
      email,
      passwordHash: hashPassword(payload.password),
      role: "user",
    });

    const token = this.tokenService(
      {
        sub: user.id,
        role: user.role,
        username: user.username,
      },
      this.tokenTtlSeconds,
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(payload) {
    requireFields(payload, ["email", "password"]);

    const email = payload.email.trim().toLowerCase();
    const user = await this.authRepository.findByEmail(email);

    if (!user || !verifyPassword(payload.password, user.passwordHash)) {
      throw new AppError("Invalid email or password", "INVALID_CREDENTIALS", 401);
    }

    const token = this.tokenService(
      {
        sub: user.id,
        role: user.role,
        username: user.username,
      },
      this.tokenTtlSeconds,
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }
}

export default AuthService;
