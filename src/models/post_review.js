import mongoose from "mongoose";

const PostReviewSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    decision: {
      type: String,
      enum: ["approved", "not_relevant"],
      required: true,
    },
    reason: { type: String, default: null },
  },
  {
    timestamps: true,
  },
);

PostReviewSchema.index({ postId: 1, reviewerId: 1 }, { unique: true });

const PostReview = mongoose.model("PostReview", PostReviewSchema);

export default PostReview;
