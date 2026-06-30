const mongoose = require("mongoose");
const { isProduction } = require("./env");

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      if (isProduction()) {
        throw new Error("MONGO_URI is required in production.");
      }

      console.log("MongoDB not connected: MONGO_URI is missing.");
      return;
    }

    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
