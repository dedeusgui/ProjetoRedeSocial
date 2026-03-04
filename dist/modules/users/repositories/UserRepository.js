import User from "../../../models/user.js";

class UserRepository {
  async findById(id) {
    return User.findById(id);
  }

  async updatePrivateMetrics(userId, privateMetrics) {
    return User.findByIdAndUpdate(
      userId,
      { $set: { privateMetrics } },
      { new: true },
    );
  }
}

export default UserRepository;
