import { Router } from "express";
import asyncHandler from "../../../common/http/asyncHandler.js";
import auth from "../../../middleware/auth.js";

function createFeedRoutes(controller) {
  const router = Router();

  router.get("/feed", asyncHandler(controller.getFeed));
  router.get("/feed/following", auth, asyncHandler(controller.getFollowingFeed));

  return router;
}

export default createFeedRoutes;
