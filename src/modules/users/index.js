import UserRepository from "./repositories/UserRepository.js";
import UserService from "./services/UserService.js";
import UserController from "./controllers/UserController.js";
import createUserRoutes from "./routes/userRoutes.js";

function createUsersModule() {
  const userRepository = new UserRepository();
  const userService = new UserService(userRepository);
  const userController = new UserController(userService);
  const router = createUserRoutes(userController);

  return {
    router,
    service: userService,
  };
}

export default createUsersModule;
