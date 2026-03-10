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
import { ensureObjectId, requireFields } from "../../../common/validation/index.js";

const POST_TITLE_MAX_LENGTH = 120;
const POST_CONTENT_MAX_LENGTH = 5000;

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

  formatPostSummary(post) {
    return {
      id: post.id,
      title: post.title,
      content: post.content,
      tags: post.tags,
      media: formatPostMediaCollection(post.media),
      status: post.status,
      trend: post.trend,
      moderationMetrics: this.formatModerationMetrics(post),
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
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
      media: [],
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

    return this.formatPostSummary(post);
  }

  validateEditablePostFields(payload) {
    const nextTitle = payload.title !== undefined ? String(payload.title).trim() : null;
    const nextContent = payload.content !== undefined ? String(payload.content).trim() : null;

    if (nextTitle !== null && nextTitle.length === 0) {
      throw new AppError("O título do post não pode ficar vazio.", "VALIDATION_ERROR", 400, {
        field: "title",
      });
    }

    if (nextContent !== null && nextContent.length === 0) {
      throw new AppError("O conteúdo do post não pode ficar vazio.", "VALIDATION_ERROR", 400, {
        field: "content",
      });
    }

    if (nextTitle !== null && nextTitle.length > POST_TITLE_MAX_LENGTH) {
      throw new AppError(
        `O título do post deve ter no máximo ${POST_TITLE_MAX_LENGTH} caracteres.`,
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
        `O conteúdo do post deve ter no máximo ${POST_CONTENT_MAX_LENGTH} caracteres.`,
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
      throw new AppError("As tags do post devem ser enviadas em uma lista.", "VALIDATION_ERROR", 400, {
        field: "tags",
      });
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
      throw new AppError("Post não encontrado.", "NOT_FOUND", 404);
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
      media: formatPostMediaCollection(post.media),
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
      throw new AppError("Post não encontrado.", "NOT_FOUND", 404);
    }

    return post;
  }

  async updatePostTrend(postId, trend) {
    const updated = await this.postRepository.updateTrend(postId, trend);

    if (!updated) {
      throw new AppError("Post não encontrado.", "NOT_FOUND", 404);
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
      throw new AppError("Post não encontrado.", "NOT_FOUND", 404);
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
      throw new AppError("Post não encontrado.", "NOT_FOUND", 404);
    }

    this.ensurePostOwner(post, requester, "Você não tem permissão para editar este post.");

    const source = payload ?? {};
    this.validateEditablePostFields(source);
    const updates = this.normalizePostUpdatePayload(source);
    const hasUpdates = Object.keys(updates).length > 0;
    if (!hasUpdates) {
      throw new AppError(
        "Informe pelo menos um campo para atualizar: título, conteúdo ou tags.",
        "VALIDATION_ERROR",
        400,
        {
          fields: ["title", "content", "tags"],
        },
      );
    }

    const updated = await this.postRepository.updateById(postId, updates);
    if (!updated) {
      throw new AppError("Post não encontrado.", "NOT_FOUND", 404);
    }

    return {
      id: updated.id,
      title: updated.title,
      content: updated.content,
      tags: updated.tags,
      media: formatPostMediaCollection(updated.media),
      updatedAt: updated.updatedAt,
    };
  }

  async addMediaByRequester(postId, requester, files) {
    ensureObjectId(postId, "postId");

    const uploadedFiles = Array.isArray(files) ? files : [];
    if (uploadedFiles.length === 0) {
      throw new AppError("Envie pelo menos uma imagem.", "VALIDATION_ERROR", 400, {
        field: "media",
      });
    }

    const post = await this.postRepository.findByIdOrNull(postId);
    if (!post) {
      await this.safeDeleteFiles(uploadedFiles.map((file) => file.path));
      throw new AppError("Post não encontrado.", "NOT_FOUND", 404);
    }

    try {
      this.ensurePostOwner(post, requester, "Você não tem permissão para gerenciar as imagens deste post.");

      const currentMediaCount = Array.isArray(post.media) ? post.media.length : 0;
      if (currentMediaCount + uploadedFiles.length > POST_MEDIA_MAX_ITEMS) {
        throw new AppError(
          `Um post pode ter no máximo ${POST_MEDIA_MAX_ITEMS} imagens.`,
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
        throw new AppError("Post não encontrado.", "NOT_FOUND", 404);
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
      throw new AppError("Post não encontrado.", "NOT_FOUND", 404);
    }

    this.ensurePostOwner(post, requester, "Você não tem permissão para gerenciar as imagens deste post.");

    const mediaItem = (Array.isArray(post.media) ? post.media : []).find(
      (item) => String(item.id) === String(mediaId),
    );

    if (!mediaItem) {
      throw new AppError("Imagem do post não encontrada.", "NOT_FOUND", 404);
    }

    const updated = await this.postRepository.removeMedia(postId, mediaId);
    if (!updated) {
      throw new AppError("Post não encontrado.", "NOT_FOUND", 404);
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
      throw new AppError("Post não encontrado.", "NOT_FOUND", 404);
    }

    const isOwner = String(post.authorId) === String(requester?.id);
    const isModeratorOrAdmin = ["moderator", "admin"].includes(requester?.role ?? "");
    if (!isOwner && !isModeratorOrAdmin) {
      throw new AppError("Você não tem permissão para excluir este post.", "FORBIDDEN", 403);
    }

    const deleted = await this.postRepository.deleteWithRelations(postId);

    if (!deleted) {
      throw new AppError("Post não encontrado.", "NOT_FOUND", 404);
    }

    await this.safeDeleteFiles(
      (Array.isArray(post.media) ? post.media : []).map((mediaItem) => mediaItem.storagePath),
    );
    await this.refreshAuthorPrivateMetrics(post.authorId);

    return {
      id: deleted.id,
      title: deleted.title,
      deletedAt: new Date().toISOString(),
    };
  }
}

export default PostService;
