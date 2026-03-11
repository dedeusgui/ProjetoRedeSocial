import AppError from "../../../common/errors/AppError.js";
import { formatPostMediaCollection } from "../../../common/media/postMedia.js";
import { formatQuestionnaire } from "../../../common/posts/questionnaire.js";
import { buildSequenceSummary } from "../../../common/posts/sequence.js";
import { normalizeFollowedTags } from "../../../common/tags/followedTags.js";
import { buildPublicAuthorSummary } from "../../../common/users/publicAuthor.js";
import { ensureObjectId, requireFields } from "../../../common/validation/index.js";

const COLLECTION_TITLE_MAX_LENGTH = 120;
const COLLECTION_DESCRIPTION_MAX_LENGTH = 500;
const COLLECTION_MAX_TAGS = 12;

class CollectionService {
  constructor(collectionRepository) {
    this.collectionRepository = collectionRepository;
  }

  ensureCollectionOwner(collection, requester, message) {
    const isOwner = String(collection.authorId) === String(requester?.id);
    if (!isOwner) {
      throw new AppError(message, "FORBIDDEN", 403);
    }
  }

  normalizeTags(tags) {
    const normalized = normalizeFollowedTags(tags);
    if (normalized.length > COLLECTION_MAX_TAGS) {
      throw new AppError(
        `A collection can include at most ${COLLECTION_MAX_TAGS} tags.`,
        "VALIDATION_ERROR",
        400,
        {
          field: "tags",
          maxItems: COLLECTION_MAX_TAGS,
        },
      );
    }

    return normalized;
  }

  validateCollectionFields(payload, { partial = false } = {}) {
    if (!partial) {
      requireFields(payload, ["title"]);
    }

    if (payload.title !== undefined) {
      const title = String(payload.title).trim();
      if (!title) {
        throw new AppError("The collection title cannot be empty.", "VALIDATION_ERROR", 400, {
          field: "title",
        });
      }

      if (title.length > COLLECTION_TITLE_MAX_LENGTH) {
        throw new AppError(
          `The collection title must be at most ${COLLECTION_TITLE_MAX_LENGTH} characters.`,
          "VALIDATION_ERROR",
          400,
          {
            field: "title",
            maxLength: COLLECTION_TITLE_MAX_LENGTH,
          },
        );
      }
    }

    if (payload.description !== undefined) {
      const description = String(payload.description ?? "").trim();
      if (description.length > COLLECTION_DESCRIPTION_MAX_LENGTH) {
        throw new AppError(
          `The collection description must be at most ${COLLECTION_DESCRIPTION_MAX_LENGTH} characters.`,
          "VALIDATION_ERROR",
          400,
          {
            field: "description",
            maxLength: COLLECTION_DESCRIPTION_MAX_LENGTH,
          },
        );
      }
    }

    if (payload.tags !== undefined && !Array.isArray(payload.tags)) {
      throw new AppError("Collection tags must be sent as a list.", "VALIDATION_ERROR", 400, {
        field: "tags",
      });
    }
  }

  normalizeCollectionPayload(payload) {
    const updates = {};

    if (payload.title !== undefined) {
      updates.title = String(payload.title).trim();
    }

    if (payload.description !== undefined) {
      updates.description = String(payload.description ?? "").trim();
    }

    if (payload.tags !== undefined) {
      updates.tags = this.normalizeTags(payload.tags);
    }

    return updates;
  }

  normalizePostIds(values) {
    const unique = new Set();

    return (Array.isArray(values) ? values : [])
      .map((value) => String(value ?? "").trim())
      .filter((value) => {
        if (!value || unique.has(value)) {
          return false;
        }

        ensureObjectId(value, "postId");
        unique.add(value);
        return true;
      });
  }

  formatCollectionSummary(collection) {
    const items = Array.isArray(collection.items) ? collection.items : [];

    return {
      id: collection.id,
      title: collection.title,
      description: collection.description ?? "",
      tags: Array.isArray(collection.tags) ? collection.tags : [],
      status: collection.status,
      itemCount: items.length,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    };
  }

