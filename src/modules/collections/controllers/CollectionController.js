import { sendSuccess } from "../../../common/http/responses.js";

class CollectionController {
  constructor(collectionService) {
    this.collectionService = collectionService;
    this.createCollection = this.createCollection.bind(this);
    this.getCollectionById = this.getCollectionById.bind(this);
    this.listMyCollections = this.listMyCollections.bind(this);
    this.updateCollection = this.updateCollection.bind(this);
    this.deleteCollection = this.deleteCollection.bind(this);
    this.addCollectionItems = this.addCollectionItems.bind(this);
    this.removeCollectionItem = this.removeCollectionItem.bind(this);
    this.reorderCollectionItems = this.reorderCollectionItems.bind(this);
  }

  async createCollection(req, res) {
    const result = await this.collectionService.createCollection(req.user.id, req.body);
    return sendSuccess(res, result, 201);
  }

  async getCollectionById(req, res) {
    const result = await this.collectionService.getCollectionById(req.params.id);
    return sendSuccess(res, result);
  }

  async listMyCollections(req, res) {
    const result = await this.collectionService.listCollectionsByOwner(req.user.id);
    return sendSuccess(res, result);
  }

  async updateCollection(req, res) {
    const result = await this.collectionService.updateCollectionByRequester(
      req.params.id,
      req.user,
      req.body,
    );
    return sendSuccess(res, result);
  }

  async deleteCollection(req, res) {
    const result = await this.collectionService.deleteCollectionByRequester(req.params.id, req.user);
    return sendSuccess(res, result);
  }

  async addCollectionItems(req, res) {
    const result = await this.collectionService.addItemsByRequester(
      req.params.id,
      req.user,
      req.body,
    );
    return sendSuccess(res, result);
  }

  async removeCollectionItem(req, res) {
    const result = await this.collectionService.removeItemByRequester(
      req.params.id,
      req.params.postId,
      req.user,
    );
    return sendSuccess(res, result);
  }

  async reorderCollectionItems(req, res) {
    const result = await this.collectionService.reorderItemsByRequester(
      req.params.id,
      req.user,
      req.body,
    );
    return sendSuccess(res, result);
  }
}

export default CollectionController;
