import mongoose from "mongoose";

function connectDB() {
  return mongoose.connect("mongodb://localhost:27017/thesocial");
}

export default connectDB;
