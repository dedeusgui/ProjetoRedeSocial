import { sendSuccess } from "../../../common/http/responses.js";

class ModerationController {
  constructor(moderationService) {
    this.moderationService = moderationService;
    this.createReview = this.createReview.bind(this);
  }

  async createReview(req, res) {
    const result = await this.moderationService.createReview({
      postId: req.params.id,
      reviewerId: req.user.id,
      decision: req.body.decision,
      reason: req.body.reason,
    });

    return sendSuccess(res, result, 201);
  }
}

export default ModerationController;
