import mongoose from "mongoose";
import env from "./env.js";

async function connectDB() {
  await mongoose.connect(env.mongoUri);
  return mongoose.connection;
}

export default connectDB;
