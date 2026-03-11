import PostRepository from "./repositories/PostRepository.js";
import PostService from "./services/PostService.js";
import PostController from "./controllers/PostController.js";
import createPostRoutes from "./routes/postRoutes.js";

function createPostsModule({ commentService, userService, collectionService }) {
  const postRepository = new PostRepository();
  const postService = new PostService(
    postRepository,
    commentService,
    userService,
    collectionService,
  );
  const postController = new PostController(postService);
  const router = createPostRoutes(postController);

  return {
    router,
    service: postService,
  };
}

export default createPostsModule;
