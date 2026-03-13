import { Router } from "express";
import auth from "../../../middleware/auth.js";
import asyncHandler from "../../../common/http/asyncHandler.js";
import { AVATAR_MEDIA_FIELD_NAME } from "../../../common/media/avatarMedia.js";
import { avatarUpload } from "./avatarUpload.js";

function createUserRoutes(controller) {
  const router = Router();

  router.get("/me/profile", auth, asyncHandler(controller.getMeProfile));
  router.delete("/me", auth, asyncHandler(controller.deleteMe));
  router.post(
    "/me/avatar",
    auth,
    avatarUpload.single(AVATAR_MEDIA_FIELD_NAME),
    asyncHandler(controller.uploadAvatar),
  );
  router.delete("/me/avatar", auth, asyncHandler(controller.deleteAvatar));
  router.get("/me/followed-tags", auth, asyncHandler(controller.getFollowedTags));
  router.post("/me/followed-tags", auth, asyncHandler(controller.followTag));
  router.delete("/me/followed-tags/:tag", auth, asyncHandler(controller.unfollowTag));

  return router;
}

export default createUserRoutes;
