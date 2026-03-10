import { sendSuccess } from "../../../common/http/responses.js";

class UserController {
  constructor(userService) {
    this.userService = userService;
    this.getMeProfile = this.getMeProfile.bind(this);
    this.getFollowedTags = this.getFollowedTags.bind(this);
    this.followTag = this.followTag.bind(this);
    this.unfollowTag = this.unfollowTag.bind(this);
    this.uploadAvatar = this.uploadAvatar.bind(this);
    this.deleteAvatar = this.deleteAvatar.bind(this);
  }

  async getMeProfile(req, res) {
    const profile = await this.userService.getMeProfile(req.user.id);
    return sendSuccess(res, profile);
  }

  async getFollowedTags(req, res) {
    const followedTags = await this.userService.getFollowedTags(req.user.id);
    return sendSuccess(res, { followedTags });
  }

  async followTag(req, res) {
    const result = await this.userService.followTag(req.user.id, req.body);
    return sendSuccess(res, result, 201);
  }

  async unfollowTag(req, res) {
    const result = await this.userService.unfollowTag(req.user.id, req.params.tag);
    return sendSuccess(res, result);
  }

  async uploadAvatar(req, res) {
    const result = await this.userService.uploadAvatar(req.user.id, req.file);
    return sendSuccess(res, result, 201);
  }

  async deleteAvatar(req, res) {
    const result = await this.userService.deleteAvatar(req.user.id);
    return sendSuccess(res, result);
  }
}

export default UserController;
