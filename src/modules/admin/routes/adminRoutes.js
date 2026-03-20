import { Router } from "express";
import auth from "../../../middleware/auth.js";
import roles from "../../../middleware/roles.js";
import asyncHandler from "../../../common/http/asyncHandler.js";

function createAdminRoutes(controller) {
  const router = Router();

  router.get(
    "/admin/users",
    auth,
    roles("admin"),
    asyncHandler(controller.getUsersWithRoles),
  );

  router.get(
    "/admin/moderator-eligibility",
    auth,
    roles("admin"),
    asyncHandler(controller.getModeratorEligibility),
  );

  router.get(
    "/admin/users/:id/delete-preview",
    auth,
    roles("admin"),
    asyncHandler(controller.getDeleteUserPreview),
  );

  router.patch(
    "/admin/users/:id/moderator",
    auth,
    roles("admin"),
    asyncHandler(controller.updateModeratorRole),
  );

  router.delete(
    "/admin/users/:id",
    auth,
    roles("admin"),
    asyncHandler(controller.deleteUserByAdmin),
  );

  return router;
}

export default createAdminRoutes;
