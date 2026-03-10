import { formatPostMediaCollection } from "../../../common/media/postMedia.js";
import { parseLimit } from "../../../common/validation/index.js";

function normalizeSearch(value) {
  if (Array.isArray(value)) {
    return normalizeSearch(value[0]);
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

class FeedService {
  constructor(feedRepository, userService) {
    this.feedRepository = feedRepository;
    this.userService = userService;
  }

  buildFeedResponse(results, resolvedLimit) {
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
      media: formatPostMediaCollection(post.media),
      trend: post.trend,
      moderationMetrics: {
        approvedCount: post.moderationMetrics?.approvedCount ?? 0,
        notRelevantCount: post.moderationMetrics?.notRelevantCount ?? 0,
        totalReviews: post.moderationMetrics?.totalReviews ?? 0,
        approvalPercentage: post.moderationMetrics?.approvalPercentage ?? 0,
        notRelevantPercentage: post.moderationMetrics?.notRelevantPercentage ?? 0,
      },
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

  async getFeed({ cursor, limit, search }) {
    const resolvedLimit = parseLimit(limit, 20, 50);
    const resolvedSearch = normalizeSearch(search);
    const results = await this.feedRepository.findChronologicalFeed({
      cursor,
      limit: resolvedLimit,
      search: resolvedSearch,
    });

    return this.buildFeedResponse(results, resolvedLimit);
  }

  async getFollowingFeed({ requesterId, cursor, limit, search }) {
    const resolvedLimit = parseLimit(limit, 20, 50);
    const resolvedSearch = normalizeSearch(search);
    const followedTags = await this.userService.getFollowedTags(requesterId);

    if (followedTags.length === 0) {
      return this.buildFeedResponse([], resolvedLimit);
    }

    const results = await this.feedRepository.findChronologicalFeed({
      cursor,
      limit: resolvedLimit,
      search: resolvedSearch,
      followedTags,
    });

    return this.buildFeedResponse(results, resolvedLimit);
  }
}

export default FeedService;
