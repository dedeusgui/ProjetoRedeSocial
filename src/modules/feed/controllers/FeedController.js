import { sendSuccess } from "../../../common/http/responses.js";

class FeedController {
  constructor(feedService) {
    this.feedService = feedService;
    this.getFeed = this.getFeed.bind(this);
    this.getFollowingFeed = this.getFollowingFeed.bind(this);
  }

  async getFeed(req, res) {
    const result = await this.feedService.getFeed({
      cursor: req.query.cursor,
      limit: req.query.limit,
      search: req.query.search,
    });

    return sendSuccess(res, result);
  }

  async getFollowingFeed(req, res) {
    const result = await this.feedService.getFollowingFeed({
      requesterId: req.user.id,
      cursor: req.query.cursor,
      limit: req.query.limit,
      search: req.query.search,
    });

    return sendSuccess(res, result);
  }
}

export default FeedController;
