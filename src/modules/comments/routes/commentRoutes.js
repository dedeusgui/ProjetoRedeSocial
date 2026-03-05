import { Router } from "express";
import auth from "../../../middleware/auth.js";
import roles from "../../../middleware/roles.js";
import asyncHandler from "../../../common/http/asyncHandler.js";

function createCommentRoutes(controller) {
  const router = Router();

  router.get("/posts/:id/comments", asyncHandler(controller.getCommentsByPost));
  router.post("/posts/:id/comments", auth, asyncHandler(controller.createComment));
  router.delete(
    "/comments/:id",
    auth,
    roles("moderator", "admin"),
    asyncHandler(controller.deleteCommentByAdmin),
  );

  return router;
}

export default createCommentRoutes;
