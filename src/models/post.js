import mongoose from "mongoose";

const PostMediaSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    kind: {
      type: String,
      enum: ["image"],
      default: "image",
      required: true,
    },
    url: { type: String, required: true },
    storagePath: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true, min: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  {
    _id: false,
  },
);

const PostQuestionSchema = new mongoose.Schema(
  {
    prompt: { type: String, required: true, trim: true },
    options: { type: [String], default: [], required: true },
    correctOptionIndex: { type: Number, required: true, min: 0 },
  },
  {
    _id: false,
  },
);

const PostQuestionnaireSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, default: null },
    questions: { type: [PostQuestionSchema], default: [], required: true },
  },
  {
    _id: false,
  },
);

const PostSequenceSchema = new mongoose.Schema(
  {
    previousPostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },
  },
  {
    _id: false,
  },
);

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
    media: { type: [PostMediaSchema], default: [] },
    questionnaire: { type: PostQuestionnaireSchema, default: null },
    sequence: { type: PostSequenceSchema, default: null },
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
    moderationMetrics: {
      approvedCount: { type: Number, default: 0, min: 0 },
      notRelevantCount: { type: Number, default: 0, min: 0 },
      totalReviews: { type: Number, default: 0, min: 0 },
      approvalPercentage: { type: Number, default: 0, min: 0, max: 100 },
      notRelevantPercentage: { type: Number, default: 0, min: 0, max: 100 },
    },
  },
  {
    timestamps: true,
  },
);

PostSchema.index({ createdAt: -1, _id: -1 });
PostSchema.index({ "sequence.previousPostId": 1 }, { unique: true, sparse: true });

const Post = mongoose.model("Post", PostSchema);

export default Post;
