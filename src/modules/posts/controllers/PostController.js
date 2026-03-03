import { sendSuccess } from "../../../common/http/responses.js";

class PostController {
  constructor(postService) {
    this.postService = postService;
    this.createPost = this.createPost.bind(this);
    this.getPostById = this.getPostById.bind(this);
  }

  async createPost(req, res) {
    const result = await this.postService.createPost(req.user.id, req.body);
    return sendSuccess(res, result, 201);
  }

  async getPostById(req, res) {
    const result = await this.postService.getPostWithComments(req.params.id);
    return sendSuccess(res, result);
  }
}

export default PostController;
