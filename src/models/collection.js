import mongoose from "mongoose";

const CollectionItemSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
);

const CollectionSchema = new mongoose.Schema(
  {
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    items: {
      type: [CollectionItemSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["published"],
      default: "published",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

CollectionSchema.index({ authorId: 1, updatedAt: -1, _id: -1 });
CollectionSchema.index({ "items.postId": 1 });
CollectionSchema.index({ tags: 1 });

const Collection = mongoose.model("Collection", CollectionSchema);

export default Collection;
