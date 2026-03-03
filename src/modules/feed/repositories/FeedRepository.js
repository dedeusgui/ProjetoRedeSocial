import mongoose from "mongoose";
import Post from "../../../models/post.js";

class FeedRepository {
  async findChronologicalFeed({ cursor, limit }) {
    const query = { status: "published" };

    if (cursor) {
      const [timestampRaw, id] = String(cursor).split("_");
      const timestamp = Number.parseInt(timestampRaw, 10);

      if (!Number.isNaN(timestamp) && mongoose.isValidObjectId(id)) {
        const createdAt = new Date(timestamp);
        query.$or = [
          { createdAt: { $lt: createdAt } },
          { createdAt, _id: { $lt: id } },
        ];
      }
    }

    return Post.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate("authorId", "username");
  }
}

export default FeedRepository;
