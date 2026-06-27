const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { corsOptions } = require("./config/cors");

const healthRoutes = require("./routes/health.routes");
const authRoutes = require("./routes/auth.routes");
const customerAuthRoutes = require("./routes/customerAuth.routes");
const categoryRoutes = require("./routes/category.routes");
const productRoutes = require("./routes/product.routes");
const settingsRoutes = require("./routes/settings.routes");
const orderRoutes = require("./routes/order.routes");
const discountCodeRoutes = require("./routes/discountCode.routes");
const offerRoutes = require("./routes/offer.routes");
const bundleRoutes = require("./routes/bundle.routes");
const quoteRoutes = require("./routes/quote.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const uploadRoutes = require("./routes/upload.routes");
const notificationRoutes = require("./routes/notification.routes");
const paymobRoutes = require("./routes/paymob.routes");

const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// Render and similar hosts forward the original client IP through one trusted
// proxy. This keeps IP-based rate limiting accurate without affecting local dev.
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
    frameguard: {
      action: "deny",
    },
    referrerPolicy: {
      policy: "no-referrer",
    },
  })
);

app.use(cors(corsOptions));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Davinto server is alive.",
  });
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/customer-auth", customerAuthRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/discount-codes", discountCodeRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/bundles", bundleRoutes);
app.use("/api/quote", quoteRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/paymob", paymobRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
