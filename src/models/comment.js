import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      index: true,
    },
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: { type: String, required: true, trim: true },
    status: { type: String, enum: ["visible", "hidden"], default: "visible", index: true },
  },
  {
    timestamps: true,
  },
);

const Comment = mongoose.model("Comment", CommentSchema);

export default Comment;
