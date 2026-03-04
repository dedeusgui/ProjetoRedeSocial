import PostReview from "../../../models/post_review.js";
import Post from "../../../models/post.js";
import mongoose from "mongoose";

class ModerationRepository {
  async upsertReview({ postId, reviewerId, decision, reason = null }) {
    return PostReview.findOneAndUpdate(
      { postId, reviewerId },
      {
        $set: { decision, reason },
        $setOnInsert: { createdAt: new Date() },
      },
      {
        upsert: true,
        new: true,
      },
    );
  }

  async countPostDecisions(postId) {
    const postObjectId = new mongoose.Types.ObjectId(String(postId));
    const aggregation = await PostReview.aggregate([
      { $match: { postId: postObjectId } },
      {
        $group: {
          _id: "$decision",
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = { approved: 0, not_relevant: 0 };
    for (const row of aggregation) {
      summary[row._id] = row.count;
    }

    return summary;
  }

  async countAuthorDecisions(authorId) {
    const authorObjectId = new mongoose.Types.ObjectId(String(authorId));
    const aggregation = await PostReview.aggregate([
      {
        $lookup: {
          from: Post.collection.name,
          localField: "postId",
          foreignField: "_id",
          as: "post",
        },
      },
      { $unwind: "$post" },
      {
        $match: {
          "post.authorId": authorObjectId,
        },
      },
      {
        $group: {
          _id: "$decision",
          count: { $sum: 1 },
        },
      },
    ]);

    const summary = { approved: 0, not_relevant: 0 };
    for (const row of aggregation) {
      summary[row._id] = row.count;
    }

    return summary;
  }
}

export default ModerationRepository;
