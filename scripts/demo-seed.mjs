process.env.SEED_MONGO_URI ??= "mongodb://localhost:27017/thesocial_seed";
process.env.SEED_ALLOW_RESET ??= "true";
process.env.ADMIN_EMAILS ??= "admin@seed.local";
process.env.SEED_PORT ??= "3101";

await import("./test-populate-smoke.mjs");
