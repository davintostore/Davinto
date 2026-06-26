import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import SectionLabel from "../../components/ui/SectionLabel";
import useSeo from "../../hooks/useSeo";

import { getAdminDashboardStatsRequest } from "../../services/dashboardService";

const formatMoney = (value) => {
  const number = Number(value || 0);

  return new Intl.NumberFormat("en-EG", {
    style: "currency",
    currency: "EGP",
    maximumFractionDigits: 0,
  }).format(number);
};

const formatDate = (value) => {
  if (!value) return "";

  return new Date(value).toLocaleString("en-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const formatStatus = (value = "") => {
  return String(value || "").replaceAll("_", " ");
};

const StatCard = ({ label, value, hint, tone = "neutral" }) => {
  const toneClass =
    tone === "good"
      ? "border-emerald-300/20 bg-emerald-400/10"
      : tone === "warning"
        ? "border-yellow-300/20 bg-yellow-400/10"
        : tone === "danger"
          ? "border-red-300/20 bg-red-400/10"
          : "border-white/10 bg-white/[0.025]";

  return (
    <div className={`rounded-3xl border p-5 ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-[0.24em] text-white/35">
        {label}
      </p>

      <p className="mt-4 text-3xl font-black text-white">{value}</p>

      {hint && <p className="mt-2 text-xs leading-6 text-white/45">{hint}</p>}
    </div>
  );
};

const MiniBar = ({ value, max }) => {
  const percentage = max > 0 ? Math.max(8, Math.round((value / max) * 100)) : 8;

  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full bg-white/70"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

const AdminDashboard = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: getAdminDashboardStatsRequest,
  });

  // SEO
  useSeo({
    title: "Admin Dashboard | Davinto Store",
    description: "Admin dashboard for Davinto Store.",
    robots: "noindex,nofollow",
  });

  const stats = data?.stats;

  const maxDailyOrders = Math.max(
    ...(stats?.last7Days || []).map((day) => day.orders),
    1
  );

  return (
    <div className="space-y-8">
      <PageHeader
        label="Admin"
        title="Dashboard"
        description="A quick overview of orders, revenue, payment verification, stock alerts, and recent activity."
        className="pt-0"
      />

      {isLoading && (
        <Card>
          <p className="text-sm text-white/45">Loading dashboard...</p>
        </Card>
      )}

      {isError && (
        <Card>
          <div className="rounded-2xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {error?.friendlyMessage ||
              error?.message ||
              "Failed to load dashboard stats."}
          </div>
        </Card>
      )}

      {!isLoading && !isError && stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Today Orders"
              value={stats.todayOrders}
              hint="Orders created today."
              tone={stats.todayOrders > 0 ? "good" : "neutral"}
            />

            <StatCard
              label="Pending Orders"
              value={stats.pendingOrders}
              hint="Needs confirmation/payment progress."
              tone={stats.pendingOrders > 0 ? "warning" : "neutral"}
            />

            <StatCard
              label="Payment Verification"
              value={stats.paymentVerificationOrders}
              hint="Manual payments waiting for review."
              tone={stats.paymentVerificationOrders > 0 ? "warning" : "neutral"}
            />

            <StatCard
              label="Low Stock"
              value={stats.lowStockCount}
              hint={`Threshold: ${stats.lowStockThreshold} units.`}
              tone={stats.lowStockCount > 0 ? "danger" : "good"}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="All Orders"
              value={stats.totalOrders}
              hint="Total orders in the system."
            />

            <StatCard
              label="All-Time Revenue"
              value={formatMoney(stats.allTimeRevenue?.revenue)}
              hint={`${stats.allTimeRevenue?.orders || 0} paid/delivered orders.`}
              tone="good"
            />

            <StatCard
              label="Today Revenue"
              value={formatMoney(stats.todayRevenue?.revenue)}
              hint={`${stats.todayRevenue?.orders || 0} paid/delivered today.`}
              tone={stats.todayRevenue?.revenue > 0 ? "good" : "neutral"}
            />

            <StatCard
              label="Delivered / Cancelled"
              value={`${stats.deliveredOrders} / ${stats.cancelledOrders}`}
              hint="Delivered orders vs cancelled orders."
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Card>
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <SectionLabel>Activity</SectionLabel>

                  <h2 className="mt-3 text-2xl font-black uppercase">
                    Last 7 Days
                  </h2>
                </div>

                <Link to="/admin/orders">
                  <Button variant="secondary">View Orders</Button>
                </Link>
              </div>

              <div className="space-y-4">
                {stats.last7Days?.map((day) => (
                  <div
                    key={day.date}
                    className="rounded-3xl border border-white/10 bg-white/[0.025] p-4"
                  >
                    <div className="mb-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-black uppercase text-white">
                          {day.label}
                        </p>

                        <p className="mt-1 text-xs text-white/35">
                          {day.date}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-black text-white">
                          {day.orders} orders
                        </p>

                        <p className="mt-1 text-xs text-white/45">
                          {formatMoney(day.revenue)}
                        </p>
                      </div>
                    </div>

                    <MiniBar value={day.orders} max={maxDailyOrders} />
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <SectionLabel>Actions</SectionLabel>

                  <h2 className="mt-3 text-2xl font-black uppercase">
                    Quick Links
                  </h2>
                </div>
              </div>

              <div className="grid gap-3">
                <Link to="/admin/orders">
                  <Button className="w-full">Manage Orders</Button>
                </Link>

                <Link to="/admin/products">
                  <Button variant="secondary" className="w-full">
                    Manage Products
                  </Button>
                </Link>

                <Link to="/admin/discount-codes">
                  <Button variant="secondary" className="w-full">
                    Discount Codes
                  </Button>
                </Link>

                <Link to="/admin/offers">
                  <Button variant="secondary" className="w-full">
                    Offers
                  </Button>
                </Link>

                <Link to="/admin/bundles">
                  <Button variant="secondary" className="w-full">
                    Bundles
                  </Button>
                </Link>

                <Link to="/admin/settings">
                  <Button variant="secondary" className="w-full">
                    Settings
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Card>
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <SectionLabel>Latest</SectionLabel>

                  <h2 className="mt-3 text-2xl font-black uppercase">
                    Recent Orders
                  </h2>
                </div>

                <Link to="/admin/orders">
                  <Button variant="secondary">Open Orders</Button>
                </Link>
              </div>

              {stats.latestOrders?.length === 0 && (
                <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 text-sm text-white/45">
                  No orders yet.
                </div>
              )}

              <div className="space-y-3">
                {stats.latestOrders?.map((order) => (
                  <div
                    key={order._id}
                    className="rounded-3xl border border-white/10 bg-white/[0.025] p-4"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-lg font-black uppercase text-white">
                          {order.orderNumber}
                        </p>

                        <p className="mt-1 text-sm text-white/45">
                          {order.customerInfo?.fullName || "Customer"} ·{" "}
                          {order.customerInfo?.phone || "No phone"}
                        </p>

                        <p className="mt-2 text-xs text-white/30">
                          {formatDate(order.createdAt)}
                        </p>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-lg font-black text-white">
                          {formatMoney(order.total)}
                        </p>

                        <p className="mt-1 text-xs uppercase text-white/40">
                          {formatStatus(order.orderStatus)}
                        </p>

                        <p className="mt-1 text-xs uppercase text-white/40">
                          {formatStatus(order.paymentStatus)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <SectionLabel>Stock</SectionLabel>

                  <h2 className="mt-3 text-2xl font-black uppercase">
                    Low Stock Alerts
                  </h2>
                </div>

                <Link to="/admin/products">
                  <Button variant="secondary">Open Products</Button>
                </Link>
              </div>

              {stats.lowStockItems?.length === 0 && (
                <div className="rounded-3xl border border-emerald-300/15 bg-emerald-400/10 p-6 text-sm text-emerald-100">
                  No low stock alerts. Inventory looks healthy.
                </div>
              )}

              <div className="space-y-3">
                {stats.lowStockItems?.map((item) => (
                  <div
                    key={`${item.productId}-${item.colorName}-${item.sizeLabel}-${item.sku}`}
                    className="rounded-3xl border border-white/10 bg-white/[0.025] p-4"
                  >
                    <div className="flex gap-4">
                      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.productName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-white/5" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="truncate text-sm font-black uppercase text-white">
                              {item.productName}
                            </p>

                            <p className="mt-1 text-xs text-white/40">
                              {item.categoryName || "No category"}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/45">
                              <span className="rounded-full border border-white/10 px-3 py-1">
                                {item.colorName}
                              </span>

                              <span className="rounded-full border border-white/10 px-3 py-1">
                                Size {item.sizeLabel}
                              </span>

                              {item.sku && (
                                <span className="rounded-full border border-white/10 px-3 py-1">
                                  {item.sku}
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-lg font-black text-red-100">
                            {item.stock}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;