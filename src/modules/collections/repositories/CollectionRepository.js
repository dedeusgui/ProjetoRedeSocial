import Collection from "../../../models/collection.js";
import Post from "../../../models/post.js";

class CollectionRepository {
  async create(payload) {
    return Collection.create(payload);
  }

  async findByIdWithAuthor(id) {
    return Collection.findById(id).populate("authorId", "username privateMetrics profileImage");
  }

  async findByIdOrNull(id) {
    return Collection.findById(id);
  }

  async findPublishedByIdWithAuthor(id) {
    return Collection.findOne({ _id: id, status: "published" }).populate(
      "authorId",
      "username privateMetrics profileImage",
    );
  }

  async listByAuthorId(authorId) {
    return Collection.find({ authorId })
      .sort({ updatedAt: -1, _id: -1 })
      .populate("authorId", "username privateMetrics profileImage");
  }

  async updateById(collectionId, payload) {
    return Collection.findByIdAndUpdate(
      collectionId,
      { $set: payload },
      { returnDocument: "after" },
    ).populate("authorId", "username privateMetrics profileImage");
  }

  async replaceItems(collectionId, items) {
    return Collection.findByIdAndUpdate(
      collectionId,
      { $set: { items } },
      { returnDocument: "after" },
    ).populate("authorId", "username privateMetrics profileImage");
  }

  async deleteById(collectionId) {
    return Collection.findByIdAndDelete(collectionId).populate(
      "authorId",
      "username privateMetrics profileImage",
    );
  }

  async listPublishedByPostIds(postIds) {
    if (!Array.isArray(postIds) || postIds.length === 0) {
      return [];
    }

    return Collection.find({
      status: "published",
      "items.postId": { $in: postIds },
    }).select("title description tags items.postId status createdAt updatedAt");
  }

  async findPublishedPostsByIds(postIds) {
    if (!Array.isArray(postIds) || postIds.length === 0) {
      return [];
    }

    return Post.find({
      _id: { $in: postIds },
      status: { $ne: "hidden" },
    })
      .sort({ createdAt: -1, _id: -1 })
      .populate("authorId", "username privateMetrics profileImage");
  }

  async findOwnedPostsByIds(authorId, postIds) {
    if (!Array.isArray(postIds) || postIds.length === 0) {
      return [];
    }

    return Post.find({
      _id: { $in: postIds },
      authorId,
      status: { $ne: "hidden" },
    }).select("_id authorId status title content tags media questionnaire createdAt sequence");
  }

  async findPostIdsByMatchingTagSearch(searchRegex) {
    const collections = await Collection.find({
      status: "published",
      tags: searchRegex,
    }).select("items.postId");

    return collections.flatMap((collection) =>
      (Array.isArray(collection.items) ? collection.items : []).map((item) => item.postId),
    );
  }

  async removePostFromCollections(postId) {
    return Collection.updateMany(
      { "items.postId": postId },
      {
        $pull: {
          items: { postId },
        },
      },
    );
  }

  async removePostIdsFromCollections(postIds) {
    if (!Array.isArray(postIds) || postIds.length === 0) {
      return;
    }

    await Collection.updateMany(
      { "items.postId": { $in: postIds } },
      {
        $pull: {
          items: { postId: { $in: postIds } },
        },
      },
    );
  }

  async deleteByAuthorId(authorId) {
    return Collection.deleteMany({ authorId });
  }

  async findContinuationMap(postIds) {
    if (!Array.isArray(postIds) || postIds.length === 0) {
      return new Map();
    }

    const rows = await Post.find({
      "sequence.previousPostId": { $in: postIds },
      status: { $ne: "hidden" },
    }).select("_id sequence.previousPostId");

    return new Map(
      rows
        .filter((row) => row.sequence?.previousPostId)
        .map((row) => [String(row.sequence.previousPostId), String(row._id)]),
    );
  }
}

export default CollectionRepository;
