import { sendSuccess } from "../../../common/http/responses.js";

class AdminController {
  constructor(adminService) {
    this.adminService = adminService;
    this.getModeratorEligibility = this.getModeratorEligibility.bind(this);
    this.updateModeratorRole = this.updateModeratorRole.bind(this);
  }

  async getModeratorEligibility(req, res) {
    const result = await this.adminService.listModeratorEligibility();
    return sendSuccess(res, result);
  }

  async updateModeratorRole(req, res) {
    const result = await this.adminService.updateModeratorRole({
      userId: req.params.id,
      action: req.body.action,
    });

    return sendSuccess(res, result);
  }
}

export default AdminController;
