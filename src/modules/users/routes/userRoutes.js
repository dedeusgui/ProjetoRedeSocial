import { Router } from "express";
import auth from "../../../middleware/auth.js";
import asyncHandler from "../../../common/http/asyncHandler.js";

function createUserRoutes(controller) {
  const router = Router();

  router.get("/me/profile", auth, asyncHandler(controller.getMeProfile));
  router.get("/me/followed-tags", auth, asyncHandler(controller.getFollowedTags));
  router.post("/me/followed-tags", auth, asyncHandler(controller.followTag));
  router.delete("/me/followed-tags/:tag", auth, asyncHandler(controller.unfollowTag));

  return router;
}

export default createUserRoutes;
