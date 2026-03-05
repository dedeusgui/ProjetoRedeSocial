import { Router } from "express";
import auth from "../../../middleware/auth.js";
import roles from "../../../middleware/roles.js";
import asyncHandler from "../../../common/http/asyncHandler.js";

function createAdminRoutes(controller) {
  const router = Router();

  router.get(
    "/admin/moderator-eligibility",
    auth,
    roles("admin"),
    asyncHandler(controller.getModeratorEligibility),
  );

  router.patch(
    "/admin/users/:id/moderator",
    auth,
    roles("admin"),
    asyncHandler(controller.updateModeratorRole),
  );

  return router;
}

export default createAdminRoutes;
