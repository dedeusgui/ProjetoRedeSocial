import path from "node:path";

process.env.MONGO_URI ??= "mongodb://localhost:27017/thesocial_seed";
process.env.PORT ??= "3101";
process.env.ADMIN_EMAILS ??= "admin@seed.local";
process.env.UPLOAD_ROOT ??= path.resolve(process.cwd(), "uploads", "seed-populate");

const { startServer } = await import("../src/server.js");

const server = await startServer();

async function closeServer(signal) {
  console.log(`Received ${signal}, shutting down demo server...`);
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    try {
      await closeServer(signal);
      process.exit(0);
    } catch (error) {
      console.error("Failed to close demo server cleanly.", error);
      process.exit(1);
    }
  });
}
