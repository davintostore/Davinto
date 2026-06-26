require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const { allowedCorsOrigins } = require("./config/cors");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Davinto API running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`Allowed CORS origins: ${allowedCorsOrigins.join(", ") || "(none configured)"}`);
  });
};

startServer();
