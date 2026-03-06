import Post from "../../../models/post.js";
import Comment from "../../../models/comment.js";
import PostReview from "../../../models/post_review.js";
import mongoose from "mongoose";

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

  async updateById(postId, payload) {
    return Post.findByIdAndUpdate(
      postId,
      { $set: payload },
      { returnDocument: "after" },
    );
  }

  async updateTrend(postId, trend) {
    return Post.findByIdAndUpdate(
      postId,
      { $set: { trend } },
      { returnDocument: "after" },
    );
  }

  async updateTrendAndModerationMetrics(postId, trend, moderationMetrics) {
    return Post.findByIdAndUpdate(
      postId,
      {
        $set: {
          trend,
          moderationMetrics,
        },
      },
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

  async summarizeAuthorModeration(authorId) {
    const authorObjectId = new mongoose.Types.ObjectId(String(authorId));
    const summary = await Post.aggregate([
      {
        $match: {
          authorId: authorObjectId,
        },
      },
      {
        $group: {
          _id: "$authorId",
          postCount: { $sum: 1 },
          approvedCount: { $sum: "$moderationMetrics.approvedCount" },
          notRelevantCount: { $sum: "$moderationMetrics.notRelevantCount" },
          totalReviews: { $sum: "$moderationMetrics.totalReviews" },
        },
      },
    ]);

    if (!summary.length) {
      return {
        postCount: 0,
        approvedCount: 0,
        notRelevantCount: 0,
        totalReviews: 0,
      };
    }

    return summary[0];
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
