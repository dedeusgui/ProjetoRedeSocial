import { Router } from "express";
import auth from "../../../middleware/auth.js";
import roles from "../../../middleware/roles.js";
import asyncHandler from "../../../common/http/asyncHandler.js";

function createModerationRoutes(controller) {
  const router = Router();

  router.post(
    "/posts/:id/review",
    auth,
    roles("admin", "moderator"),
    asyncHandler(controller.createReview),
  );

  return router;
}

export default createModerationRoutes;
