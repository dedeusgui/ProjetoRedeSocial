import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import connectDB from "./config/db.js";
import env from "./config/env.js";
import errorHandler from "./common/http/errorHandler.js";
import { sendSuccess } from "./common/http/responses.js";
import AppError from "./common/errors/AppError.js";
import createAuthModule from "./modules/auth/index.js";
import createUsersModule from "./modules/users/index.js";
import createCommentsModule from "./modules/comments/index.js";
import createCollectionsModule from "./modules/collections/index.js";
import createPostsModule from "./modules/posts/index.js";
import createFeedModule from "./modules/feed/index.js";
import createModerationModule from "./modules/moderation/index.js";
import createAdminModule from "./modules/admin/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  fs.mkdirSync(env.uploadRoot, { recursive: true });
  app.use("/uploads", express.static(env.uploadRoot));
  app.use(express.static(path.join(__dirname, "public")));

  const usersModule = createUsersModule();
  const commentsModule = createCommentsModule();
  const collectionsModule = createCollectionsModule();
  const postsModule = createPostsModule({
    commentService: commentsModule.service,
    userService: usersModule.service,
    collectionService: collectionsModule.service,
  });
  const feedModule = createFeedModule({
    userService: usersModule.service,
    collectionService: collectionsModule.service,
  });
  const adminModule = createAdminModule({
    adminEmails: env.adminEmails,
  });
  const moderationModule = createModerationModule({
    postService: postsModule.service,
  });
  const authModule = createAuthModule({
    jwtSecret: env.jwtSecret,
    jwtExpiresInSeconds: env.jwtExpiresInSeconds,
    adminEmails: env.adminEmails,
  });
  app.locals.adminService = adminModule.service;

  app.get("/", (req, res) => {
    sendSuccess(res, {
      name: "The Social Network API",
      version: "v1",
    });
  });

  app.use("/api/v1", authModule.router);
  app.use("/api/v1", usersModule.router);
  app.use("/api/v1", feedModule.router);
  app.use("/api/v1", collectionsModule.router);
  app.use("/api/v1", postsModule.router);
  app.use("/api/v1", commentsModule.router);
  app.use("/api/v1", adminModule.router);
  app.use("/api/v1", moderationModule.router);

  app.use((req, res, next) => {
    next(new AppError("Route not found.", "NOT_FOUND", 404));
  });

  app.use(errorHandler);

  return app;
}

async function startServer() {
  await connectDB();
  const app = createApp();
  await app.locals.adminService.syncAdminUsers();

  const server = app.listen(env.port, () => {
    console.log(`Server is running on port ${env.port}`);
  });

  return server;
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectExecution) {
  startServer().catch((error) => {
    console.error("Failed to start server", error);
    process.exit(1);
  });
}

export { createApp, startServer };
