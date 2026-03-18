import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import AppError from "../../../common/errors/AppError.js";
import {
  POST_MEDIA_KIND_IMAGE,
  POST_MEDIA_MAX_ITEMS,
  formatPostMediaCollection,
} from "../../../common/media/postMedia.js";
import { buildPrivateMetricsFromAuthorSummary } from "../../../common/metrics/moderationMetrics.js";
import {
  formatQuestionnaire,
  validateQuestionnaireShape,
} from "../../../common/posts/questionnaire.js";
import { buildSequenceSummary, resolvePreviousPostId } from "../../../common/posts/sequence.js";
import { buildPublicAuthorSummary } from "../../../common/users/publicAuthor.js";
import { ensureObjectId, requireFields } from "../../../common/validation/index.js";

const POST_TITLE_MAX_LENGTH = 100;
const POST_CONTENT_MAX_LENGTH = 3000;

class PostService {
  constructor(postRepository, commentService, userService, collectionService = null) {
    this.postRepository = postRepository;
    this.commentService = commentService;
    this.userService = userService;
    this.collectionService = collectionService;
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

  async buildSequenceNextMap(postIds) {
    const rows = await this.postRepository.findByPreviousPostIds(postIds);
    return new Map(
      rows
        .filter((row) => row.sequence?.previousPostId)
        .map((row) => [String(row.sequence.previousPostId), String(row._id)]),
    );
  }

  async buildCollectionSummaryMap(postIds) {
    if (!this.collectionService) {
      return new Map();
    }

    return this.collectionService.listCollectionSummariesByPostIds(postIds);
  }

  buildPostSummary(post, { nextPostIdMap = new Map(), collectionMap = new Map(), includeAuthor = false } = {}) {
    const nextPostId = nextPostIdMap.get(String(post.id));
    const summary = {
      id: post.id,
      title: post.title,
      content: post.content,
      tags: post.tags,
      media: formatPostMediaCollection(post.media),
      questionnaire: formatQuestionnaire(post.questionnaire),
      status: post.status,
      trend: post.trend,
      moderationMetrics: this.formatModerationMetrics(post),
      sequence: buildSequenceSummary(post, {
        hasNext: Boolean(nextPostId),
        nextPostId,
      }),
      collections: collectionMap.get(String(post.id)) ?? [],
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };

    if (includeAuthor) {
      summary.author = buildPublicAuthorSummary(post.authorId);
    }

    return summary;
  }

  ensurePostOwner(post, requester, message) {
    const isOwner = String(post.authorId) === String(requester?.id);
    if (!isOwner) {
      throw new AppError(message, "FORBIDDEN", 403);
    }
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

  buildMediaPayload(files) {
    return (Array.isArray(files) ? files : []).map((file) => ({
      id: crypto.randomUUID(),
      kind: POST_MEDIA_KIND_IMAGE,
      url: `/uploads/posts/${encodeURIComponent(path.basename(path.dirname(file.path)))}/${encodeURIComponent(file.filename)}`,
      storagePath: file.path,
      originalName: String(file.originalname ?? "").trim() || file.filename,
      mimeType: file.mimetype,
      sizeBytes: file.size ?? 0,
      createdAt: new Date(),
    }));
  }

  normalizePreviousPostId(value) {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : null;
  }

  async validatePreviousPostId({ authorId, currentPostId = null, previousPostId }) {
    if (previousPostId === undefined) {
      return undefined;
    }

    if (previousPostId === null) {
      return null;
    }

    ensureObjectId(previousPostId, "previousPostId");

    if (currentPostId && String(previousPostId) === String(currentPostId)) {
      throw new AppError(
        "A post cannot continue itself.",
        "VALIDATION_ERROR",
        400,
        {
          field: "previousPostId",
        },
      );
    }

    const previousPost = await this.postRepository.findByIdOrNull(previousPostId);
    if (!previousPost || previousPost.status === "hidden") {
      throw new AppError("Previous post not found.", "NOT_FOUND", 404);
    }

    if (String(previousPost.authorId) !== String(authorId)) {
      throw new AppError(
        "You can only create sequences from your own posts.",
        "FORBIDDEN",
        403,
      );
    }

    const currentNextPost = await this.postRepository.findByPreviousPostId(previousPostId);
    if (currentNextPost && String(currentNextPost.id) !== String(currentPostId ?? "")) {
      throw new AppError(
        "This post already has a continuation.",
        "CONFLICT",
        409,
        {
          field: "previousPostId",
          previousPostId,
          nextPostId: currentNextPost.id,
        },
      );
    }

    if (!currentPostId) {
      return previousPostId;
    }

    const visited = new Set([String(currentPostId)]);
    let cursor = previousPost;
    while (cursor) {
      const cursorId = String(cursor.id ?? cursor._id);
      if (visited.has(cursorId)) {
        throw new AppError(
          "The selected sequence creates an invalid cycle.",
          "VALIDATION_ERROR",
          400,
          {
            field: "previousPostId",
          },
        );
      }

      visited.add(cursorId);
      const parentId = resolvePreviousPostId(cursor);
      if (!parentId) {
        break;
      }

      cursor = await this.postRepository.findByIdOrNull(parentId);
      if (cursor?.status === "hidden") {
        break;
      }
    }

    return previousPostId;
  }

  validateEditablePostFields(payload) {
    const nextTitle = payload.title !== undefined ? String(payload.title).trim() : null;
    const nextContent = payload.content !== undefined ? String(payload.content).trim() : null;

    if (nextTitle !== null && nextTitle.length === 0) {
      throw new AppError("The post title cannot be empty.", "VALIDATION_ERROR", 400, {
        field: "title",
      });
    }

    if (nextContent !== null && nextContent.length === 0) {
      throw new AppError("The post content cannot be empty.", "VALIDATION_ERROR", 400, {
        field: "content",
      });
    }

    if (nextTitle !== null && nextTitle.length > POST_TITLE_MAX_LENGTH) {
      throw new AppError(
        `The post title must be at most ${POST_TITLE_MAX_LENGTH} characters.`,
        "VALIDATION_ERROR",
        400,
        {
          field: "title",
          maxLength: POST_TITLE_MAX_LENGTH,
          actualLength: nextTitle.length,
        },
      );
    }

    if (nextContent !== null && nextContent.length > POST_CONTENT_MAX_LENGTH) {
      throw new AppError(
        `The post content must be at most ${POST_CONTENT_MAX_LENGTH} characters.`,
        "VALIDATION_ERROR",
        400,
        {
          field: "content",
          maxLength: POST_CONTENT_MAX_LENGTH,
          actualLength: nextContent.length,
        },
      );
    }

    if (payload.tags !== undefined && !Array.isArray(payload.tags)) {
      throw new AppError("Post tags must be sent as a list.", "VALIDATION_ERROR", 400, {
        field: "tags",
      });
    }

    if (payload.questionnaire !== undefined) {
      validateQuestionnaireShape(payload.questionnaire);
    }
  }

  async normalizePostCreatePayload(authorId, payload) {
    const normalizedPreviousPostId = this.normalizePreviousPostId(payload.previousPostId);
    const previousPostId = await this.validatePreviousPostId({
      authorId,
      previousPostId: normalizedPreviousPostId,
    });

    return {
      authorId,
      title: payload.title.trim(),
      content: payload.content.trim(),
      tags: Array.isArray(payload.tags)
        ? payload.tags
            .map((tag) => String(tag).trim())
            .filter((tag) => tag.length > 0)
        : [],
      media: [],
      questionnaire: validateQuestionnaireShape(payload.questionnaire) ?? null,
      sequence: previousPostId ? { previousPostId } : null,
      status: "published",
      trend: "neutral",
      moderationMetrics: {
        approvedCount: 0,
        notRelevantCount: 0,
        totalReviews: 0,
        approvalPercentage: 0,
        notRelevantPercentage: 0,
      },
    };
  }

  async normalizePostUpdatePayload(post, payload) {
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

    if (payload.questionnaire !== undefined) {
      updates.questionnaire = validateQuestionnaireShape(payload.questionnaire);
    }

    if (payload.previousPostId !== undefined) {
      const normalizedPreviousPostId = this.normalizePreviousPostId(payload.previousPostId);
      const previousPostId = await this.validatePreviousPostId({
        authorId: post.authorId,
        currentPostId: post.id,
        previousPostId: normalizedPreviousPostId,
      });
      updates.sequence = previousPostId ? { previousPostId } : null;
    }

    return updates;
  }

  async createPost(authorId, payload) {
    requireFields(payload, ["title", "content"]);
    this.validateEditablePostFields(payload);

    const post = await this.postRepository.create(await this.normalizePostCreatePayload(authorId, payload));
    const nextPostIdMap = await this.buildSequenceNextMap([post.id]);
    const collectionMap = await this.buildCollectionSummaryMap([post.id]);

    return this.buildPostSummary(post, {
      nextPostIdMap,
      collectionMap,
    });
  }

  async getPostWithComments(postId) {
    ensureObjectId(postId, "postId");

    const post = await this.postRepository.findById(postId);
    if (!post || post.status === "hidden") {
      throw new AppError("Post not found.", "NOT_FOUND", 404);
    }

    const comments = await this.commentService.listVisibleByPostId(postId);
    const [nextPost, collectionMap] = await Promise.all([
      this.postRepository.findVisibleByPreviousPostId(postId),
      this.buildCollectionSummaryMap([post.id]),
    ]);

    return {
      ...this.buildPostSummary(post, {
        nextPostIdMap: new Map(nextPost ? [[post.id, nextPost.id]] : []),
        collectionMap,
        includeAuthor: true,
      }),
      comments,
    };
  }

  async getPostSequence(postId) {
    ensureObjectId(postId, "postId");
    const post = await this.postRepository.findById(postId);
    if (!post || post.status === "hidden") {
      throw new AppError("Post not found.", "NOT_FOUND", 404);
    }

    const visited = new Set([String(post.id)]);
    const chain = [post];

    let current = post;
    while (true) {
      const previousPostId = resolvePreviousPostId(current);
      if (!previousPostId) {
        break;
      }

      const previous = await this.postRepository.findById(previousPostId);
      if (!previous || previous.status === "hidden") {
        break;
      }

      const previousId = String(previous.id);
      if (visited.has(previousId)) {
        break;
      }

      visited.add(previousId);
      chain.unshift(previous);
      current = previous;
    }

    current = post;
    while (true) {
      const next = await this.postRepository.findVisibleByPreviousPostId(current.id);
      if (!next) {
        break;
      }

      const nextId = String(next.id);
      if (visited.has(nextId)) {
        break;
      }

      visited.add(nextId);
      chain.push(next);
      current = next;
    }

    const nextPostIdMap = await this.buildSequenceNextMap(chain.map((item) => item.id));

    return {
      postId: post.id,
      rootPostId: chain[0]?.id ?? post.id,
      items: chain.map((item) =>
        this.buildPostSummary(item, {
          nextPostIdMap,
          includeAuthor: true,
        })),
    };
  }

  async getPostForModeration(postId) {
    ensureObjectId(postId, "postId");
    const post = await this.postRepository.findByIdOrNull(postId);

    if (!post) {
      throw new AppError("Post not found.", "NOT_FOUND", 404);
    }

    return post;
  }

  async updatePostTrend(postId, trend) {
    const updated = await this.postRepository.updateTrend(postId, trend);

    if (!updated) {
      throw new AppError("Post not found.", "NOT_FOUND", 404);
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
      throw new AppError("Post not found.", "NOT_FOUND", 404);
    }

    return updated;
  }

  async refreshAuthorPrivateMetrics(authorId) {
    const summary = await this.postRepository.summarizeAuthorModeration(authorId);
    const privateMetrics = buildPrivateMetricsFromAuthorSummary(summary);
    await this.userService.updatePrivateMetrics(authorId, privateMetrics);
  }

  async listPostsByRequester(authorId) {
    const posts = await this.postRepository.listByAuthorIdWithAuthor(authorId);
    const postIds = posts.map((post) => post.id);
    const [nextPostIdMap, collectionMap] = await Promise.all([
      this.buildSequenceNextMap(postIds),
      this.buildCollectionSummaryMap(postIds),
    ]);

    return posts.map((post) =>
      this.buildPostSummary(post, {
        nextPostIdMap,
        collectionMap,
        includeAuthor: true,
      }),
    );
  }

  async updatePostByRequester(postId, requester, payload) {
    ensureObjectId(postId, "postId");
    const post = await this.postRepository.findById(postId);
    if (!post) {
      throw new AppError("Post not found.", "NOT_FOUND", 404);
    }

    this.ensurePostOwner(post, requester, "You do not have permission to edit this post.");

    const source = payload ?? {};
    this.validateEditablePostFields(source);
    const updates = await this.normalizePostUpdatePayload(post, source);
    const hasUpdates = Object.keys(updates).length > 0;
    if (!hasUpdates) {
      throw new AppError(
        "Provide at least one field to update: title, content, tags, questionnaire, or previous post.",
        "VALIDATION_ERROR",
        400,
        {
          fields: ["title", "content", "tags", "questionnaire", "previousPostId"],
        },
      );
    }

    const updated = await this.postRepository.updateById(postId, updates);
    if (!updated) {
      throw new AppError("Post not found.", "NOT_FOUND", 404);
    }

    const [nextPostIdMap, collectionMap] = await Promise.all([
      this.buildSequenceNextMap([updated.id]),
      this.buildCollectionSummaryMap([updated.id]),
    ]);

    return this.buildPostSummary(updated, {
      nextPostIdMap,
      collectionMap,
      includeAuthor: true,
    });
  }

  async addMediaByRequester(postId, requester, files) {
    ensureObjectId(postId, "postId");

    const uploadedFiles = Array.isArray(files) ? files : [];
    if (uploadedFiles.length === 0) {
      throw new AppError("Upload at least one image.", "VALIDATION_ERROR", 400, {
        field: "media",
      });
    }

    const post = await this.postRepository.findByIdOrNull(postId);
    if (!post) {
      await this.safeDeleteFiles(uploadedFiles.map((file) => file.path));
      throw new AppError("Post not found.", "NOT_FOUND", 404);
    }

    try {
      this.ensurePostOwner(post, requester, "You do not have permission to manage this post's images.");

      const currentMediaCount = Array.isArray(post.media) ? post.media.length : 0;
      if (currentMediaCount + uploadedFiles.length > POST_MEDIA_MAX_ITEMS) {
        throw new AppError(
          `A post can include at most ${POST_MEDIA_MAX_ITEMS} images.`,
          "VALIDATION_ERROR",
          400,
          {
            field: "media",
            maxItems: POST_MEDIA_MAX_ITEMS,
            currentItems: currentMediaCount,
            incomingItems: uploadedFiles.length,
          },
        );
      }

      const mediaPayload = this.buildMediaPayload(uploadedFiles);
      const updated = await this.postRepository.appendMedia(postId, mediaPayload);
      if (!updated) {
        throw new AppError("Post not found.", "NOT_FOUND", 404);
      }

      return {
        id: updated.id,
        media: formatPostMediaCollection(updated.media),
        updatedAt: updated.updatedAt,
      };
    } catch (error) {
      await this.safeDeleteFiles(uploadedFiles.map((file) => file.path));
      throw error;
    }
  }

  async removeMediaByRequester(postId, mediaId, requester) {
    ensureObjectId(postId, "postId");

    const post = await this.postRepository.findByIdOrNull(postId);
    if (!post) {
      throw new AppError("Post not found.", "NOT_FOUND", 404);
    }

    this.ensurePostOwner(post, requester, "You do not have permission to manage this post's images.");

    const mediaItem = (Array.isArray(post.media) ? post.media : []).find(
      (item) => String(item.id) === String(mediaId),
    );

    if (!mediaItem) {
      throw new AppError("Post image not found.", "NOT_FOUND", 404);
    }

    const updated = await this.postRepository.removeMedia(postId, mediaId);
    if (!updated) {
      throw new AppError("Post not found.", "NOT_FOUND", 404);
    }

    await this.safeDeleteFiles([mediaItem.storagePath]);

    return {
      id: updated.id,
      media: formatPostMediaCollection(updated.media),
      updatedAt: updated.updatedAt,
    };
  }

  async deletePostByRequester(postId, requester) {
    ensureObjectId(postId, "postId");
    const post = await this.postRepository.findByIdOrNull(postId);
    if (!post) {
      throw new AppError("Post not found.", "NOT_FOUND", 404);
    }

    const isOwner = String(post.authorId) === String(requester?.id);
    const isModeratorOrAdmin = ["moderator", "admin"].includes(requester?.role ?? "");
    if (!isOwner && !isModeratorOrAdmin) {
      throw new AppError("You do not have permission to delete this post.", "FORBIDDEN", 403);
    }

    const deleted = await this.postRepository.deleteWithRelations(postId);

    if (!deleted) {
      throw new AppError("Post not found.", "NOT_FOUND", 404);
    }

    await this.safeDeleteFiles(
      (Array.isArray(post.media) ? post.media : []).map((mediaItem) => mediaItem.storagePath),
    );

    if (this.collectionService) {
      await this.collectionService.removePostReferences(postId);
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

