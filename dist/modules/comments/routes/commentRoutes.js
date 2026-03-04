import { Router } from "express";
import auth from "../../../middleware/auth.js";
import asyncHandler from "../../../common/http/asyncHandler.js";

function createCommentRoutes(controller) {
  const router = Router();

  router.get("/posts/:id/comments", asyncHandler(controller.getCommentsByPost));
  router.post("/posts/:id/comments", auth, asyncHandler(controller.createComment));

  return router;
}

export default createCommentRoutes;
