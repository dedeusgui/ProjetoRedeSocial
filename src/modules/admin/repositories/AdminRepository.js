import mongoose from "mongoose";
import Post from "../../../models/post.js";
import User from "../../../models/user.js";
import Comment from "../../../models/comment.js";
import PostReview from "../../../models/post_review.js";

class AdminRepository {
  async syncAdminRolesByEmails(adminEmails) {
    if (!adminEmails.length) {
      return {
        matchedCount: 0,
        modifiedCount: 0,
      };
    }

    const result = await User.updateMany(
      {
        email: { $in: adminEmails },
        role: { $ne: "admin" },
      },
      {
        $set: { role: "admin" },
      },
    );

    return {
      matchedCount: result.matchedCount ?? 0,
      modifiedCount: result.modifiedCount ?? 0,
    };
  }

  async findEligibleModeratorCandidates({ minCreatedAt, minApprovalRate }) {
    return User.find({
      role: "user",
      createdAt: { $lte: minCreatedAt },
      "privateMetrics.approvalRate": { $gte: minApprovalRate },
    })
      .select("username email role privateMetrics createdAt")
      .sort({ createdAt: 1, username: 1 })
      .lean();
  }

  async countPostsByAuthorIds(userIds) {
    const objectIds = userIds.map((userId) => new mongoose.Types.ObjectId(String(userId)));
    if (!objectIds.length) {
      return new Map();
    }

    const summary = await Post.aggregate([
      {
        $match: {
          authorId: { $in: objectIds },
        },
      },
      {
        $group: {
          _id: "$authorId",
          postCount: { $sum: 1 },
        },
      },
    ]);

    return new Map(
      summary.map((entry) => [
        String(entry._id),
        entry.postCount,
      ]),
    );
  }

  async listModerators() {
    return User.find({ role: "moderator" })
      .select("username email role privateMetrics createdAt")
      .sort({ updatedAt: -1, username: 1 })
      .lean();
  }

  async listUsersWithRoles() {
    return User.find({})
      .select("username email role privateMetrics createdAt updatedAt")
      .sort({ createdAt: -1, username: 1 })
      .lean();
  }

  async findById(userId) {
    return User.findById(userId)
      .select("username email role privateMetrics createdAt")
      .lean();
  }

  async updateRoleById(userId, role) {
    return User.findByIdAndUpdate(
      userId,
      { $set: { role } },
      { returnDocument: "after" },
    )
      .select("username email role privateMetrics createdAt")
      .lean();
  }

  async deleteUserById(userId) {
    return User.findByIdAndDelete(userId)
      .select("username email role")
      .lean();
  }

  async findPostIdsByAuthorId(authorId) {
    const posts = await Post.find({ authorId }).select("_id").lean();
    return posts.map((post) => post._id);
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
      Comment.deleteMany({ postId: { $in: postIds } }),
      PostReview.deleteMany({ postId: { $in: postIds } }),
      Post.deleteMany({ _id: { $in: postIds } }),
    ]);
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
          avgApprovalPercentage: { $avg: "$moderationMetrics.approvalPercentage" },
          avgNotRelevantPercentage: { $avg: "$moderationMetrics.notRelevantPercentage" },
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
          avgApprovalPercentage: entry.avgApprovalPercentage,
          avgNotRelevantPercentage: entry.avgNotRelevantPercentage,
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
                approvalRate: entry.approvalRate,
                rejectionRate: entry.rejectionRate,
                approvedCount: entry.approvedCount,
                notRelevantCount: entry.notRelevantCount,
                totalReviews: entry.totalReviews,
              },
            },
          },
        },
      })),
    );
  }
}

export default AdminRepository;
