import User from "../../../models/user.js";

class UserRepository {
  async findById(id) {
    return User.findById(id);
  }

  async findFollowedTagsById(userId) {
    return User.findById(userId).select("followedTags");
  }

  async updatePrivateMetrics(userId, privateMetrics) {
    return User.findByIdAndUpdate(
      userId,
      { $set: { privateMetrics } },
      { returnDocument: "after" },
    );
  }

  async addFollowedTag(userId, tag) {
    return User.findByIdAndUpdate(
      userId,
      { $addToSet: { followedTags: tag } },
      { returnDocument: "after" },
    ).select("followedTags");
  }

  async replaceFollowedTags(userId, followedTags) {
    return User.findByIdAndUpdate(
      userId,
      { $set: { followedTags } },
      { returnDocument: "after" },
    ).select("followedTags");
  }

  async removeFollowedTag(userId, tag) {
    return User.findByIdAndUpdate(
      userId,
      { $pull: { followedTags: tag } },
      { returnDocument: "after" },
    ).select("followedTags");
  }
}

export default UserRepository;
