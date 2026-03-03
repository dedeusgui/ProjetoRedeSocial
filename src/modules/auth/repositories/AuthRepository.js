import User from "../../../models/user.js";

class AuthRepository {
  async findByEmail(email) {
    return User.findOne({ email: email.toLowerCase() });
  }

  async findByUsername(username) {
    return User.findOne({ username });
  }

  async createUser(payload) {
    return User.create(payload);
  }
}

export default AuthRepository;
