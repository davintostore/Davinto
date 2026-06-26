import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import SectionLabel from "../../components/ui/SectionLabel";
import Textarea from "../../components/ui/Textarea";
import useSeo from "../../hooks/useSeo";

import {
  getAdminOrdersRequest,
  retryAdminPaymobPaymentRequest,
  updateAdminOrderStatusRequest,
  updateAdminPaymentStatusRequest,
} from "../../services/orderService";

const orderStatusOptions = [
  { value: "pending_confirmation", label: "Pending Confirmation" },
  { value: "pending_payment", label: "Pending Payment" },
  {
    value: "pending_payment_verification",
    label: "Pending Payment Verification",
  },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "ready_to_ship", label: "Ready To Ship" },
  { value: "out_for_delivery", label: "Out For Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const paymentStatusOptions = [
  { value: "unpaid", label: "Unpaid" },
  { value: "pending", label: "Pending" },
  { value: "pending_verification", label: "Pending Verification" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "expired", label: "Expired" },
  { value: "refunded", label: "Refunded" },
];

const paymentMethodOptions = [
  { value: "cod", label: "Cash on Delivery" },
  { value: "instapay", label: "Instapay" },
  { value: "vodafoneCash", label: "Vodafone Cash" },
  { value: "paymobCard", label: "Visa / Mastercard" },
];

const statusLabel = (value, options) => {
  return options.find((option) => option.value === value)?.label || value;
};

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

