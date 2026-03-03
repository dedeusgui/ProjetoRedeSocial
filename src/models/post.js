import mongoose from "mongoose";

const PostSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  upCounts: { type: Number, default: 0 },
  downCounts: { type: Number, default: 0 },
});

const Post = mongoose.model("Post", PostSchema);

export default Post;
