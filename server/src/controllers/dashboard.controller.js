const Order = require("../models/Order");
const Product = require("../models/Product");
const SiteSettings = require("../models/SiteSettings");

const asyncHandler = require("../utils/asyncHandler");

const pendingOrderStatuses = [
  "pending_confirmation",
  "pending_payment",
  "pending_payment_verification",
];

const revenueMatch = {
  orderStatus: { $ne: "cancelled" },
  $or: [{ paymentStatus: "paid" }, { orderStatus: "delivered" }],
};

const startOfToday = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfToday = () => {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
};

const startOfLast7Days = () => {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  date.setHours(0, 0, 0, 0);
  return date;
};

const formatDateKey = (date) => {
  return date.toISOString().slice(0, 10);
};

const getColorPrimaryImage = (color) => {
  const images = Array.isArray(color.images) ? color.images : [];

  const primaryImage =
    images.find((image) => image.role === "primary" && image.url) ||
    images.find((image) => image.url);

  return primaryImage?.url || "";
};

const getRevenueStats = async (match = {}) => {
  const [result] = await Order.aggregate([
    {
      $match: match,
    },
    {
      $group: {
        _id: null,
        revenue: { $sum: "$total" },
        orders: { $sum: 1 },
      },
    },
  ]);

  return {
    revenue: result?.revenue || 0,
    orders: result?.orders || 0,
  };
};

const getLast7DaysStats = async () => {
  const startDate = startOfLast7Days();

  const rawStats = await Order.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
          },
        },
        orders: { $sum: 1 },
        revenue: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $ne: ["$orderStatus", "cancelled"] },
                  {
                    $or: [
                      { $eq: ["$paymentStatus", "paid"] },
                      { $eq: ["$orderStatus", "delivered"] },
                    ],
                  },
                ],
              },
              "$total",
              0,
            ],
          },
        },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
  ]);

  const statsMap = new Map(rawStats.map((item) => [item._id, item]));

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    const key = formatDateKey(date);
    const found = statsMap.get(key);

    return {
      date: key,
      label: date.toLocaleDateString("en-EG", {
        weekday: "short",
        day: "numeric",
      }),
      orders: found?.orders || 0,
      revenue: found?.revenue || 0,
    };
  });
};

const getLowStockItems = async (threshold) => {
  const products = await Product.find({
    status: { $ne: "archived" },
  })
    .populate("category", "name slug")
    .select("name slug category colors status")
    .lean();

  const lowStockItems = [];

  products.forEach((product) => {
    const colors = Array.isArray(product.colors) ? product.colors : [];

    colors.forEach((color) => {
      if (color.isActive === false) return;

      const sizes = Array.isArray(color.sizes) ? color.sizes : [];

      sizes.forEach((size) => {
        if (size.isActive === false) return;

        const stock = Number(size.stock || 0);

        if (stock <= threshold) {
          lowStockItems.push({
            productId: product._id,
            productName: product.name,
            productSlug: product.slug,
            productStatus: product.status,
            categoryName: product.category?.name || "",
            colorName: color.name,
            colorHex: color.hex || "",
            sizeLabel: size.label,
            sku: size.sku || "",
            stock,
            image: getColorPrimaryImage(color),
          });
        }
      });
    });
  });

  return lowStockItems
    .sort((a, b) => a.stock - b.stock || a.productName.localeCompare(b.productName))
    .slice(0, 12);
};

const getAdminDashboardStats = asyncHandler(async (req, res) => {
  const todayStart = startOfToday();
  const todayEnd = endOfToday();

  const settings = await SiteSettings.getSingleton();
  const lowStockThreshold = Number(settings.lowStockThreshold || 5);

  const [
    totalOrders,
    todayOrders,
    pendingOrders,
    paymentVerificationOrders,
    deliveredOrders,
    cancelledOrders,
    allTimeRevenue,
    todayRevenue,
    latestOrders,
    lowStockItems,
    last7Days,
  ] = await Promise.all([
    Order.countDocuments({}),
    Order.countDocuments({
      createdAt: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    }),
    Order.countDocuments({
      orderStatus: { $in: pendingOrderStatuses },
    }),
    Order.countDocuments({
      paymentStatus: "pending_verification",
    }),
    Order.countDocuments({
      orderStatus: "delivered",
    }),
    Order.countDocuments({
      orderStatus: "cancelled",
    }),
    getRevenueStats(revenueMatch),
    getRevenueStats({
      ...revenueMatch,
      createdAt: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    }),
    Order.find({})
      .sort({ createdAt: -1 })
      .limit(6)
      .select(
        "orderNumber customerInfo.fullName customerInfo.phone total orderStatus paymentStatus paymentMethod createdAt"
      )
      .lean(),
    getLowStockItems(lowStockThreshold),
    getLast7DaysStats(),
  ]);

  res.status(200).json({
    success: true,
    stats: {
      totalOrders,
      todayOrders,
      pendingOrders,
      paymentVerificationOrders,
      deliveredOrders,
      cancelledOrders,
      allTimeRevenue,
      todayRevenue,
      lowStockThreshold,
      lowStockCount: lowStockItems.length,
      latestOrders,
      lowStockItems,
      last7Days,
    },
  });
});

module.exports = {
  getAdminDashboardStats,
};