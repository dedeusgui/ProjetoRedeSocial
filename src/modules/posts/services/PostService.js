import AppError from "../../../common/errors/AppError.js";
import { buildPrivateMetricsFromAuthorSummary } from "../../../common/metrics/moderationMetrics.js";
import { ensureObjectId, requireFields } from "../../../common/validation/index.js";

class PostService {
  constructor(postRepository, commentService, userService) {
    this.postRepository = postRepository;
    this.commentService = commentService;
    this.userService = userService;
  }

  formatModerationMetrics(post) {
    return {
      approvedCount: post.moderationMetrics?.approvedCount ?? 0,
      notRelevantCount: post.moderationMetrics?.notRelevantCount ?? 0,
      totalReviews: post.moderationMetrics?.totalReviews ?? 0,
      approvalPercentage: post.moderationMetrics?.approvalPercentage ?? 0,
      notRelevantPercentage: post.moderationMetrics?.notRelevantPercentage ?? 0,
    };
  }

  async createPost(authorId, payload) {
    requireFields(payload, ["title", "content"]);

    const tags = Array.isArray(payload.tags)
      ? payload.tags
          .map((tag) => String(tag).trim())
          .filter((tag) => tag.length > 0)
      : [];

    const post = await this.postRepository.create({
      authorId,
      title: payload.title.trim(),
      content: payload.content.trim(),
      tags,
      status: "published",
      trend: "neutral",
      moderationMetrics: {
        approvedCount: 0,
        notRelevantCount: 0,
        totalReviews: 0,
        approvalPercentage: 0,
        notRelevantPercentage: 0,
      },
    });

    return {
      id: post.id,
      title: post.title,
      content: post.content,
      tags: post.tags,
      status: post.status,
      trend: post.trend,
      moderationMetrics: this.formatModerationMetrics(post),
      createdAt: post.createdAt,
    };
  }

  validateEditablePostFields(payload) {
    const nextTitle = payload.title !== undefined ? String(payload.title).trim() : null;
    const nextContent = payload.content !== undefined ? String(payload.content).trim() : null;

    if (nextTitle !== null && nextTitle.length === 0) {
      throw new AppError("Field title cannot be empty", "VALIDATION_ERROR", 400);
    }

    if (nextContent !== null && nextContent.length === 0) {
      throw new AppError("Field content cannot be empty", "VALIDATION_ERROR", 400);
    }

    if (nextTitle !== null && nextTitle.length > 120) {
      throw new AppError("Field title exceeds 120 characters", "VALIDATION_ERROR", 400);
    }

    if (nextContent !== null && nextContent.length > 5000) {
      throw new AppError("Field content exceeds 5000 characters", "VALIDATION_ERROR", 400);
    }

    if (payload.tags !== undefined && !Array.isArray(payload.tags)) {
      throw new AppError("Field tags must be an array", "VALIDATION_ERROR", 400);
    }
  }

  normalizePostUpdatePayload(payload) {
    const updates = {};

    if (payload.title !== undefined) {
      updates.title = String(payload.title).trim();
    }

    if (payload.content !== undefined) {
      updates.content = String(payload.content).trim();
    }

    if (payload.tags !== undefined) {
      updates.tags = payload.tags
        .map((tag) => String(tag).trim())
        .filter((tag) => tag.length > 0);
    }

    return updates;
  }

  async getPostWithComments(postId) {
    ensureObjectId(postId, "postId");

    const post = await this.postRepository.findById(postId);
    if (!post || post.status === "hidden") {
      throw new AppError("Post not found", "NOT_FOUND", 404);
    }

    const comments = await this.commentService.listVisibleByPostId(postId);

    return {
      id: post.id,
      author: {
        id: post.authorId?.id,
        username: post.authorId?.username,
      },
      title: post.title,
      content: post.content,
      tags: post.tags,
      trend: post.trend,
      moderationMetrics: this.formatModerationMetrics(post),
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      comments,
    };
  }

  async getPostForModeration(postId) {
    ensureObjectId(postId, "postId");
    const post = await this.postRepository.findByIdOrNull(postId);

    if (!post) {
      throw new AppError("Post not found", "NOT_FOUND", 404);
    }

    return post;
  }

  async updatePostTrend(postId, trend) {
    const updated = await this.postRepository.updateTrend(postId, trend);

    if (!updated) {
      throw new AppError("Post not found", "NOT_FOUND", 404);
    }

    return updated;
  }

  async updatePostModeration(postId, trend, moderationMetrics) {
    const updated = await this.postRepository.updateTrendAndModerationMetrics(
      postId,
      trend,
      moderationMetrics,
    );

    if (!updated) {
      throw new AppError("Post not found", "NOT_FOUND", 404);
    }

    return updated;
  }

  async refreshAuthorPrivateMetrics(authorId) {
    const summary = await this.postRepository.summarizeAuthorModeration(authorId);
    const privateMetrics = buildPrivateMetricsFromAuthorSummary(summary);
    await this.userService.updatePrivateMetrics(authorId, privateMetrics);
  }

  async updatePostByRequester(postId, requester, payload) {
    ensureObjectId(postId, "postId");
    const post = await this.postRepository.findByIdOrNull(postId);
    if (!post) {
      throw new AppError("Post not found", "NOT_FOUND", 404);
    }

    const isOwner = String(post.authorId) === String(requester?.id);
    if (!isOwner) {
      throw new AppError("You do not have permission to edit this post", "FORBIDDEN", 403);
    }

    const source = payload ?? {};
    this.validateEditablePostFields(source);
    const updates = this.normalizePostUpdatePayload(source);
    const hasUpdates = Object.keys(updates).length > 0;
    if (!hasUpdates) {
      throw new AppError(
        "Provide at least one field to update: title, content or tags",
        "VALIDATION_ERROR",
        400,
      );
    }

    const updated = await this.postRepository.updateById(postId, updates);
    if (!updated) {
      throw new AppError("Post not found", "NOT_FOUND", 404);
    }

    return {
      id: updated.id,
      title: updated.title,
      content: updated.content,
      tags: updated.tags,
      updatedAt: updated.updatedAt,
    };
  }

  async deletePostByRequester(postId, requester) {
    ensureObjectId(postId, "postId");
    const post = await this.postRepository.findByIdOrNull(postId);
    if (!post) {
      throw new AppError("Post not found", "NOT_FOUND", 404);
    }

    const isOwner = String(post.authorId) === String(requester?.id);
    const isModeratorOrAdmin = ["moderator", "admin"].includes(requester?.role ?? "");
    if (!isOwner && !isModeratorOrAdmin) {
      throw new AppError("You do not have permission to delete this post", "FORBIDDEN", 403);
    }

    const deleted = await this.postRepository.deleteWithRelations(postId);

    if (!deleted) {
      throw new AppError("Post not found", "NOT_FOUND", 404);
    }

    await this.refreshAuthorPrivateMetrics(post.authorId);

    return {
      id: deleted.id,
      title: deleted.title,
      deletedAt: new Date().toISOString(),
    };
  }
}

export default PostService;
