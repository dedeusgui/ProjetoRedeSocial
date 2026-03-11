import { formatPostMediaCollection } from "../../../common/media/postMedia.js";
import { formatQuestionnaire } from "../../../common/posts/questionnaire.js";
import { buildSequenceSummary } from "../../../common/posts/sequence.js";
import { buildPublicAuthorSummary } from "../../../common/users/publicAuthor.js";
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
  constructor(feedRepository, userService, collectionService) {
    this.feedRepository = feedRepository;
    this.userService = userService;
    this.collectionService = collectionService;
  }

  async buildFeedResponse(results, resolvedLimit) {
    const hasMore = results.length > resolvedLimit;
    const entries = hasMore ? results.slice(0, resolvedLimit) : results;
    const postIds = entries.map((post) => post.id);
    const [continuationMap, collectionMap] = await Promise.all([
      this.feedRepository.findContinuationMap(postIds),
      this.collectionService.listCollectionSummariesByPostIds(postIds),
    ]);

    const items = entries.map((post) => {
      const nextPostId = continuationMap.get(String(post.id));

      return {
        id: post.id,
        author: buildPublicAuthorSummary(post.authorId),
        title: post.title,
        content: post.content,
        tags: post.tags,
        media: formatPostMediaCollection(post.media),
        questionnaire: formatQuestionnaire(post.questionnaire),
        trend: post.trend,
        moderationMetrics: {
          approvedCount: post.moderationMetrics?.approvedCount ?? 0,
          notRelevantCount: post.moderationMetrics?.notRelevantCount ?? 0,
          totalReviews: post.moderationMetrics?.totalReviews ?? 0,
          approvalPercentage: post.moderationMetrics?.approvalPercentage ?? 0,
          notRelevantPercentage: post.moderationMetrics?.notRelevantPercentage ?? 0,
        },
        sequence: buildSequenceSummary(post, {
          hasNext: Boolean(nextPostId),
          nextPostId,
        }),
        collections: collectionMap.get(String(post.id)) ?? [],
        createdAt: post.createdAt,
      };
    });

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
    const matchingCollectionPostIds = resolvedSearch
      ? await this.collectionService.findPostIdsByTagSearch(resolvedSearch)
      : [];
    const results = await this.feedRepository.findChronologicalFeed({
      cursor,
      limit: resolvedLimit,
      search: resolvedSearch,
      matchingCollectionPostIds,
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

    const matchingCollectionPostIds = resolvedSearch
      ? await this.collectionService.findPostIdsByTagSearch(resolvedSearch)
      : [];
    const results = await this.feedRepository.findChronologicalFeed({
      cursor,
      limit: resolvedLimit,
      search: resolvedSearch,
      followedTags,
      matchingCollectionPostIds,
    });

    return this.buildFeedResponse(results, resolvedLimit);
  }
}

export default FeedService;
