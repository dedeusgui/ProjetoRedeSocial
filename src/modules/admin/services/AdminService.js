import AppError from "../../../common/errors/AppError.js";
import {
  buildPostModerationMetrics,
  buildPrivateMetricsFromAuthorSummary,
  resolveUnifiedScoreFromPrivateMetrics,
  resolveTrend,
} from "../../../common/metrics/moderationMetrics.js";
import { buildAdminEmailSet, normalizeEmail } from "../../../common/security/adminAccess.js";
import { ensureObjectId, requireFields } from "../../../common/validation/index.js";

const MODERATOR_REQUIREMENTS = Object.freeze({
  minPosts: 5,
  minAccountAgeDays: 14,
  minScore: 40,
});

class AdminService {
  constructor(adminRepository, adminEmails = []) {
    this.adminRepository = adminRepository;
    this.adminEmailSet = buildAdminEmailSet(adminEmails);
  }

  formatManagedUser(user, postCount = 0) {
    return {
      id: String(user._id),
      username: user.username,
      email: user.email,
      role: user.role,
      score: resolveUnifiedScoreFromPrivateMetrics(user.privateMetrics),
      totalReviews: user.privateMetrics?.totalReviews ?? 0,
      postCount,
      createdAt: user.createdAt,
    };
  }

  isEligibleForModerator(user, postCount) {
    const score = resolveUnifiedScoreFromPrivateMetrics(user.privateMetrics);
    const createdAt = user.createdAt ? new Date(user.createdAt).getTime() : Number.NaN;
    const minCreatedAt = Date.now() - MODERATOR_REQUIREMENTS.minAccountAgeDays * 24 * 60 * 60 * 1000;

    return (
      user.role === "user" &&
      postCount >= MODERATOR_REQUIREMENTS.minPosts &&
      Number.isFinite(createdAt) &&
      createdAt <= minCreatedAt &&
      score >= MODERATOR_REQUIREMENTS.minScore
    );
  }

  async syncAdminUsers() {
    const adminEmails = Array.from(this.adminEmailSet);
    return this.adminRepository.syncAdminRolesByEmails(adminEmails);
  }

  async listModeratorEligibility() {
    const minCreatedAt = new Date(
      Date.now() - MODERATOR_REQUIREMENTS.minAccountAgeDays * 24 * 60 * 60 * 1000,
    );

    const [candidates, moderators] = await Promise.all([
      this.adminRepository.findEligibleModeratorCandidates({
        minCreatedAt,
        minScore: MODERATOR_REQUIREMENTS.minScore,
      }),
      this.adminRepository.listModerators(),
    ]);

    const candidateIds = candidates.map((candidate) => candidate._id);
    const moderatorIds = moderators.map((moderator) => moderator._id);
    const [candidatePostCountMap, moderatorPostCountMap] = await Promise.all([
      this.adminRepository.countPostsByAuthorIds(candidateIds),
      this.adminRepository.countPostsByAuthorIds(moderatorIds),
    ]);

    const eligibleUsers = candidates
      .map((candidate) => {
        const postCount = candidatePostCountMap.get(String(candidate._id)) ?? 0;
        return {
          candidate,
          postCount,
        };
      })
      .filter(({ candidate, postCount }) => this.isEligibleForModerator(candidate, postCount))
      .map(({ candidate, postCount }) => this.formatManagedUser(candidate, postCount));

    return {
      requirements: MODERATOR_REQUIREMENTS,
      eligibleUsers,
      moderators: moderators.map((moderator) =>
        this.formatManagedUser(
          moderator,
          moderatorPostCountMap.get(String(moderator._id)) ?? 0,
        )),
    };
  }

  async listUsersWithRoles() {
    const users = await this.adminRepository.listUsersWithRoles();
    const userIds = users.map((user) => user._id);
    const postCountMap = await this.adminRepository.countPostsByAuthorIds(userIds);

    return users.map((user) =>
      this.formatManagedUser(
        user,
        postCountMap.get(String(user._id)) ?? 0,
      ));
  }

  async updateModeratorRole({ userId, action }) {
    ensureObjectId(userId, "id");
    requireFields({ action }, ["action"]);

    if (!["grant", "revoke"].includes(action)) {
      throw new AppError("Invalid action", "VALIDATION_ERROR", 400);
    }

    const user = await this.adminRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", "NOT_FOUND", 404);
    }

    if (user.role === "admin" || this.adminEmailSet.has(normalizeEmail(user.email))) {
      throw new AppError("Admin role is managed by project configuration", "FORBIDDEN", 403);
    }

    if (action === "grant") {
      if (user.role === "moderator") {
        return this.formatManagedUser(user);
      }

      const postCountMap = await this.adminRepository.countPostsByAuthorIds([user._id]);
      const postCount = postCountMap.get(String(user._id)) ?? 0;
      if (!this.isEligibleForModerator(user, postCount)) {
        throw new AppError("User does not meet moderator requirements", "FORBIDDEN", 403);
      }

      const updated = await this.adminRepository.updateRoleById(userId, "moderator");
      return this.formatManagedUser(updated, postCount);
    }

    if (user.role === "user") {
      return this.formatManagedUser(user);
    }

    const updated = await this.adminRepository.updateRoleById(userId, "user");
    return this.formatManagedUser(updated);
  }

  async recalculateDerivedStats() {
    const [postIds, userIds] = await Promise.all([
      this.adminRepository.listAllPostIds(),
      this.adminRepository.listAllUserIds(),
    ]);

    const postSummaryMap = await this.adminRepository.summarizePostDecisions(postIds);
    const trendUpdates = postIds.map((postId) => {
      const summary = postSummaryMap.get(String(postId)) ?? {
        approved: 0,
        notRelevant: 0,
      };

      return {
        postId,
        trend: resolveTrend(summary.approved, summary.notRelevant),
        ...buildPostModerationMetrics(summary.approved, summary.notRelevant),
      };
    });
    await this.adminRepository.updatePostTrends(trendUpdates);

    const authorSummaryMap = await this.adminRepository.summarizeAuthorPostMetrics();
    const metricUpdates = userIds.map((userId) => {
      const summary = authorSummaryMap.get(String(userId)) ?? null;
      const metrics = buildPrivateMetricsFromAuthorSummary(summary);

      return {
        userId,
        score: metrics.score,
        totalReviews: metrics.totalReviews,
      };
    });
    await this.adminRepository.updateUserPrivateMetrics(metricUpdates);
  }

  async deleteUserByAdmin({ userId, requesterId }) {
    ensureObjectId(userId, "id");
    ensureObjectId(requesterId, "requesterId");

    if (String(userId) === String(requesterId)) {
      throw new AppError("Admin cannot delete own account", "FORBIDDEN", 403);
    }

    const user = await this.adminRepository.findById(userId);
    if (!user) {
      throw new AppError("User not found", "NOT_FOUND", 404);
    }

    if (user.role === "admin" || this.adminEmailSet.has(normalizeEmail(user.email))) {
      throw new AppError("Admin role is managed by project configuration", "FORBIDDEN", 403);
    }

    const postIds = await this.adminRepository.findPostIdsByAuthorId(userId);
    await Promise.all([
      this.adminRepository.deleteCommentsByAuthorId(userId),
      this.adminRepository.deleteReviewsByReviewerId(userId),
      this.adminRepository.deletePostRelationsByPostIds(postIds),
      this.adminRepository.deleteUserById(userId),
    ]);

    await this.recalculateDerivedStats();

    return {
      id: String(user._id),
      username: user.username,
      email: user.email,
      role: user.role,
      deletedAt: new Date().toISOString(),
    };
  }
}

export default AdminService;
