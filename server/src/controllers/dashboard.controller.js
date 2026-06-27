const Order = require("../models/Order");
const Product = require("../models/Product");
const SiteSettings = require("../models/SiteSettings");

const asyncHandler = require("../utils/asyncHandler");

const pendingOrderStatuses = [
  "pending_confirmation",
  "pending_payment",
  "pending_payment_verification",
];
const DASHBOARD_TIME_ZONE = process.env.DASHBOARD_TIME_ZONE || "Africa/Cairo";
const visibleOrderMatch = { deletedAt: null };

const revenueMatch = {
  ...visibleOrderMatch,
  orderStatus: { $ne: "cancelled" },
  $or: [{ paymentStatus: "paid" }, { orderStatus: "delivered" }],
};

const getZonedDateParts = (date, timeZone = DASHBOARD_TIME_ZONE) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );
};

const getTimeZoneOffsetMs = (date, timeZone = DASHBOARD_TIME_ZONE) => {
  const parts = getZonedDateParts(date, timeZone);
  const zonedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return zonedAsUtc - date.getTime();
};

const getUtcDateForZonedTime = ({
  year,
  month,
  day,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
  timeZone = DASHBOARD_TIME_ZONE,
}) => {
  const utcTimestamp = Date.UTC(
    year,
    month - 1,
    day,
    hour,
    minute,
    second,
    millisecond
  );
  const offset = getTimeZoneOffsetMs(new Date(utcTimestamp), timeZone);

  return new Date(utcTimestamp - offset);
};

const startOfToday = () => {
  const today = getZonedDateParts(new Date());

  return getUtcDateForZonedTime({
    year: today.year,
    month: today.month,
    day: today.day,
  });
};

const endOfToday = () => {
  const today = getZonedDateParts(new Date());

  return getUtcDateForZonedTime({
    year: today.year,
    month: today.month,
    day: today.day,
    hour: 23,
    minute: 59,
    second: 59,
    millisecond: 999,
  });
};

const startOfLast7Days = () => {
  const todayStart = startOfToday();
  const startDate = new Date(todayStart);
  startDate.setUTCDate(startDate.getUTCDate() - 6);

  return startDate;
};

const formatDateKey = (date) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: DASHBOARD_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
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
        ...visibleOrderMatch,
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m-%d",
            date: "$createdAt",
            timezone: DASHBOARD_TIME_ZONE,
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
        timeZone: DASHBOARD_TIME_ZONE,
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
    Order.countDocuments(visibleOrderMatch),
    Order.countDocuments({
      ...visibleOrderMatch,
      createdAt: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    }),
    Order.countDocuments({
      ...visibleOrderMatch,
      orderStatus: { $in: pendingOrderStatuses },
    }),
    Order.countDocuments({
      ...visibleOrderMatch,
      paymentStatus: "pending_verification",
    }),
    Order.countDocuments({
      ...visibleOrderMatch,
      orderStatus: "delivered",
    }),
    Order.countDocuments({
      ...visibleOrderMatch,
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
    Order.find(visibleOrderMatch)
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
