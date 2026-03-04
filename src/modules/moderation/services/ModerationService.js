import AppError from "../../../common/errors/AppError.js";
import { ensureObjectId, requireFields } from "../../../common/validation/index.js";

class ModerationService {
  constructor(moderationRepository, postService, userService) {
    this.moderationRepository = moderationRepository;
    this.postService = postService;
    this.userService = userService;
  }

  calculateValidationScore(approved, notRelevant) {
    const total = approved + notRelevant;

    if (total === 0) {
      return 0;
    }

    return ((approved - notRelevant) / total) * 100;
  }

  resolveTrend(approved, notRelevant) {
    const score = this.calculateValidationScore(approved, notRelevant);

    if (score >= 20) {
      return "positive";
    }

    if (score <= -20) {
      return "negative";
    }

    return "neutral";
  }

  calculatePercentages(approved, notRelevant) {
    const total = approved + notRelevant;

    if (total === 0) {
      return {
        approvalRate: 0,
        rejectionRate: 0,
      };
    }

    const approvalRate = Number(((approved / total) * 100).toFixed(2));
    const rejectionRate = Number(((notRelevant / total) * 100).toFixed(2));

    return {
      approvalRate,
      rejectionRate,
    };
  }

  async createReview({ postId, reviewerId, decision, reason }) {
    ensureObjectId(postId, "postId");
    requireFields({ decision }, ["decision"]);

    if (!["approved", "not_relevant"].includes(decision)) {
      throw new AppError("Invalid decision", "VALIDATION_ERROR", 400);
    }

    const post = await this.postService.getPostForModeration(postId);

    const review = await this.moderationRepository.upsertReview({
      postId,
      reviewerId,
      decision,
      reason: reason ?? null,
    });

    const postSummary = await this.moderationRepository.countPostDecisions(postId);
    const trend = this.resolveTrend(postSummary.approved, postSummary.not_relevant);
    await this.postService.updatePostTrend(postId, trend);

    const authorSummary = await this.moderationRepository.countAuthorDecisions(post.authorId);
    const metrics = this.calculatePercentages(
      authorSummary.approved,
      authorSummary.not_relevant,
    );
    await this.userService.updatePrivateMetrics(post.authorId, metrics);

    return {
      id: review.id,
      postId,
      decision: review.decision,
      trend,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}

export default ModerationService;
