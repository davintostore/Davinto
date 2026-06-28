import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, PackageOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Container from "../../components/ui/Container";
import PageHeader from "../../components/ui/PageHeader";
import SectionLabel from "../../components/ui/SectionLabel";
import Select from "../../components/ui/Select";
import useSeo from "../../hooks/useSeo";
import {
  getMyOrderByIdRequest,
  getMyOrdersRequest,
} from "../../services/orderService";
import { useCustomerAuth } from "../../context/customerAuthContext";
import {
  formatCurrency,
  formatCustomerDate,
  getOrderStatusLabel,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
} from "../../utils/translatedLabels";
import { getGovernorateLabel } from "../../utils/governorates";
import {
  getLocalizedAppliedBundle,
  getLocalizedAppliedOffer,
  getLocalizedDeliverySnapshot,
  getLocalizedOrderItem,
  getLocalizedPaymentSnapshot,
} from "../../utils/localizedContent";
import { hideBrokenImage } from "../../utils/imageFallback";
import { getOrderItemImage } from "../../utils/resolveLocalImages";

const orderStatusOptions = [
  "",
  "pending_confirmation",
  "pending_payment",
  "pending_payment_verification",
  "confirmed",
  "processing",
  "ready_to_ship",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

const paymentStatusOptions = [
  "",
  "unpaid",
  "pending",
  "pending_verification",
  "paid",
  "failed",
  "expired",
  "refunded",
];

const getOrderStatusStyle = (status) => {
  if (status === "delivered") {
    return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100";
  }

  if (status === "cancelled") {
    return "border-[#b8585d]/45 bg-[#882c30]/18 text-[#f5d7d8]";
  }

  return "border-[#c7a852]/30 bg-[#c7a852]/9 text-[#f5f0e8]";
};

const getPaymentStatusStyle = (status) => {
  if (status === "paid") {
    return "border-emerald-300/30 bg-emerald-400/10 text-emerald-100";
  }

  if (["failed", "expired"].includes(status)) {
    return "border-[#b8585d]/45 bg-[#882c30]/18 text-[#f5d7d8]";
  }

  return "border-[#f5f0e8]/14 bg-[#f5f0e8]/4 text-[#f5f0e8]/68";
};

const requestWithCustomerRefresh = async (request, refreshSession) => {
  try {
    return await request();
  } catch (error) {
    if (error?.response?.status !== 401) {
      throw error;
    }

    await refreshSession();
    return request();
  }
};

const OrderDetail = ({ orderId }) => {
  const { t, i18n } = useTranslation(["orders", "common", "checkout"]);
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const formatMoney = (value) => formatCurrency(value, language);
  const formatDate = (value, withTime = false) =>
    value
      ? formatCustomerDate(value, language, withTime)
      : t("common:unavailable");
  const { refreshSession } = useCustomerAuth();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["customer-order-detail", orderId],
    queryFn: () =>
      requestWithCustomerRefresh(
        () => getMyOrderByIdRequest(orderId),
        refreshSession
      ),
    enabled: Boolean(orderId),
  });

  if (isLoading) {
    return (
      <div className="border-t border-[#f5f0e8]/10 px-5 py-8 text-sm text-[#f5f0e8]/48 sm:px-7">
        {t("orders:my.loadingDetail")}
      </div>
    );
  }

  if (isError || !data?.order) {
    return (
      <div className="border-t border-[#b8585d]/30 bg-[#882c30]/12 px-5 py-5 text-sm text-[#f5d7d8] sm:px-7">
        {error?.friendlyMessage ||
          error?.message ||
          t("orders:my.detailError")}
      </div>
    );
  }

  const order = data.order;
  const localizedPaymentSnapshot = getLocalizedPaymentSnapshot(
    order.paymentSnapshot,
    language
  );
  const localizedDeliverySnapshot = getLocalizedDeliverySnapshot(
    order.deliverySnapshot,
    language
  );

  return (
    <div className="border-t border-[#c7a852]/22 bg-[#110f0e] px-5 py-7 sm:px-7">
      <div className="grid gap-7 xl:grid-cols-[1fr_340px]">
        <div className="space-y-7">
          <div>
            <SectionLabel>{t("orders:my.pieces")}</SectionLabel>

            <div className="divide-y divide-[#f5f0e8]/10 border-y border-[#f5f0e8]/10">
              {order.items?.map((rawItem) => {
                const item = getLocalizedOrderItem(rawItem, language);
                const displayImage = getOrderItemImage(rawItem);

                return (
                  <div
                    key={
                      item.id ||
                      `${item.product}-${item.color?.name}-${item.size?.label}`
                    }
                    className="flex gap-4 py-5"
                  >
                    <div className="h-28 w-20 shrink-0 overflow-hidden border border-[#f5f0e8]/12 bg-[#28231f]">
                      {displayImage ? (
                        <img
                          src={displayImage}
                          alt={item.imageAlt || item.name}
                          onError={hideBrokenImage}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[0.52rem] font-black uppercase tracking-[0.18em] text-[#8b8075]">
                          {t("common:noImage")}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-serif text-xl font-semibold">
                        {item.name}
                      </p>
                      <p className="mt-2 text-xs text-[#f5f0e8]/45">
                        {item.color?.name || t("common:color")} /{" "}
                        {item.size?.label || t("common:size")} /{" "}
                        {t("common:qty", { count: item.quantity })}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs text-[#8b8075]">
                          {t("common:each", {
                            price: formatMoney(item.unitPrice),
                          })}
                        </span>
                        <span className="font-bold text-[#c7a852]">
                          {formatMoney(item.lineSubtotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="fashion-panel p-5">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.24em] text-[#c7a852]">
                {t("orders:my.deliverySnapshot")}
              </p>
              <div className="mt-4 space-y-2 text-sm leading-7 text-[#f5f0e8]/60">
                <p>{order.customerInfo?.fullName}</p>
                <p>{order.customerInfo?.phone}</p>
                {order.customerInfo?.secondPhone && (
                  <p>{order.customerInfo.secondPhone}</p>
                )}
                {order.customerInfo?.email && (
                  <p>{order.customerInfo.email}</p>
                )}
                <p>{getGovernorateLabel(t, order.customerInfo?.city)}</p>
                <p>{order.customerInfo?.address}</p>
                {order.customerInfo?.notes && (
                  <p className="text-[#8b8075]">{order.customerInfo.notes}</p>
                )}
              </div>
            </div>

            <div className="fashion-panel p-5">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.24em] text-[#c7a852]">
                {t("orders:my.payment")}
              </p>
              <p className="mt-4 font-serif text-2xl font-semibold">
                {localizedPaymentSnapshot?.label ||
                  getPaymentMethodLabel(t, order.paymentMethod)}
              </p>
              {localizedPaymentSnapshot?.instructions && (
                <p className="mt-3 text-sm leading-7 text-[#f5f0e8]/55">
                  {localizedPaymentSnapshot.instructions}
                </p>
              )}
            </div>
          </div>

          {(order.appliedBundles?.length > 0 ||
            order.appliedOffers?.length > 0 ||
            order.discountCode?.code) && (
            <div>
              <SectionLabel>{t("orders:my.appliedSavings")}</SectionLabel>
              <div className="grid gap-3">
                {order.appliedBundles?.map((bundle, index) => {
                  const localizedBundle = getLocalizedAppliedBundle(
                    bundle,
                    language
                  );

                  return (
                    <div
                      key={`${bundle.slug}-${index}`}
                      className="flex justify-between gap-4 border-l-2 border-[#c7a852] bg-[#c7a852]/7 p-4 text-sm"
                    >
                      <span>
                        {localizedBundle.title}
                        {localizedBundle.description && (
                          <span className="mt-1 block text-xs leading-6 text-[#f5f0e8]/52">
                            {localizedBundle.description}
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-[#c7a852]">
                        -{formatMoney(bundle.discountAmount)}
                      </span>
                    </div>
                  );
                })}

                {order.appliedOffers?.map((offer, index) => {
                  const localizedOffer = getLocalizedAppliedOffer(
                    offer,
                    language
                  );

                  return (
                    <div
                      key={`${offer.slug}-${index}`}
                      className="flex justify-between gap-4 border-l-2 border-[#c7a852] bg-[#c7a852]/7 p-4 text-sm"
                    >
                      <span>
                        {localizedOffer.title}
                        {localizedOffer.description && (
                          <span className="mt-1 block text-xs leading-6 text-[#f5f0e8]/52">
                            {localizedOffer.description}
                          </span>
                        )}
                      </span>
                      <span className="font-bold text-[#c7a852]">
                        {offer.discountAmount > 0
                          ? `-${formatMoney(offer.discountAmount)}`
                          : t("checkout:freeDelivery")}
                      </span>
                    </div>
                  );
                })}

                {order.discountCode?.code && (
                  <div className="flex justify-between gap-4 border-l-2 border-[#c7a852] bg-[#c7a852]/7 p-4 text-sm">
                    <span>
                      {t("orders:my.code", {
                        code: order.discountCode.code,
                      })}
                    </span>
                    <span className="font-bold text-[#c7a852]">
                      -{formatMoney(order.discountCode.discountAmount)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {order.statusHistory?.length > 0 && (
            <div>
              <SectionLabel>{t("orders:my.timeline")}</SectionLabel>
              <div className="space-y-3">
                {order.statusHistory.map((entry, index) => (
                  <div
                    key={`${entry.status}-${entry.changedAt}-${index}`}
                    className="border-l-2 border-[#882c30] bg-[#f5f0e8]/3 p-4"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm font-black uppercase tracking-[0.12em]">
                        {getOrderStatusLabel(t, entry.status)}
                      </p>
                      <p className="text-xs text-[#8b8075]">
                        {formatDate(entry.changedAt, true)}
                      </p>
                    </div>
                    {entry.note && (
                      <p className="mt-2 text-xs leading-6 text-[#f5f0e8]/48">
                        {entry.note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="xl:sticky xl:top-32">
          <Card className="border-[#c7a852]/30 bg-[#1c1917] p-6">
            <SectionLabel>{t("orders:my.orderTotal")}</SectionLabel>

            <div className="divide-y divide-[#f5f0e8]/10 border-y border-[#f5f0e8]/10 text-sm">
              {[
                [t("common:subtotal"), order.subtotal],
                [
                  t("common:productSavings"),
                  -Number(order.productSavings || 0),
                ],
                [
                  t("common:bundleDiscount"),
                  -Number(order.bundleDiscountTotal || 0),
                ],
                [
                  t("common:offerDiscount"),
                  -Number(order.offerDiscountTotal || 0),
                ],
                [
                  t("common:discountCode"),
                  -Number(order.discountTotal || 0),
                ],
                [t("common:delivery"), order.deliveryFee],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 py-3.5"
                >
                  <span className="text-[#f5f0e8]/45">{label}</span>
                  <span
                    className={
                      Number(value) < 0 ? "text-[#c7a852]" : "font-bold"
                    }
                  >
                    {Number(value) < 0
                      ? `-${formatMoney(Math.abs(value))}`
                      : formatMoney(value)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-end justify-between gap-4 pt-6">
              <span className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-[#8b8075]">
                {t("common:total")}
              </span>
              <span className="font-serif text-3xl font-semibold">
                {formatMoney(order.total)}
              </span>
            </div>

            {localizedDeliverySnapshot?.notes && (
              <p className="mt-5 border-t border-[#f5f0e8]/10 pt-5 text-xs leading-6 text-[#f5f0e8]/45">
                {localizedDeliverySnapshot.notes}
              </p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
};

const MyOrders = () => {
  const { t, i18n } = useTranslation(["orders", "common", "checkout"]);
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const formatMoney = (value) => formatCurrency(value, language);
  const formatDate = (value, withTime = false) =>
    value
      ? formatCustomerDate(value, language, withTime)
      : t("common:unavailable");
  const { refreshSession } = useCustomerAuth();

  // SEO
  useSeo({
    title: t("orders:my.seoTitle"),
    description: t("orders:my.seoDescription"),
    robots: "noindex,nofollow",
  });

  const [page, setPage] = useState(1);
  const [orderStatus, setOrderStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState("");

  const params = {
    page,
    limit: 10,
    orderStatus: orderStatus || undefined,
    paymentStatus: paymentStatus || undefined,
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["customer-orders", params],
    queryFn: () =>
      requestWithCustomerRefresh(
        () => getMyOrdersRequest(params),
        refreshSession
      ),
  });

  const orders = data?.orders || [];
  const pages = Number(data?.pages || 0);

  const updateOrderStatus = (event) => {
    setOrderStatus(event.target.value);
    setPage(1);
    setExpandedOrderId("");
  };

  const updatePaymentStatus = (event) => {
    setPaymentStatus(event.target.value);
    setPage(1);
    setExpandedOrderId("");
  };

  return (
    <>
      <PageHeader
        label={t("orders:my.headerLabel")}
        title={t("orders:my.headerTitle")}
        description={t("orders:my.headerDescription")}
      />

      <section className="fashion-section">
        <Container>
          <div className="mb-8 grid gap-4 border-y border-[#f5f0e8]/12 py-6 md:grid-cols-[1fr_220px_220px] md:items-end">
            <div>
              <p className="text-[0.62rem] font-black uppercase tracking-[0.25em] text-[#c7a852]">
                {t("orders:my.linkedOrders", { count: data?.total || 0 })}
              </p>
              <p className="mt-2 text-sm leading-7 text-[#f5f0e8]/48">
                {t("orders:my.guestNote")}
              </p>
            </div>

            <Select
              label={t("orders:my.orderStatus")}
              value={orderStatus}
              onChange={updateOrderStatus}
            >
              {orderStatusOptions.map((option) => (
                <option key={option || "all"} value={option}>
                  {option
                    ? getOrderStatusLabel(t, option)
                    : t("orders:my.allOrderStatuses")}
                </option>
              ))}
            </Select>

            <Select
              label={t("orders:my.paymentStatus")}
              value={paymentStatus}
              onChange={updatePaymentStatus}
            >
              {paymentStatusOptions.map((option) => (
                <option key={option || "all"} value={option}>
                  {option
                    ? getPaymentStatusLabel(t, option)
                    : t("orders:my.allPaymentStatuses")}
                </option>
              ))}
            </Select>
          </div>

          {isLoading && (
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="catalog-skeleton h-52" />
              ))}
            </div>
          )}

          {isError && (
            <Card className="border-[#b8585d]/40 bg-[#882c30]/14">
              <SectionLabel>{t("orders:my.unable")}</SectionLabel>
              <p className="text-sm text-[#f5d7d8]">
                {error?.friendlyMessage ||
                  error?.message ||
                  t("orders:my.loadError")}
              </p>
            </Card>
          )}

          {!isLoading && !isError && orders.length === 0 && (
            <Card className="py-14 text-center sm:py-20">
              <PackageOpen
                className="mx-auto text-[#c7a852]"
                size={38}
                strokeWidth={1.4}
              />
              <SectionLabel className="mt-6 justify-center">
                {t("orders:my.emptyLabel")}
              </SectionLabel>
              <h2 className="editorial-heading text-6xl sm:text-8xl">
                {t("orders:my.emptyTitle")}
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-sm leading-8 text-[#f5f0e8]/50">
                {t("orders:my.emptyDescription")}
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to="/shop">
                  <Button>{t("orders:my.shop")}</Button>
                </Link>
              </div>
            </Card>
          )}

          {!isLoading && !isError && orders.length > 0 && (
            <div className="space-y-5">
              {orders.map((order) => {
                const isExpanded = expandedOrderId === order.id;

                return (
                  <article
                    key={order.id}
                    className="overflow-hidden border border-[#f5f0e8]/12 bg-[#28231f]"
                  >
                    <div className="p-5 sm:p-7">
                      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <h2 className="font-serif text-3xl font-semibold">
                              {order.orderNumber}
                            </h2>
                            <span
                              className={`border px-3 py-1 text-[0.58rem] font-black uppercase tracking-[0.16em] ${getOrderStatusStyle(
                                order.orderStatus
                              )}`}
                            >
                              {getOrderStatusLabel(t, order.orderStatus)}
                            </span>
                            <span
                              className={`border px-3 py-1 text-[0.58rem] font-black uppercase tracking-[0.16em] ${getPaymentStatusStyle(
                                order.paymentStatus
                              )}`}
                            >
                              {getPaymentStatusLabel(t, order.paymentStatus)}
                            </span>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-x-7 gap-y-2 text-xs text-[#f5f0e8]/45">
                            <span>{formatDate(order.createdAt, true)}</span>
                            <span>
                              {getPaymentMethodLabel(t, order.paymentMethod)}
                            </span>
                            <span>
                              {t("common:itemCount", {
                                count: order.itemCount,
                              })}
                            </span>
                          </div>

                          <div className="mt-6 flex flex-wrap gap-3">
                            {order.previewItems?.map((rawItem, index) => {
                              const item = getLocalizedOrderItem(
                                rawItem,
                                language
                              );
                              const displayImage = getOrderItemImage(rawItem);

                              return (
                                <div
                                  key={`${item.name}-${item.color?.name}-${item.size?.label}-${index}`}
                                  className="flex w-full gap-3 border border-[#f5f0e8]/10 bg-[#1c1917]/45 p-3 sm:w-auto sm:min-w-64"
                                >
                                  <div className="h-16 w-12 shrink-0 overflow-hidden bg-[#1c1917]">
                                    {displayImage ? (
                                      <img
                                        src={displayImage}
                                        alt={item.imageAlt || item.name}
                                        onError={hideBrokenImage}
                                        className="h-full w-full object-cover"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <div className="h-full w-full bg-[#f5f0e8]/5" />
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-bold">
                                      {item.name}
                                    </p>
                                    <p className="mt-1 text-xs text-[#8b8075]">
                                      {item.color?.name} / {item.size?.label} /{" "}
                                      {t("common:qty", {
                                        count: item.quantity,
                                      })}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-col gap-4 xl:items-end">
                          <p className="font-serif text-3xl font-semibold">
                            {formatMoney(order.total)}
                          </p>
                          {Number(order.totalDiscount || 0) > 0 && (
                            <p className="text-xs text-[#c7a852]">
                              {t("common:saved", {
                                amount: formatMoney(order.totalDiscount),
                              })}
                            </p>
                          )}
                          <Button
                            type="button"
                            variant="secondary"
                            className="gap-2"
                            onClick={() =>
                              setExpandedOrderId(isExpanded ? "" : order.id)
                            }
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? (
                              <>
                                {t("orders:my.hideDetails")}{" "}
                                <ChevronUp size={15} />
                              </>
                            ) : (
                              <>
                                {t("orders:my.viewDetails")}{" "}
                                <ChevronDown size={15} />
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {isExpanded && <OrderDetail orderId={order.id} />}
                  </article>
                );
              })}
            </div>
          )}

          {!isLoading && !isError && pages > 1 && (
            <div className="mt-8 flex items-center justify-between border-t border-[#f5f0e8]/12 pt-6">
              <Button
                variant="secondary"
                disabled={page <= 1}
                onClick={() => {
                  setPage((current) => Math.max(1, current - 1));
                  setExpandedOrderId("");
                }}
              >
                {t("common:previous")}
              </Button>

              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#8b8075]">
                {t("common:page", { page, pages })}
              </p>

              <Button
                variant="secondary"
                disabled={page >= pages}
                onClick={() => {
                  setPage((current) => Math.min(pages, current + 1));
                  setExpandedOrderId("");
                }}
              >
                {t("common:next")}
              </Button>
            </div>
          )}

          <div className="mt-10 flex flex-col items-start justify-between gap-5 border-t border-[#f5f0e8]/12 pt-7 sm:flex-row sm:items-center">
            <p className="max-w-2xl text-sm leading-7 text-[#f5f0e8]/48">
              {t("orders:my.lookingForGuest")}
            </p>
            <Link to="/track-order">
              <Button variant="secondary">{t("orders:my.trackGuest")}</Button>
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
};

export default MyOrders;
