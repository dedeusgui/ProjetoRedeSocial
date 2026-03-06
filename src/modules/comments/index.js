import CommentRepository from "./repositories/CommentRepository.js";
import CommentService from "./services/CommentService.js";
import CommentController from "./controllers/CommentController.js";
import createCommentRoutes from "./routes/commentRoutes.js";

function createCommentsModule() {
  const commentRepository = new CommentRepository();
  const commentService = new CommentService(commentRepository);
  const commentController = new CommentController(commentService);
  const router = createCommentRoutes(commentController);

  return {
    router,
    service: commentService,
  };
}

export default createCommentsModule;
