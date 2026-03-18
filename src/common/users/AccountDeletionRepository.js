import mongoose from "mongoose";
import Collection from "../../models/collection.js";
import Comment from "../../models/comment.js";
import Post from "../../models/post.js";
import PostReview from "../../models/post_review.js";
import User from "../../models/user.js";

class AccountDeletionRepository {
  async findUserById(userId) {
    return User.findById(userId)
      .select("username email role profileImage")
      .lean();
  }

  async findPostsByAuthorId(authorId) {
    return Post.find({ authorId })
      .select("_id media.storagePath")
      .lean();
  }

  async deleteUserById(userId) {
    return User.findByIdAndDelete(userId)
      .select("username email role")
      .lean();
  }

  async deleteCommentsByAuthorId(authorId) {
    return Comment.deleteMany({ authorId });
  }

  async deleteReviewsByReviewerId(reviewerId) {
    return PostReview.deleteMany({ reviewerId });
  }

  async deletePostRelationsByPostIds(postIds) {
    if (!postIds.length) {
      return;
    }

    await Promise.all([
      Collection.updateMany(
        { "items.postId": { $in: postIds } },
        {
          $pull: {
            items: { postId: { $in: postIds } },
          },
        },
      ),
      Comment.deleteMany({ postId: { $in: postIds } }),
      PostReview.deleteMany({ postId: { $in: postIds } }),
      Post.deleteMany({ _id: { $in: postIds } }),
    ]);
  }

  async deleteCollectionsByAuthorId(authorId) {
    return Collection.deleteMany({ authorId });
  }

  async listAllPostIds() {
    const posts = await Post.find({}).select("_id").lean();
    return posts.map((post) => post._id);
  }

  async summarizePostDecisions(postIds) {
    if (!postIds.length) {
      return new Map();
    }

    const summary = await PostReview.aggregate([
      {
        $match: {
          postId: { $in: postIds },
        },
      },
      {
        $group: {
          _id: "$postId",
          approved: {
            $sum: {
              $cond: [{ $eq: ["$decision", "approved"] }, 1, 0],
            },
          },
          notRelevant: {
            $sum: {
              $cond: [{ $eq: ["$decision", "not_relevant"] }, 1, 0],
            },
          },
        },
      },
    ]);

    return new Map(
      summary.map((entry) => [
        String(entry._id),
        {
          approved: entry.approved,
          notRelevant: entry.notRelevant,
        },
      ]),
    );
  }

  async updatePostTrends(trendUpdates) {
    if (!trendUpdates.length) {
      return;
    }

    await Post.bulkWrite(
      trendUpdates.map((entry) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(String(entry.postId)) },
          update: {
            $set: {
              trend: entry.trend,
              moderationMetrics: {
                approvedCount: entry.approvedCount,
                notRelevantCount: entry.notRelevantCount,
                totalReviews: entry.totalReviews,
                approvalPercentage: entry.approvalPercentage,
                notRelevantPercentage: entry.notRelevantPercentage,
              },
            },
          },
        },
      })),
    );
  }

  async listAllUserIds() {
    const users = await User.find({}).select("_id").lean();
    return users.map((user) => user._id);
  }

  async summarizeAuthorPostMetrics() {
    const summary = await Post.aggregate([
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

    return new Map(
      summary.map((entry) => [
        String(entry._id),
        {
          postCount: entry.postCount,
          approvedCount: entry.approvedCount,
          notRelevantCount: entry.notRelevantCount,
          totalReviews: entry.totalReviews,
        },
      ]),
    );
  }

  async updateUserPrivateMetrics(metricUpdates) {
    if (!metricUpdates.length) {
      return;
    }

    await User.bulkWrite(
      metricUpdates.map((entry) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(String(entry.userId)) },
          update: {
            $set: {
              privateMetrics: {
                score: entry.score,
                totalReviews: entry.totalReviews,
              },
            },
          },
        },
      })),
    );
  }
}

export default AccountDeletionRepository;
