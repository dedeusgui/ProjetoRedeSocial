import { parseLimit } from "../../../common/validation/index.js";

class FeedService {
  constructor(feedRepository) {
    this.feedRepository = feedRepository;
  }

  async getFeed({ cursor, limit }) {
    const resolvedLimit = parseLimit(limit, 20, 50);
    const results = await this.feedRepository.findChronologicalFeed({
      cursor,
      limit: resolvedLimit,
    });

    const hasMore = results.length > resolvedLimit;
    const entries = hasMore ? results.slice(0, resolvedLimit) : results;

    const items = entries.map((post) => ({
      id: post.id,
      author: {
        id: post.authorId?.id,
        username: post.authorId?.username,
      },
      title: post.title,
      content: post.content,
      tags: post.tags,
      trend: post.trend,
      createdAt: post.createdAt,
    }));

    const nextCursor = hasMore
      ? `${entries[entries.length - 1].createdAt.getTime()}_${entries[entries.length - 1].id}`
      : null;

    return {
      items,
      pageInfo: {
        nextCursor,
        limit: resolvedLimit,
      },
    };
  }
}

export default FeedService;
