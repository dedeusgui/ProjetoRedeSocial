import AppError from "../../../common/errors/AppError.js";
import { buildAdminEmailSet, isAdminEmail } from "../../../common/security/adminAccess.js";
import { requireFields } from "../../../common/validation/index.js";
import { hashPassword, verifyPassword } from "../../../common/security/password.js";

class AuthService {
  constructor(authRepository, tokenService, tokenTtlSeconds, adminEmails = []) {
    this.authRepository = authRepository;
    this.tokenService = tokenService;
    this.tokenTtlSeconds = tokenTtlSeconds;
    this.adminEmailSet = buildAdminEmailSet(adminEmails);
  }

  shouldPromoteToAdmin(email) {
    return isAdminEmail(email, this.adminEmailSet);
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
      throw new AppError("Este e-mail já está em uso.", "CONFLICT", 409, {
        field: "email",
      });
    }

    if (existingByUsername) {
      throw new AppError("Este nome de usuário já está em uso.", "CONFLICT", 409, {
        field: "username",
      });
    }

    const user = await this.authRepository.createUser({
      username,
      email,
      passwordHash: hashPassword(payload.password),
      role: this.shouldPromoteToAdmin(email) ? "admin" : "user",
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
    let user = await this.authRepository.findByEmail(email);

    if (!user || !verifyPassword(payload.password, user.passwordHash)) {
      throw new AppError("E-mail ou senha inválidos.", "INVALID_CREDENTIALS", 401);
    }

    if (user.role !== "admin" && this.shouldPromoteToAdmin(email)) {
      user = await this.authRepository.updateRoleById(user.id, "admin");
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
