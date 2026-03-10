import Comment from "../../../models/comment.js";

class CommentRepository {
  async create(payload) {
    return Comment.create(payload);
  }

  async findVisibleByPostId(postId) {
    return Comment.find({ postId, status: "visible" })
      .sort({ createdAt: 1, _id: 1 })
      .populate("authorId", "username privateMetrics profileImage");
  }

  async findByIdOrNull(commentId) {
    return Comment.findById(commentId);
  }

  async updateById(commentId, payload) {
    return Comment.findByIdAndUpdate(
      commentId,
      { $set: payload },
      { returnDocument: "after" },
    );
  }

  async deleteById(commentId) {
    return Comment.findByIdAndDelete(commentId);
  }
}

export default CommentRepository;
