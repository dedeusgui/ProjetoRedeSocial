import AppError from "../../../common/errors/AppError.js";
import { ensureObjectId, requireFields } from "../../../common/validation/index.js";

class CommentService {
  constructor(commentRepository) {
    this.commentRepository = commentRepository;
  }

  async createComment({ postId, authorId, content }) {
    ensureObjectId(postId, "postId");
    requireFields({ content }, ["content"]);

    const comment = await this.commentRepository.create({
      postId,
      authorId,
      content: content.trim(),
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
      author: {
        id: comment.authorId?.id,
        username: comment.authorId?.username,
      },
      content: comment.content,
      createdAt: comment.createdAt,
    }));
  }

  async deleteCommentByAdmin(commentId) {
    ensureObjectId(commentId, "commentId");

    const deleted = await this.commentRepository.deleteById(commentId);
    if (!deleted) {
      throw new AppError("Comment not found", "NOT_FOUND", 404);
    }

    return {
      id: deleted.id,
      postId: deleted.postId,
      deletedAt: new Date().toISOString(),
    };
  }
}

export default CommentService;
