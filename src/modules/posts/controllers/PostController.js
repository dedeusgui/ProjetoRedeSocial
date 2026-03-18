import { sendSuccess } from "../../../common/http/responses.js";

class PostController {
  constructor(postService) {
    this.postService = postService;
    this.createPost = this.createPost.bind(this);
    this.listMyPosts = this.listMyPosts.bind(this);
    this.getPostById = this.getPostById.bind(this);
    this.getPostSequence = this.getPostSequence.bind(this);
    this.updatePost = this.updatePost.bind(this);
    this.uploadPostMedia = this.uploadPostMedia.bind(this);
    this.deletePostMedia = this.deletePostMedia.bind(this);
    this.deletePost = this.deletePost.bind(this);
  }

  async createPost(req, res) {
    const result = await this.postService.createPost(req.user.id, req.body);
    return sendSuccess(res, result, 201);
  }

  async listMyPosts(req, res) {
    const result = await this.postService.listPostsByRequester(req.user.id);
    return sendSuccess(res, result);
  }

  async getPostById(req, res) {
    const result = await this.postService.getPostWithComments(req.params.id);
    return sendSuccess(res, result);
  }

  async getPostSequence(req, res) {
    const result = await this.postService.getPostSequence(req.params.id);
    return sendSuccess(res, result);
  }

  async updatePost(req, res) {
    const result = await this.postService.updatePostByRequester(
      req.params.id,
      req.user,
      req.body,
    );
    return sendSuccess(res, result);
  }

  async uploadPostMedia(req, res) {
    const result = await this.postService.addMediaByRequester(
      req.params.id,
      req.user,
      req.files,
    );
    return sendSuccess(res, result, 201);
  }

  async deletePostMedia(req, res) {
    const result = await this.postService.removeMediaByRequester(
      req.params.id,
      req.params.mediaId,
      req.user,
    );
    return sendSuccess(res, result);
  }

  async deletePost(req, res) {
    const result = await this.postService.deletePostByRequester(req.params.id, req.user);
    return sendSuccess(res, result);
  }
}

export default PostController;
