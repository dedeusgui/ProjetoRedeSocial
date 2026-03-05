import PostReview from "../../../models/post_review.js";
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
        returnDocument: "after",
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
}

export default ModerationRepository;
