import { Router } from "express";
import asyncHandler from "../../../common/http/asyncHandler.js";
import auth from "../../../middleware/auth.js";

function createFeedRoutes(controller) {
  const router = Router();

  router.get("/feed", asyncHandler(controller.getFeed));
  router.get("/feed/following", auth, asyncHandler(controller.getFollowingFeed));
  router.get("/collections/feed", asyncHandler(controller.getCollectionFeed));
  router.get("/collections/feed/following", auth, asyncHandler(controller.getFollowingCollectionFeed));

  return router;
}

export default createFeedRoutes;
