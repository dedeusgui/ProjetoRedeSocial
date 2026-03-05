import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "moderator", "admin"], default: "user" },
    privateMetrics: {
      approvalRate: { type: Number, default: 0, min: 0, max: 100 },
      rejectionRate: { type: Number, default: 0, min: 0, max: 100 },
      approvedCount: { type: Number, default: 0, min: 0 },
      notRelevantCount: { type: Number, default: 0, min: 0 },
      totalReviews: { type: Number, default: 0, min: 0 },
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", UserSchema);

export default User;
