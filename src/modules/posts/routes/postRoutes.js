import { Router } from "express";
import auth from "../../../middleware/auth.js";
import roles from "../../../middleware/roles.js";
import asyncHandler from "../../../common/http/asyncHandler.js";

function createPostRoutes(controller) {
  const router = Router();

  router.post("/posts", auth, asyncHandler(controller.createPost));
  router.get("/posts/:id", asyncHandler(controller.getPostById));
  router.delete("/posts/:id", auth, roles("admin"), asyncHandler(controller.deletePostByAdmin));

  return router;
}

export default createPostRoutes;
