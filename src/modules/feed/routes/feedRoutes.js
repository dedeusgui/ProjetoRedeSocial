import { Router } from "express";
import asyncHandler from "../../../common/http/asyncHandler.js";

function createFeedRoutes(controller) {
  const router = Router();

  router.get("/feed", asyncHandler(controller.getFeed));

  return router;
}

export default createFeedRoutes;
