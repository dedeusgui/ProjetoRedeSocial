import AppError from "../../../common/errors/AppError.js";
import { buildPublicAuthorSummary } from "../../../common/users/publicAuthor.js";
import { ensureObjectId, requireFields } from "../../../common/validation/index.js";

class CommentService {
  constructor(commentRepository) {
    this.commentRepository = commentRepository;
  }

  async createComment({ postId, authorId, content }) {
    ensureObjectId(postId, "postId");
    requireFields({ content }, ["content"]);
    const normalizedContent = String(content).trim();
    if (normalizedContent.length > 2000) {
      throw new AppError(
        "The comment must be at most 2000 characters.",
        "VALIDATION_ERROR",
        400,
        {
          field: "content",
          maxLength: 2000,
          actualLength: normalizedContent.length,
        },
      );
    }

    const comment = await this.commentRepository.create({
      postId,
      authorId,
      content: normalizedContent,
      status: "visible",
    });

    return {
      id: comment.id,
      postId: comment.postId,
      authorId: comment.authorId,
      content: comment.content,
      status: comment.status,
      createdAt: comment.createdAt,
    };
  }

  async listVisibleByPostId(postId) {
    ensureObjectId(postId, "postId");

    const comments = await this.commentRepository.findVisibleByPostId(postId);

    return comments.map((comment) => ({
      id: comment.id,
      postId: comment.postId,
      author: buildPublicAuthorSummary(comment.authorId),
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    }));
  }

  async updateCommentByRequester(commentId, requester, payload) {
    ensureObjectId(commentId, "commentId");
    requireFields(payload, ["content"]);
    const content = String(payload.content).trim();
    if (content.length > 2000) {
      throw new AppError(
        "The comment must be at most 2000 characters.",
        "VALIDATION_ERROR",
        400,
        {
          field: "content",
          maxLength: 2000,
          actualLength: content.length,
        },
      );
    }

    const comment = await this.commentRepository.findByIdOrNull(commentId);
    if (!comment) {
      throw new AppError("Comment not found.", "NOT_FOUND", 404);
    }

    const isOwner = String(comment.authorId) === String(requester?.id ?? "");
    if (!isOwner) {
      throw new AppError("You do not have permission to edit this comment.", "FORBIDDEN", 403);
    }

    const updated = await this.commentRepository.updateById(commentId, { content });
    if (!updated) {
      throw new AppError("Comment not found.", "NOT_FOUND", 404);
    }

    return {
      id: updated.id,
      postId: updated.postId,
      content: updated.content,
      updatedAt: updated.updatedAt,
    };
  }

  async deleteCommentByRequester(commentId, requester) {
    ensureObjectId(commentId, "commentId");

    const comment = await this.commentRepository.findByIdOrNull(commentId);
    if (!comment) {
      throw new AppError("Comment not found.", "NOT_FOUND", 404);
    }

    const isOwner = String(comment.authorId) === String(requester?.id ?? "");
    const isPrivileged = ["moderator", "admin"].includes(requester?.role ?? "");
    if (!isOwner && !isPrivileged) {
      throw new AppError("You do not have permission to delete this comment.", "FORBIDDEN", 403);
    }

    const deleted = await this.commentRepository.deleteById(commentId);
    if (!deleted) {
      throw new AppError("Comment not found.", "NOT_FOUND", 404);
    }

    return {
      id: deleted.id,
      postId: deleted.postId,
      deletedAt: new Date().toISOString(),
    };
  }
}

export default CommentService;