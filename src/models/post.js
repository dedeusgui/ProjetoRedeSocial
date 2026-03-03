import mongoose from "mongoose";

const PostSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    tags: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["published", "hidden", "pending_review"],
      default: "published",
      index: true,
    },
    trend: {
      type: String,
      enum: ["positive", "neutral", "negative"],
      default: "neutral",
    },
  },
  {
    timestamps: true,
  },
);

PostSchema.index({ createdAt: -1, _id: -1 });

const Post = mongoose.model("Post", PostSchema);

export default Post;
