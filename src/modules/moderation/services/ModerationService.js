import AppError from "../../../common/errors/AppError.js";
import {
  buildPostModerationMetrics,
  resolveTrend,
} from "../../../common/metrics/moderationMetrics.js";
import { ensureObjectId, requireFields } from "../../../common/validation/index.js";

class ModerationService {
  constructor(moderationRepository, postService) {
    this.moderationRepository = moderationRepository;
    this.postService = postService;
  }

  async createReview({ postId, reviewerId, decision, reason }) {
    ensureObjectId(postId, "postId");
    requireFields({ decision }, ["decision"]);

    if (!["approved", "not_relevant"].includes(decision)) {
      throw new AppError("Invalid decision", "VALIDATION_ERROR", 400);
    }

    const post = await this.postService.getPostForModeration(postId);
    if (String(post.authorId) === String(reviewerId)) {
      throw new AppError("Authors cannot review their own posts", "FORBIDDEN", 403);
    }

    const review = await this.moderationRepository.upsertReview({
      postId,
      reviewerId,
      decision,
      reason: reason ?? null,
    });

    const postSummary = await this.moderationRepository.countPostDecisions(postId);
    const moderationMetrics = buildPostModerationMetrics(
      postSummary.approved,
      postSummary.not_relevant,
    );
    const trend = resolveTrend(postSummary.approved, postSummary.not_relevant);
    await this.postService.updatePostModeration(postId, trend, moderationMetrics);
    await this.postService.refreshAuthorPrivateMetrics(post.authorId);

    return {
      id: review.id,
      postId,
      decision: review.decision,
      trend,
      moderationMetrics,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    };
  }
}

export default ModerationService;