const formatGovernorate = (value = "") => {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  if (!rawValue.includes("_")) return rawValue;

  return rawValue
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const getOrderStatusStyle = (status) => {
  if (status === "delivered") {
    return "border-emerald-300/25 bg-emerald-400/10 text-emerald-100";
  }

  if (status === "cancelled") {
    return "border-red-300/25 bg-red-400/10 text-red-100";
  }

  if (
    [
      "pending_confirmation",
      "pending_payment",
      "pending_payment_verification",
    ].includes(status)
  ) {
    return "border-yellow-300/25 bg-yellow-400/10 text-yellow-100";
  }

  return "border-white/10 bg-white/5 text-white/60";
};

const getPaymentStatusStyle = (status) => {
  if (status === "paid") {
    return "border-emerald-300/25 bg-emerald-400/10 text-emerald-100";
  }

  if (["failed", "expired", "refunded"].includes(status)) {
    return "border-red-300/25 bg-red-400/10 text-red-100";
  }

  if (["pending", "pending_verification"].includes(status)) {
    return "border-yellow-300/25 bg-yellow-400/10 text-yellow-100";
  }

  return "border-white/10 bg-white/5 text-white/60";
};

const canRetryPaymob = (order) => {
  return (
    order.paymentMethod === "paymobCard" &&
    order.paymentStatus !== "paid" &&
    order.orderStatus !== "cancelled"
  );
};

const AdminOrders = () => {
  const queryClient = useQueryClient();

  // SEO
  useSeo({
    title: "Admin Orders | Davinto Store",
    description: "Admin orders management for Davinto Store.",
    robots: "noindex,nofollow",
  });

  const [filters, setFilters] = useState({
    search: "",
    orderStatus: "",
    paymentStatus: "",
    paymentMethod: "",
  });

  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [feedback, setFeedback] = useState({
    type: "",
    message: "",
  });
  const [confirmationModal, setConfirmationModal] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-orders", filters],
    queryFn: () =>
      getAdminOrdersRequest({
        search: filters.search || undefined,
        orderStatus: filters.orderStatus || undefined,
        paymentStatus: filters.paymentStatus || undefined,
        paymentMethod: filters.paymentMethod || undefined,
      }),
  });

  const orders = useMemo(() => data?.orders || [], [data]);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
  };

  const updateFilter = (event) => {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: "",
      orderStatus: "",
      paymentStatus: "",
      paymentMethod: "",
    });
  };

  const copyText = async (text, successMessage) => {
    if (!text) {
      showFeedback("error", "There is no link to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showFeedback("success", successMessage || "Copied successfully.");
    } catch {
      showFeedback("error", "Could not copy. Please copy the link manually.");
    }
  };

  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ orderId, payload }) =>
      updateAdminOrderStatusRequest(orderId, payload),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      showFeedback("success", response?.message || "Order status updated.");
    },
    onError: (err) => {
      showFeedback(
        "error",
        err?.friendlyMessage ||
          err?.message ||
          "Failed to update order status."
      );
    },
  });

  const updatePaymentStatusMutation = useMutation({
    mutationFn: ({ orderId, paymentStatus }) =>
      updateAdminPaymentStatusRequest(orderId, paymentStatus),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      showFeedback("success", response?.message || "Payment status updated.");
    },
    onError: (err) => {
      showFeedback(
        "error",
        err?.friendlyMessage ||
          err?.message ||
          "Failed to update payment status."
      );
    },
  });

  const retryPaymobMutation = useMutation({
    mutationFn: retryAdminPaymobPaymentRequest,
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });

      const paymentLink =
        response?.payment?.redirectUrl ||
        response?.order?.paymentGateway?.paymobIframeUrl ||
        "";

      showFeedback(
        "success",
        response?.message || "Paymob payment link generated successfully."
      );

      if (paymentLink) {
        window.open(paymentLink, "_blank", "noopener,noreferrer");
      }
    },
    onError: (err) => {
      showFeedback(
        "error",
        err?.friendlyMessage ||
          err?.message ||
          "Could not generate Paymob payment link."
      );
    },
  });

  const handleOrderStatusChange = (order, nextStatus) => {
    if (!nextStatus || nextStatus === order.orderStatus) return;

    setConfirmationModal({
      type: "orderStatus",
      order,
      nextStatus,
      targetLabel: statusLabel(nextStatus, orderStatusOptions),
      note: "",
    });
  };

  const handlePaymentStatusChange = (order, nextStatus) => {
    if (!nextStatus || nextStatus === order.paymentStatus) return;

    setConfirmationModal({
      type: "paymentStatus",
      order,
      nextStatus,
      targetLabel: statusLabel(nextStatus, paymentStatusOptions),
      note: "",
    });
  };

  const handleRetryPaymob = (order) => {
    setConfirmationModal({
      type: "paymobRetry",
      order,
      nextStatus: "",
      targetLabel: "Regenerate Paymob Link",
      note: "",
    });
  };

  const updateModalNote = (event) => {
    setConfirmationModal((current) =>
      current
        ? {
            ...current,
            note: event.target.value,
          }
        : current
    );
  };

  const closeConfirmationModal = () => {
    if (
      updateOrderStatusMutation.isPending ||
      updatePaymentStatusMutation.isPending ||
      retryPaymobMutation.isPending
    ) {
      return;
    }

    setConfirmationModal(null);
  };

  const confirmPendingAction = () => {
    if (!confirmationModal?.order) return;

    const { order, nextStatus, note, type } = confirmationModal;

    if (type === "orderStatus") {
      updateOrderStatusMutation.mutate({
        orderId: order._id,
        payload: {
          orderStatus: nextStatus,
          note,
        },
      });
      setConfirmationModal(null);
      return;
    }

    if (type === "paymentStatus") {
      updatePaymentStatusMutation.mutate({
        orderId: order._id,
        paymentStatus: nextStatus,
      });
      setConfirmationModal(null);
      return;
    }

    if (type === "paymobRetry") {
      retryPaymobMutation.mutate(order._id);
      setConfirmationModal(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        label="Admin"
        title="Orders"
        description="Monitor orders, customer details, selected products, payment state, discounts, bundles, offers, Paymob details, and fulfillment progress."
        className="pt-0"
      />

      {feedback.message && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-300/25 bg-emerald-400/10 text-emerald-100"
              : "border-red-300/25 bg-red-400/10 text-red-100"
          }`}
        >
          {feedback.message}
        </div>
      )}

      {confirmationModal && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/72 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-[#c7a852]/30 bg-[#110f0e] p-6 shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-[#c7a852]">
              Confirm Change
            </p>
            <h2 className="mt-3 text-2xl font-black uppercase text-white">
              {confirmationModal.order.orderNumber}
            </h2>
            <p className="mt-3 text-sm leading-7 text-white/55">
              {confirmationModal.type === "paymobRetry"
                ? "Generate a new card payment link for this order."
                : `Change ${
                    confirmationModal.type === "paymentStatus"
                      ? "payment status"
                      : "order status"
                  } to "${confirmationModal.targetLabel}".`}
            </p>

            {confirmationModal.type !== "paymobRetry" && (
              <div className="mt-5">
                <Textarea
                  label="Optional Note"
                  value={confirmationModal.note}
                  onChange={updateModalNote}
                  placeholder="Add context for this change..."
                />
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={closeConfirmationModal}
              >
                Cancel
              </Button>
              <Button type="button" onClick={confirmPendingAction}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      <Card>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-white/35">
              Filters
            </p>

            <h2 className="mt-3 text-2xl font-black uppercase">
              Order Search
            </h2>
          </div>

          <Button variant="secondary" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr_1fr]">
          <Input
            label="Search"
            name="search"
            value={filters.search}
            onChange={updateFilter}
            placeholder="Order number, name, phone, email..."
          />

          <Select
            label="Order Status"
            name="orderStatus"
            value={filters.orderStatus}
            onChange={updateFilter}
          >
            <option value="">All order statuses</option>
            {orderStatusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>

          <Select
            label="Payment Status"
            name="paymentStatus"
            value={filters.paymentStatus}
            onChange={updateFilter}
          >
            <option value="">All payment statuses</option>
            {paymentStatusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </Select>

          <Select
            label="Payment Method"
            name="paymentMethod"
            value={filters.paymentMethod}
            onChange={updateFilter}
          >
            <option value="">All payment methods</option>
            {paymentMethodOptions.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.3em] text-white/35">
              Order List
            </p>

            <h2 className="mt-3 text-2xl font-black uppercase">
              {data?.total ?? orders.length} Orders
            </h2>
          </div>

          <p className="rounded-full border border-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/40">
            Page {data?.page || 1} / {data?.pages || 1}
          </p>
        </div>

        {isLoading && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 text-sm text-white/45">
            Loading orders...
          </div>
        )}

        {isError && (
          <div className="rounded-3xl border border-red-300/20 bg-red-400/10 p-6 text-sm text-red-100">
            {error?.friendlyMessage ||
              error?.message ||
              "Failed to load orders."}
          </div>
        )}

        {!isLoading && !isError && orders.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.025] p-6 text-sm leading-7 text-white/45">
            No orders found yet. Orders will appear here after customers place
            them through checkout.
          </div>
        )}

        {!isLoading && !isError && orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => {
              const isExpanded = expandedOrderId === order._id;
              const paymobLink = order.paymentGateway?.paymobIframeUrl || "";

              return (
                <div
                  key={order._id}
                  className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.025]"
                >
                  <div className="p-5">
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-2xl font-black uppercase text-white">
                            {order.orderNumber}
                          </h3>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold ${getOrderStatusStyle(
                              order.orderStatus
                            )}`}
                          >
                            {statusLabel(order.orderStatus, orderStatusOptions)}
                          </span>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-bold ${getPaymentStatusStyle(
                              order.paymentStatus
                            )}`}
                          >
                            {statusLabel(
                              order.paymentStatus,
                              paymentStatusOptions
                            )}
                          </span>

                          <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-white/50">
                            {order.checkoutMode === "customer"
                              ? "Customer Account"
                              : "Guest Checkout"}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-white/40">
                          {formatDate(order.createdAt)}
                        </p>

                        <div className="mt-4 grid gap-3 text-sm text-white/55 md:grid-cols-2 xl:grid-cols-4">
                          <p>
                            <span className="text-white/30">Customer:</span>{" "}
                            {order.customerInfo?.fullName}
                          </p>

                          <p>
                            <span className="text-white/30">Phone:</span>{" "}
                            {order.customerInfo?.phone}
                          </p>

                          <p>
                            <span className="text-white/30">Payment:</span>{" "}
                            {statusLabel(
                              order.paymentMethod,
                              paymentMethodOptions
                            )}
                          </p>

                          <p>
                            <span className="text-white/30">Total:</span>{" "}
                            <span className="font-black text-white">
                              {formatMoney(order.total)}
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row xl:w-[520px]">
                        <Select
                          label="Order Status"
                          value={order.orderStatus}
                          onChange={(event) =>
                            handleOrderStatusChange(order, event.target.value)
                          }
                          disabled={updateOrderStatusMutation.isPending}
                        >
                          {orderStatusOptions.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </Select>

                        <Select
                          label="Payment Status"
                          value={order.paymentStatus}
                          onChange={(event) =>
                            handlePaymentStatusChange(
                              order,
                              event.target.value
                            )
                          }
                          disabled={updatePaymentStatusMutation.isPending}
                        >
                          {paymentStatusOptions.map((status) => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          setExpandedOrderId(isExpanded ? null : order._id)
                        }
                      >
                        {isExpanded ? "Hide Details" : "View Details"}
                      </Button>

                      {order.paymentMethod === "paymobCard" && paymobLink && (
                        <Button
                          variant="secondary"
                          onClick={() =>
                            window.open(
                              paymobLink,
                              "_blank",
                              "noopener,noreferrer"
                            )
                          }
                        >
                          Open Paymob Link
                        </Button>
                      )}

                      {order.paymentMethod === "paymobCard" && paymobLink && (
                        <Button
                          variant="secondary"
                          onClick={() =>
                            copyText(
                              paymobLink,
                              "Paymob payment link copied."
                            )
                          }
                        >
                          Copy Paymob Link
                        </Button>
                      )}

                      {canRetryPaymob(order) && (
                        <Button
                          variant="secondary"
                          onClick={() => handleRetryPaymob(order)}
                          disabled={retryPaymobMutation.isPending}
                        >
                          {retryPaymobMutation.isPending
                            ? "Generating..."
                            : "Regenerate Paymob Link"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-white/10 bg-black/20 p-5">
                      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
                        <Card className="p-5">
                          <SectionLabel>Customer</SectionLabel>

                          <div className="space-y-3 text-sm text-white/60">
                            <p>
                              <span className="text-white/35">
                                Checkout:
                              </span>{" "}
                              {order.checkoutMode === "customer"
                                ? "Customer account"
                                : "Guest"}
                            </p>

                            <p>
                              <span className="text-white/35">Name:</span>{" "}
                              {order.customerInfo?.fullName}
                            </p>

                            <p>
                              <span className="text-white/35">Phone:</span>{" "}
                              {order.customerInfo?.phone}
                            </p>

                            {order.customerInfo?.secondPhone && (
                              <p>
                                <span className="text-white/35">
                                  Second Phone:
                                </span>{" "}
                                {order.customerInfo.secondPhone}
                              </p>
                            )}

                            {order.customerInfo?.email && (
                              <p>
                                <span className="text-white/35">Email:</span>{" "}
                                {order.customerInfo.email}
                              </p>
                            )}

                            <p>
                              <span className="text-white/35">City:</span>{" "}
                              {formatGovernorate(order.customerInfo?.city)}
                            </p>

                            <p className="leading-7">
                              <span className="text-white/35">Address:</span>{" "}
                              {order.customerInfo?.address}
                            </p>

                            {order.customerInfo?.notes && (
                              <p className="leading-7">
                                <span className="text-white/35">Notes:</span>{" "}
                                {order.customerInfo.notes}
                              </p>
                            )}
                          </div>
                        </Card>

                        <Card className="p-5">
                          <SectionLabel>Totals</SectionLabel>

                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-white/45">Subtotal</span>
                              <span>{formatMoney(order.subtotal)}</span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-white/45">
                                Product Savings
                              </span>
                              <span className="text-emerald-100">
                                {formatMoney(order.productSavings)}
                              </span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-white/45">
                                Bundle Discount
                              </span>
                              <span className="text-emerald-100">
                                -{formatMoney(order.bundleDiscountTotal)}
                              </span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-white/45">
                                Offer Discount
                              </span>
                              <span className="text-emerald-100">
                                -{formatMoney(order.offerDiscountTotal)}
                              </span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-white/45">
                                Discount Code
                              </span>
                              <span className="text-emerald-100">
                                -{formatMoney(order.discountTotal)}
                              </span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-white/45">
                                Total Discount
                              </span>
                              <span className="text-emerald-100">
                                -{formatMoney(order.totalDiscount)}
                              </span>
                            </div>

                            <div className="flex justify-between">
                              <span className="text-white/45">Delivery</span>
                              <span>
                                {formatMoney(order.deliveryFee)}
                                {order.deliverySnapshot
                                  ?.freeDeliveryApplied && (
                                  <span className="ml-2 text-emerald-100">
                                    Free
                                  </span>
                                )}
                              </span>
                            </div>

                            <div className="flex justify-between border-t border-white/10 pt-3 text-lg font-black">
                              <span>Total</span>
                              <span>{formatMoney(order.total)}</span>
                            </div>
                          </div>
                        </Card>
                      </div>

                      {order.paymentMethod === "paymobCard" && (
                        <Card className="mt-5 p-5">
                          <SectionLabel>Paymob</SectionLabel>

                          <div className="grid gap-4 lg:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/35">
                                Provider
                              </p>
                              <p className="mt-2 break-all text-sm font-bold text-white">
                                {order.paymentGateway?.provider || "paymob"}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/35">
                                Paymob Order ID
                              </p>
                              <p className="mt-2 break-all text-sm font-bold text-white">
                                {order.paymentGateway?.paymobOrderId || "—"}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/35">
                                Merchant Order ID
                              </p>
                              <p className="mt-2 break-all text-sm font-bold text-white">
                                {order.paymentGateway?.paymobMerchantOrderId ||
                                  order.orderNumber ||
                                  "—"}
                              </p>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/35">
                                Transaction ID
                              </p>
                              <p className="mt-2 break-all text-sm font-bold text-white">
                                {order.paymentGateway?.paymobTransactionId ||
                                  "—"}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/35">
                              Payment Link
                            </p>

                            {paymobLink ? (
                              <p className="mt-2 break-all text-xs leading-6 text-white/55">
                                {paymobLink}
                              </p>
                            ) : (
                              <p className="mt-2 text-sm text-white/40">
                                No Paymob iframe URL generated yet.
                              </p>
                            )}

                            <div className="mt-4 flex flex-wrap gap-3">
                              {paymobLink && (
                                <Button
                                  variant="secondary"
                                  onClick={() =>
                                    window.open(
                                      paymobLink,
                                      "_blank",
                                      "noopener,noreferrer"
                                    )
                                  }
                                >
                                  Open Link
                                </Button>
                              )}

                              {paymobLink && (
                                <Button
                                  variant="secondary"
                                  onClick={() =>
                                    copyText(
                                      paymobLink,
                                      "Paymob payment link copied."
                                    )
                                  }
                                >
                                  Copy Link
                                </Button>
                              )}

                              {canRetryPaymob(order) && (
                                <Button
                                  variant="secondary"
                                  onClick={() => handleRetryPaymob(order)}
                                  disabled={retryPaymobMutation.isPending}
                                >
                                  {retryPaymobMutation.isPending
                                    ? "Generating..."
                                    : "Regenerate Link"}
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card>
                      )}

                      {order.appliedBundles?.length > 0 && (
                        <Card className="mt-5 p-5">
                          <SectionLabel>Bundles Applied</SectionLabel>

                          <div className="space-y-3">
                            {order.appliedBundles.map((bundle, index) => (
                              <div
                                key={`${bundle.slug}-${index}`}
                                className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-4"
                              >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <p className="text-sm font-black uppercase text-white">
                                      {bundle.title}
                                    </p>

                                    <p className="mt-1 text-xs text-emerald-100/75">
                                      {bundle.applications} application
                                      {bundle.applications > 1 ? "s" : ""} ·{" "}
                                      {bundle.pricingType}
                                    </p>
                                  </div>

                                  <p className="text-sm font-black text-emerald-100">
                                    -{formatMoney(bundle.discountAmount)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}

                      {order.appliedOffers?.length > 0 && (
                        <Card className="mt-5 p-5">
                          <SectionLabel>Offers Applied</SectionLabel>

                          <div className="space-y-3">
                            {order.appliedOffers.map((offer, index) => (
                              <div
                                key={`${offer.slug}-${index}`}
                                className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-4"
                              >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <p className="text-sm font-black uppercase text-white">
                                      {offer.title}
                                    </p>

                                    <p className="mt-1 text-xs text-emerald-100/75">
                                      {offer.discountType}
                                      {offer.freeDeliveryApplied
                                        ? " · Free delivery"
                                        : ""}
                                    </p>
                                  </div>

                                  <p className="text-sm font-black text-emerald-100">
                                    {offer.discountAmount > 0
                                      ? `-${formatMoney(offer.discountAmount)}`
                                      : "Free delivery"}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}

                      <Card className="mt-5 p-5">
                        <SectionLabel>Items</SectionLabel>

                        <div className="space-y-4">
                          {order.items?.map((item) => (
                            <div
                              key={item._id}
                              className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.025] p-4 sm:flex-row"
                            >
                              <div className="h-32 w-full shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] sm:h-28 sm:w-24">
                                {item.image ? (
                                  <img
                                    src={item.image}
                                    alt={item.name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="h-full w-full bg-white/5" />
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                  <div>
                                    <p className="text-lg font-black uppercase text-white">
                                      {item.name}
                                    </p>

                                    <p className="mt-2 text-xs text-white/40">
                                      {item.category?.name || "No category"}
                                    </p>

                                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/45">
                                      <span className="rounded-full border border-white/10 px-3 py-1">
                                        Color: {item.color?.name}
                                      </span>

                                      <span className="rounded-full border border-white/10 px-3 py-1">
                                        Size: {item.size?.label}
                                      </span>

                                      {item.size?.sku && (
                                        <span className="rounded-full border border-white/10 px-3 py-1">
                                          SKU: {item.size.sku}
                                        </span>
                                      )}

                                      <span className="rounded-full border border-white/10 px-3 py-1">
                                        Qty: {item.quantity}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="text-left lg:text-right">
                                    <p className="text-sm text-white/45">
                                      Unit: {formatMoney(item.unitPrice)}
                                    </p>

                                    <p className="mt-1 text-lg font-black text-white">
                                      {formatMoney(item.lineSubtotal)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>

                      {order.statusHistory?.length > 0 && (
                        <Card className="mt-5 p-5">
                          <SectionLabel>Timeline</SectionLabel>

                          <div className="space-y-3">
                            {order.statusHistory.map((entry, index) => (
                              <div
                                key={`${entry.status}-${index}`}
                                className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
                              >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                  <div>
                                    <p className="text-sm font-black uppercase text-white">
                                      {entry.status?.replaceAll("_", " ")}
                                    </p>

                                    {entry.note && (
                                      <p className="mt-2 text-xs leading-6 text-white/45">
                                        {entry.note}
                                      </p>
                                    )}
                                  </div>

                                  <p className="text-xs text-white/30">
                                    {formatDate(entry.changedAt)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminOrders;
