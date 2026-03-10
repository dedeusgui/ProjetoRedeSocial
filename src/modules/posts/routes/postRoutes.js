import { Router } from "express";
import auth from "../../../middleware/auth.js";
import asyncHandler from "../../../common/http/asyncHandler.js";
import { POST_MEDIA_FIELD_NAME } from "../../../common/media/postMedia.js";
import { postMediaUpload } from "./postMediaUpload.js";

function createPostRoutes(controller) {
  const router = Router();

  router.post("/posts", auth, asyncHandler(controller.createPost));
  router.get("/posts/:id", asyncHandler(controller.getPostById));
  router.patch("/posts/:id", auth, asyncHandler(controller.updatePost));
  router.post(
    "/posts/:id/media",
    auth,
    postMediaUpload.array(POST_MEDIA_FIELD_NAME),
    asyncHandler(controller.uploadPostMedia),
  );
  router.delete("/posts/:id/media/:mediaId", auth, asyncHandler(controller.deletePostMedia));
  router.delete("/posts/:id", auth, asyncHandler(controller.deletePost));

  return router;
}

export default createPostRoutes;
