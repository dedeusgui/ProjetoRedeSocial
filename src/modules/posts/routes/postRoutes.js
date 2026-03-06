import { Router } from "express";
import auth from "../../../middleware/auth.js";
import asyncHandler from "../../../common/http/asyncHandler.js";

function createPostRoutes(controller) {
  const router = Router();

  router.post("/posts", auth, asyncHandler(controller.createPost));
  router.get("/posts/:id", asyncHandler(controller.getPostById));
  router.patch("/posts/:id", auth, asyncHandler(controller.updatePost));
  router.delete("/posts/:id", auth, asyncHandler(controller.deletePost));

  return router;
}

export default createPostRoutes;
