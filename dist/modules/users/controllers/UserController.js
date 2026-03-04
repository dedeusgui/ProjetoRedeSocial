import { sendSuccess } from "../../../common/http/responses.js";

class UserController {
  constructor(userService) {
    this.userService = userService;
    this.getMeProfile = this.getMeProfile.bind(this);
  }

  async getMeProfile(req, res) {
    const profile = await this.userService.getMeProfile(req.user.id);
    return sendSuccess(res, profile);
  }
}

export default UserController;
