import AppError from "../../../common/errors/AppError.js";

class UserService {
  constructor(userRepository) {
    this.userRepository = userRepository;
  }

  async getMeProfile(userId) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError("User not found", "NOT_FOUND", 404);
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      privateMetrics: {
        approvalRate: user.privateMetrics.approvalRate,
        rejectionRate: user.privateMetrics.rejectionRate,
      },
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updatePrivateMetrics(userId, privateMetrics) {
    const updated = await this.userRepository.updatePrivateMetrics(userId, privateMetrics);

    if (!updated) {
      throw new AppError("User not found", "NOT_FOUND", 404);
    }

    return updated;
  }
}

export default UserService;
