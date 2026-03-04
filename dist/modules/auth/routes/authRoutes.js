import { Router } from "express";
import asyncHandler from "../../../common/http/asyncHandler.js";

function createAuthRoutes(controller) {
  const router = Router();

  router.post("/auth/register", asyncHandler(controller.register));
  router.post("/auth/login", asyncHandler(controller.login));

  return router;
}

export default createAuthRoutes;
