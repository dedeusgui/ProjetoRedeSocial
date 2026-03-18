import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "moderator", "admin"], default: "user" },
    followedTags: {
      type: [String],
      default: [],
    },
    privateMetrics: {
      score: { type: Number, default: 0, min: 0, max: 100 },
      totalReviews: { type: Number, default: 0, min: 0 },
    },
    profileImage: {
      url: { type: String, default: null },
      storagePath: { type: String, default: null },
      originalName: { type: String, default: null },
      mimeType: { type: String, default: null },
      sizeBytes: { type: Number, default: 0, min: 0 },
      updatedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", UserSchema);

export default User;
