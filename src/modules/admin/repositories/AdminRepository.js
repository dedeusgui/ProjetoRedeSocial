import mongoose from "mongoose";
import Post from "../../../models/post.js";
import User from "../../../models/user.js";

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
}

export default AdminRepository;
