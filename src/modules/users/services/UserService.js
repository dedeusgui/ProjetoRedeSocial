import AppError from "../../../common/errors/AppError.js";
import { resolveUnifiedScoreFromPrivateMetrics } from "../../../common/metrics/moderationMetrics.js";
import { normalizeFollowedTag, normalizeFollowedTags } from "../../../common/tags/followedTags.js";

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

  async getFollowedTags(userId) {
    const user = await this.userRepository.findFollowedTagsById(userId);

    if (!user) {
      throw new AppError("User not found", "NOT_FOUND", 404);
    }

    return normalizeFollowedTags(user.followedTags);
  }

  async followTag(userId, payload) {
    const tag = normalizeFollowedTag(payload?.tag);
    if (!tag) {
      throw new AppError("Field tag cannot be empty", "VALIDATION_ERROR", 400);
    }

    const updated = await this.userRepository.addFollowedTag(userId, tag);
    if (!updated) {
      throw new AppError("User not found", "NOT_FOUND", 404);
    }

    const followedTags = normalizeFollowedTags(updated.followedTags);
    await this.userRepository.replaceFollowedTags(userId, followedTags);

    return {
      tag,
      followedTags,
    };
  }

  async unfollowTag(userId, tagValue) {
    const tag = normalizeFollowedTag(tagValue);
    if (!tag) {
      throw new AppError("Field tag cannot be empty", "VALIDATION_ERROR", 400);
    }

    const updated = await this.userRepository.removeFollowedTag(userId, tag);
    if (!updated) {
      throw new AppError("User not found", "NOT_FOUND", 404);
    }

    return {
      removedTag: tag,
      followedTags: normalizeFollowedTags(updated.followedTags),
    };
  }
}

export default UserService;
