import { sendSuccess } from "../../../common/http/responses.js";

class AuthController {
  constructor(authService) {
    this.authService = authService;
    this.register = this.register.bind(this);
    this.login = this.login.bind(this);
  }

  async register(req, res) {
    const result = await this.authService.register(req.body);
    return sendSuccess(res, result, 201);
  }

  async login(req, res) {
    const result = await this.authService.login(req.body);
    return sendSuccess(res, result, 200);
  }
}

export default AuthController;
