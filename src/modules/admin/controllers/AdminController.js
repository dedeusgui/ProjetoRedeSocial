import { sendSuccess } from "../../../common/http/responses.js";

class AdminController {
  constructor(adminService) {
    this.adminService = adminService;
    this.getUsersWithRoles = this.getUsersWithRoles.bind(this);
    this.getModeratorEligibility = this.getModeratorEligibility.bind(this);
    this.updateModeratorRole = this.updateModeratorRole.bind(this);
    this.deleteUserByAdmin = this.deleteUserByAdmin.bind(this);
  }

  async getUsersWithRoles(req, res) {
    const result = await this.adminService.listUsersWithRoles();
    return sendSuccess(res, result);
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

  async deleteUserByAdmin(req, res) {
    const result = await this.adminService.deleteUserByAdmin({
      userId: req.params.id,
      requesterId: req.user.id,
    });
    return sendSuccess(res, result);
  }
}

export default AdminController;
