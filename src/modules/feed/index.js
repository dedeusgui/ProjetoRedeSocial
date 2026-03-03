import FeedRepository from "./repositories/FeedRepository.js";
import FeedService from "./services/FeedService.js";
import FeedController from "./controllers/FeedController.js";
import createFeedRoutes from "./routes/feedRoutes.js";

function createFeedModule() {
  const feedRepository = new FeedRepository();
  const feedService = new FeedService(feedRepository);
  const feedController = new FeedController(feedService);
  const router = createFeedRoutes(feedController);

  return {
    router,
    service: feedService,
  };
}

export default createFeedModule;
