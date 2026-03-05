import AppError from "../../../common/errors/AppError.js";
import { ensureObjectId, requireFields } from "../../../common/validation/index.js";

class PostService {
  constructor(postRepository, commentService) {
    this.postRepository = postRepository;
    this.commentService = commentService;
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
    });

    return {
      id: post.id,
      title: post.title,
      content: post.content,
      tags: post.tags,
      status: post.status,
      trend: post.trend,
      createdAt: post.createdAt,
    };
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

  async deletePostByAdmin(postId) {
    ensureObjectId(postId, "postId");
    const deleted = await this.postRepository.deleteWithRelations(postId);

    if (!deleted) {
      throw new AppError("Post not found", "NOT_FOUND", 404);
    }

    return {
      id: deleted.id,
      title: deleted.title,
      deletedAt: new Date().toISOString(),
    };
  }
}

export default PostService;
