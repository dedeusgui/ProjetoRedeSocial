import Post from "../../../models/post.js";
import Comment from "../../../models/comment.js";
import PostReview from "../../../models/post_review.js";

class PostRepository {
  async create(payload) {
    return Post.create(payload);
  }

  async findById(id) {
    return Post.findById(id).populate("authorId", "username");
  }

  async findByIdOrNull(id) {
    return Post.findById(id);
  }

  async updateTrend(postId, trend) {
    return Post.findByIdAndUpdate(
      postId,
      { $set: { trend } },
      { returnDocument: "after" },
    );
  }

  async findAuthorByPostId(postId) {
    const post = await Post.findById(postId).select("authorId");
    return post?.authorId ?? null;
  }

  async listByAuthorId(authorId) {
    return Post.find({ authorId }).select("_id");
  }

  async deleteWithRelations(postId) {
    const deletedPost = await Post.findByIdAndDelete(postId);
    if (!deletedPost) {
      return null;
    }

    await Promise.all([
      Comment.deleteMany({ postId }),
      PostReview.deleteMany({ postId }),
    ]);

    return deletedPost;
  }
}

export default PostRepository;
