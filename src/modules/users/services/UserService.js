import AppError from "../../../common/errors/AppError.js";
import { resolveUnifiedScoreFromPrivateMetrics } from "../../../common/metrics/moderationMetrics.js";

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
        score: resolveUnifiedScoreFromPrivateMetrics(user.privateMetrics),
        totalReviews: user.privateMetrics?.totalReviews ?? 0,
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
