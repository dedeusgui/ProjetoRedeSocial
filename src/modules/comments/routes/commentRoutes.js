import { Router } from "express";
import auth from "../../../middleware/auth.js";
import asyncHandler from "../../../common/http/asyncHandler.js";

function createCommentRoutes(controller) {
  const router = Router();

  router.get("/posts/:id/comments", asyncHandler(controller.getCommentsByPost));
  router.post("/posts/:id/comments", auth, asyncHandler(controller.createComment));
  router.patch("/comments/:id", auth, asyncHandler(controller.updateComment));
  router.delete("/comments/:id", auth, asyncHandler(controller.deleteComment));

  return router;
}

export default createCommentRoutes;