  formatCollectionItem(post, nextPostIdMap = new Map()) {
    const nextPostId = nextPostIdMap.get(String(post.id));

    return {
      id: post.id,
      author: buildPublicAuthorSummary(post.authorId),
      title: post.title,
      content: post.content,
      tags: post.tags,
      media: formatPostMediaCollection(post.media),
      questionnaire: formatQuestionnaire(post.questionnaire),
      sequence: buildSequenceSummary(post, {
        hasNext: Boolean(nextPostId),
        nextPostId,
      }),
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  async hydrateCollectionWithItems(collection) {
    const postIds = (Array.isArray(collection.items) ? collection.items : []).map((item) =>
      String(item.postId),
    );
    const posts = await this.collectionRepository.findPublishedPostsByIds(postIds);
    const nextPostIdMap = await this.collectionRepository.findContinuationMap(postIds);
    const postMap = new Map(posts.map((post) => [String(post.id), post]));
    const items = postIds
      .map((postId) => postMap.get(String(postId)))
      .filter(Boolean)
      .map((post) => this.formatCollectionItem(post, nextPostIdMap));

    return {
      ...this.formatCollectionSummary(collection),
      author: buildPublicAuthorSummary(collection.authorId),
      items,
    };
  }

  async createCollection(authorId, payload) {
    this.validateCollectionFields(payload);
    const normalized = this.normalizeCollectionPayload(payload);

    const created = await this.collectionRepository.create({
      authorId,
      title: normalized.title,
      description: normalized.description ?? "",
      tags: normalized.tags ?? [],
      items: [],
      status: "published",
    });
    const collection = await this.collectionRepository.findByIdWithAuthor(created.id);

    return this.hydrateCollectionWithItems(collection);
  }

  async getCollectionById(collectionId) {
    ensureObjectId(collectionId, "collectionId");

    const collection = await this.collectionRepository.findPublishedByIdWithAuthor(collectionId);
    if (!collection) {
      throw new AppError("Collection not found.", "NOT_FOUND", 404);
    }

    return this.hydrateCollectionWithItems(collection);
  }

  async listCollectionsByOwner(authorId) {
    const collections = await this.collectionRepository.listByAuthorId(authorId);

    return Promise.all(collections.map((collection) => this.hydrateCollectionWithItems(collection)));
  }

  async updateCollectionByRequester(collectionId, requester, payload) {
    ensureObjectId(collectionId, "collectionId");
    const collection = await this.collectionRepository.findByIdOrNull(collectionId);

    if (!collection) {
      throw new AppError("Collection not found.", "NOT_FOUND", 404);
    }

    this.ensureCollectionOwner(collection, requester, "You do not have permission to edit this collection.");

    this.validateCollectionFields(payload ?? {}, { partial: true });
    const updates = this.normalizeCollectionPayload(payload ?? {});
    if (Object.keys(updates).length === 0) {
      throw new AppError(
        "Provide at least one field to update: title, description, or tags.",
        "VALIDATION_ERROR",
        400,
        {
          fields: ["title", "description", "tags"],
        },
      );
    }

    const updated = await this.collectionRepository.updateById(collectionId, updates);
    return this.hydrateCollectionWithItems(updated);
  }

  async deleteCollectionByRequester(collectionId, requester) {
    ensureObjectId(collectionId, "collectionId");
    const collection = await this.collectionRepository.findByIdOrNull(collectionId);

    if (!collection) {
      throw new AppError("Collection not found.", "NOT_FOUND", 404);
    }

    this.ensureCollectionOwner(collection, requester, "You do not have permission to delete this collection.");

    const deleted = await this.collectionRepository.deleteById(collectionId);

    return {
      id: deleted.id,
      title: deleted.title,
      deletedAt: new Date().toISOString(),
    };
  }

  async addItemsByRequester(collectionId, requester, payload) {
    ensureObjectId(collectionId, "collectionId");
    const collection = await this.collectionRepository.findByIdOrNull(collectionId);

    if (!collection) {
      throw new AppError("Collection not found.", "NOT_FOUND", 404);
    }

    this.ensureCollectionOwner(collection, requester, "You do not have permission to edit this collection.");

    const postIds = this.normalizePostIds(payload?.postIds);
    if (postIds.length === 0) {
      throw new AppError("Provide at least one post to add.", "VALIDATION_ERROR", 400, {
        field: "postIds",
      });
    }

    const existingIds = new Set(
      (Array.isArray(collection.items) ? collection.items : []).map((item) => String(item.postId)),
    );
    const duplicatePostId = postIds.find((postId) => existingIds.has(postId));
    if (duplicatePostId) {
      throw new AppError("This post is already part of the collection.", "CONFLICT", 409, {
        field: "postIds",
        postId: duplicatePostId,
      });
    }

    const ownedPosts = await this.collectionRepository.findOwnedPostsByIds(requester.id, postIds);
    if (ownedPosts.length !== postIds.length) {
      throw new AppError(
        "You can only add your own visible posts to a collection.",
        "FORBIDDEN",
        403,
      );
    }

    const nextItems = [
      ...(Array.isArray(collection.items) ? collection.items : []),
      ...postIds.map((postId) => ({
        postId,
        addedAt: new Date(),
      })),
    ];

    const updated = await this.collectionRepository.replaceItems(collectionId, nextItems);
    return this.hydrateCollectionWithItems(updated);
  }

  async removeItemByRequester(collectionId, postId, requester) {
    ensureObjectId(collectionId, "collectionId");
    ensureObjectId(postId, "postId");

    const collection = await this.collectionRepository.findByIdOrNull(collectionId);
    if (!collection) {
      throw new AppError("Collection not found.", "NOT_FOUND", 404);
    }

    this.ensureCollectionOwner(collection, requester, "You do not have permission to edit this collection.");

    const nextItems = (Array.isArray(collection.items) ? collection.items : []).filter(
      (item) => String(item.postId) !== String(postId),
    );

    if (nextItems.length === (Array.isArray(collection.items) ? collection.items.length : 0)) {
      throw new AppError("Post not found in this collection.", "NOT_FOUND", 404);
    }

    const updated = await this.collectionRepository.replaceItems(collectionId, nextItems);
    return this.hydrateCollectionWithItems(updated);
  }

  async reorderItemsByRequester(collectionId, requester, payload) {
    ensureObjectId(collectionId, "collectionId");
    const collection = await this.collectionRepository.findByIdOrNull(collectionId);
    if (!collection) {
      throw new AppError("Collection not found.", "NOT_FOUND", 404);
    }

    this.ensureCollectionOwner(collection, requester, "You do not have permission to edit this collection.");

    const postIds = this.normalizePostIds(payload?.postIds);
    const currentItems = Array.isArray(collection.items) ? collection.items : [];
    if (postIds.length !== currentItems.length) {
      throw new AppError(
        "The new order must contain exactly the same posts already in the collection.",
        "VALIDATION_ERROR",
        400,
        {
          field: "postIds",
        },
      );
    }

    const currentMap = new Map(currentItems.map((item) => [String(item.postId), item]));
    const missingPostId = postIds.find((postId) => !currentMap.has(postId));
    if (missingPostId) {
      throw new AppError(
        "The new order must contain exactly the same posts already in the collection.",
        "VALIDATION_ERROR",
        400,
        {
          field: "postIds",
          postId: missingPostId,
        },
      );
    }

    const nextItems = postIds.map((postId) => currentMap.get(postId));
    const updated = await this.collectionRepository.replaceItems(collectionId, nextItems);
    return this.hydrateCollectionWithItems(updated);
  }

  async listCollectionSummariesByPostIds(postIds) {
    const collections = await this.collectionRepository.listPublishedByPostIds(postIds);
    const map = new Map();

    collections.forEach((collection) => {
      const summary = this.formatCollectionSummary(collection);
      (Array.isArray(collection.items) ? collection.items : []).forEach((item) => {
        const key = String(item.postId);
        if (!map.has(key)) {
          map.set(key, []);
        }

        map.get(key).push(summary);
      });
    });

    return map;
  }

  async findPostIdsByTagSearch(search) {
    if (!search) {
      return [];
    }

    const searchRegex = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const matches = await this.collectionRepository.findPostIdsByMatchingTagSearch(searchRegex);
    return [...new Set(matches.map((value) => String(value)))];
  }

  async removePostReferences(postId) {
    ensureObjectId(postId, "postId");
    await this.collectionRepository.removePostFromCollections(postId);
  }

  async removePostReferencesByPostIds(postIds) {
    const normalized = this.normalizePostIds(postIds);
    await this.collectionRepository.removePostIdsFromCollections(normalized);
  }

  async deleteCollectionsByAuthorId(authorId) {
    await this.collectionRepository.deleteByAuthorId(authorId);
  }
}

export default CollectionService;

