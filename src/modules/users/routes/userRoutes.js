import { Router } from "express";
import auth from "../../../middleware/auth.js";
import asyncHandler from "../../../common/http/asyncHandler.js";

function createUserRoutes(controller) {
  const router = Router();

  router.get("/me/profile", auth, asyncHandler(controller.getMeProfile));

  return router;
}

export default createUserRoutes;
