import ModerationRepository from "./repositories/ModerationRepository.js";
import ModerationService from "./services/ModerationService.js";
import ModerationController from "./controllers/ModerationController.js";
import createModerationRoutes from "./routes/moderationRoutes.js";

function createModerationModule({ postService, userService }) {
  const moderationRepository = new ModerationRepository();
  const moderationService = new ModerationService(
    moderationRepository,
    postService,
    userService,
  );
  const moderationController = new ModerationController(moderationService);
  const router = createModerationRoutes(moderationController);

  return {
    router,
    service: moderationService,
  };
}

export default createModerationModule;
