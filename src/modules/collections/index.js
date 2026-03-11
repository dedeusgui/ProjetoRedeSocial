import CollectionRepository from "./repositories/CollectionRepository.js";
import CollectionService from "./services/CollectionService.js";
import CollectionController from "./controllers/CollectionController.js";
import createCollectionRoutes from "./routes/collectionRoutes.js";

function createCollectionsModule() {
  const collectionRepository = new CollectionRepository();
  const collectionService = new CollectionService(collectionRepository);
  const collectionController = new CollectionController(collectionService);
  const router = createCollectionRoutes(collectionController);

  return {
    router,
    service: collectionService,
  };
}

export default createCollectionsModule;
