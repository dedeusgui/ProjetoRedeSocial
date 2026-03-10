import mongoose from "mongoose";
import Post from "../../../models/post.js";
import { buildStoredTagMatcher } from "../../../common/tags/followedTags.js";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

class FeedRepository {
  async findChronologicalFeed({ cursor, limit, search, followedTags }) {
    const filters = [{ status: "published" }];

    if (Array.isArray(followedTags) && followedTags.length > 0) {
      filters.push({
        tags: {
          $in: followedTags.map((tag) => buildStoredTagMatcher(tag)),
        },
      });
    }

    if (search) {
      const searchRegex = new RegExp(escapeRegex(search), "i");
      filters.push({
        $or: [{ title: searchRegex }, { content: searchRegex }, { tags: searchRegex }],
      });
    }

    if (cursor) {
      const [timestampRaw, id] = String(cursor).split("_");
      const timestamp = Number.parseInt(timestampRaw, 10);

      if (!Number.isNaN(timestamp) && mongoose.isValidObjectId(id)) {
        const createdAt = new Date(timestamp);
        filters.push({
          $or: [
            { createdAt: { $lt: createdAt } },
            { createdAt, _id: { $lt: id } },
          ],
        });
      }
    }

    const query = filters.length === 1 ? filters[0] : { $and: filters };

    return Post.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .populate("authorId", "username");
  }
}

export default FeedRepository;
