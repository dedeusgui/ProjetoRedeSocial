import AdminController from "./controllers/AdminController.js";
import AdminRepository from "./repositories/AdminRepository.js";
import createAdminRoutes from "./routes/adminRoutes.js";
import AdminService from "./services/AdminService.js";

function createAdminModule({ adminEmails = [], accountDeletionService = null }) {
  const adminRepository = new AdminRepository();
  const adminService = new AdminService(
    adminRepository,
    adminEmails,
    accountDeletionService,
  );
  const adminController = new AdminController(adminService);
  const router = createAdminRoutes(adminController);

  return {
    router,
    service: adminService,
  };
}

export default createAdminModule;
