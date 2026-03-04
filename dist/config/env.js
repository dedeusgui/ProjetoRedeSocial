const env = {
  port: Number.parseInt(process.env.PORT ?? "3000", 10),
  mongoUri: process.env.MONGO_URI ?? "mongodb://localhost:27017/thesocial",
  jwtSecret: process.env.JWT_SECRET ?? "change-me-in-production",
  jwtExpiresInSeconds: Number.parseInt(process.env.JWT_EXPIRES_IN_SECONDS ?? `${60 * 60 * 12}`, 10),
};

export default env;
