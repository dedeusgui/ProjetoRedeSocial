import Comment from "../../../models/comment.js";

class CommentRepository {
  async create(payload) {
    return Comment.create(payload);
  }

  async findVisibleByPostId(postId) {
    return Comment.find({ postId, status: "visible" })
      .sort({ createdAt: 1, _id: 1 })
      .populate("authorId", "username");
  }

  async deleteById(commentId) {
    return Comment.findByIdAndDelete(commentId);
  }
}

export default CommentRepository;
