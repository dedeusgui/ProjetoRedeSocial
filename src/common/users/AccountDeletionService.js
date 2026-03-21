import fs from "node:fs/promises";
import path from "node:path";
import AppError from "../errors/AppError.js";
import {
  buildPostModerationMetrics,
  buildPrivateMetricsFromAuthorSummary,
  resolveTrend,
} from "../metrics/moderationMetrics.js";
import { buildAdminEmailSet, normalizeEmail } from "../security/adminAccess.js";
import { ensureObjectId } from "../validation/index.js";

class AccountDeletionService {
  constructor(accountDeletionRepository, adminEmails = []) {
    this.accountDeletionRepository = accountDeletionRepository;
    this.adminEmailSet = buildAdminEmailSet(adminEmails);
  }

  async safeDeleteFiles(filePaths) {
    await Promise.all(
      (Array.isArray(filePaths) ? filePaths : [])
        .filter((filePath) => typeof filePath === "string" && filePath.length > 0)
        .map(async (filePath) => {
          try {
            await fs.unlink(filePath);
            await this.removeEmptyParentDirectory(filePath);
          } catch (error) {
            if (error?.code !== "ENOENT" && error?.code !== "ENOTEMPTY") {
              console.error(`Failed to remove uploaded file: ${filePath}`, error);
            }
          }
        }),
    );
  }

  async removeEmptyParentDirectory(filePath) {
    const parentDirectory = path.dirname(String(filePath ?? ""));
    if (!parentDirectory || parentDirectory === "." || parentDirectory === path.dirname(parentDirectory)) {
      return;
    }

    try {
      await fs.rmdir(parentDirectory);
    } catch (error) {
      if (error?.code !== "ENOENT" && error?.code !== "ENOTEMPTY") {
        console.error(`Failed to remove upload directory: ${parentDirectory}`, error);
      }
    }
  }

  async recalculateDerivedStats() {
    const [postIds, userIds] = await Promise.all([
      this.accountDeletionRepository.listAllPostIds(),
      this.accountDeletionRepository.listAllUserIds(),
    ]);

    const postSummaryMap = await this.accountDeletionRepository.summarizePostDecisions(postIds);
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
    await this.accountDeletionRepository.updatePostTrends(trendUpdates);

    const authorSummaryMap = await this.accountDeletionRepository.summarizeAuthorPostMetrics();
    const metricUpdates = userIds.map((userId) => {
      const summary = authorSummaryMap.get(String(userId)) ?? null;
      const metrics = buildPrivateMetricsFromAuthorSummary(summary);

      return {
        userId,
        score: metrics.score,
        totalReviews: metrics.totalReviews,
      };
    });
    await this.accountDeletionRepository.updateUserPrivateMetrics(metricUpdates);
  }

  extractMediaStoragePaths(posts) {
    return (Array.isArray(posts) ? posts : []).flatMap((post) =>
      (Array.isArray(post.media) ? post.media : []).map((mediaItem) => mediaItem.storagePath),
    );
  }

  isConfigManagedAdmin(user) {
    return this.adminEmailSet.has(normalizeEmail(user?.email));
  }

  async loadTargetUser(userId) {
    ensureObjectId(userId, "userId");

    const user = await this.accountDeletionRepository.findUserById(userId);
    if (!user) {
      throw new AppError("User not found.", "NOT_FOUND", 404);
    }

    return user;
  }

  async performDeletion(user) {
    const authoredPosts = await this.accountDeletionRepository.findPostsByAuthorId(user._id);
    const postIds = authoredPosts.map((post) => post._id);
    const filePaths = [
      user.profileImage?.storagePath,
      ...this.extractMediaStoragePaths(authoredPosts),
    ];

    await Promise.all([
      this.accountDeletionRepository.deleteCollectionsByAuthorId(user._id),
      this.accountDeletionRepository.deleteCommentsByAuthorId(user._id),
      this.accountDeletionRepository.deleteReviewsByReviewerId(user._id),
      this.accountDeletionRepository.deletePostRelationsByPostIds(postIds),
      this.accountDeletionRepository.deleteUserById(user._id),
    ]);

    await this.safeDeleteFiles(filePaths);
    await this.recalculateDerivedStats();

    return {
      id: String(user._id),
      username: user.username,
      email: user.email,
      role: user.role,
      deletedAt: new Date().toISOString(),
    };
  }

  async deleteOwnAccount({ userId }) {
    const user = await this.loadTargetUser(userId);

    if (user.role === "admin") {
      throw new AppError(
        "Admin accounts cannot be deleted from the profile page.",
        "FORBIDDEN",
        403,
      );
    }

    return this.performDeletion(user);
  }

  async deleteByAdmin({ userId, requesterId }) {
    ensureObjectId(requesterId, "requesterId");

    if (String(userId) === String(requesterId)) {
      throw new AppError("An administrator cannot delete their own account.", "FORBIDDEN", 403);
    }

    const user = await this.loadTargetUser(userId);
    if (user.role === "admin" || this.isConfigManagedAdmin(user)) {
      throw new AppError(
        "The administrator role is controlled by the project configuration.",
        "FORBIDDEN",
        403,
      );
    }

    if (user.role !== "user") {
      throw new AppError(
        "Only standard users can be deleted from the admin tools.",
        "FORBIDDEN",
        403,
      );
    }

    return this.performDeletion(user);
  }
}

export default AccountDeletionService;
