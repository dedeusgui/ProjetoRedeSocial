import mongoose from "mongoose";
import Collection from "../../../models/collection.js";
import Comment from "../../../models/comment.js";
import AccountDeletionRepository from "../../../common/users/AccountDeletionRepository.js";
import Post from "../../../models/post.js";
import PostReview from "../../../models/post_review.js";
import User from "../../../models/user.js";

class AdminRepository extends AccountDeletionRepository {
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

  async findEligibleModeratorCandidates({ minCreatedAt, minScore }) {
    return User.find({
      role: "user",
      createdAt: { $lte: minCreatedAt },
      "privateMetrics.score": { $gte: minScore },
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

  async summarizeDeleteImpactByUserId(userId, { recentCommentSince = null } = {}) {
    const authorId = new mongoose.Types.ObjectId(String(userId));
    const visibleCommentFilter = {
      authorId,
      status: "visible",
    };

    const [
      postSummary,
      collectionCount,
      commentCount,
      visibleCommentCount,
      recentVisibleCommentCount,
      reviewsWrittenCount,
    ] = await Promise.all([
      Post.aggregate([
        {
          $match: {
            authorId,
          },
        },
        {
          $group: {
            _id: null,
            postCount: { $sum: 1 },
            reviewsReceivedCount: { $sum: "$moderationMetrics.totalReviews" },
          },
        },
      ]),
      Collection.countDocuments({ authorId }),
      Comment.countDocuments({ authorId }),
      Comment.countDocuments(visibleCommentFilter),
      recentCommentSince
        ? Comment.countDocuments({
          ...visibleCommentFilter,
          createdAt: { $gte: recentCommentSince },
        })
        : 0,
      PostReview.countDocuments({ reviewerId: authorId }),
    ]);

    const summary = postSummary[0] ?? null;

    return {
      postCount: summary?.postCount ?? 0,
      collectionCount,
      commentCount,
      visibleCommentCount,
      recentVisibleCommentCount,
      reviewsReceivedCount: summary?.reviewsReceivedCount ?? 0,
      reviewsWrittenCount,
    };
  }

  async findById(userId) {
    return User.findById(userId)
      .select("username email role privateMetrics profileImage createdAt")
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
}

export default AdminRepository;
