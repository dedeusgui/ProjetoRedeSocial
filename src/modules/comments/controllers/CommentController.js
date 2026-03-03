import { sendSuccess } from "../../../common/http/responses.js";

class CommentController {
  constructor(commentService) {
    this.commentService = commentService;
    this.createComment = this.createComment.bind(this);
    this.getCommentsByPost = this.getCommentsByPost.bind(this);
  }

  async createComment(req, res) {
    const result = await this.commentService.createComment({
      postId: req.params.id,
      authorId: req.user.id,
      content: req.body.content,
    });

    return sendSuccess(res, result, 201);
  }

  async getCommentsByPost(req, res) {
    const comments = await this.commentService.listVisibleByPostId(req.params.id);
    return sendSuccess(res, comments);
  }
}

export default CommentController;
