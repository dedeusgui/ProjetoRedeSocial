import { Router } from "express";
import auth from "../../../middleware/auth.js";
import asyncHandler from "../../../common/http/asyncHandler.js";

function createCollectionRoutes(controller) {
  const router = Router();

  router.get("/collections/:id", asyncHandler(controller.getCollectionById));
  router.get("/me/collections", auth, asyncHandler(controller.listMyCollections));
  router.post("/collections", auth, asyncHandler(controller.createCollection));
  router.patch("/collections/:id", auth, asyncHandler(controller.updateCollection));
  router.delete("/collections/:id", auth, asyncHandler(controller.deleteCollection));
  router.post("/collections/:id/items", auth, asyncHandler(controller.addCollectionItems));
  router.delete(
    "/collections/:id/items/:postId",
    auth,
    asyncHandler(controller.removeCollectionItem),
  );
  router.patch(
    "/collections/:id/items/reorder",
    auth,
    asyncHandler(controller.reorderCollectionItems),
  );

  return router;
}

export default createCollectionRoutes;
