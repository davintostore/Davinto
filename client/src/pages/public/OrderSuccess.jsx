import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Container from "../../components/ui/Container";
import PageHeader from "../../components/ui/PageHeader";
import SectionLabel from "../../components/ui/SectionLabel";

import { trackOrderRequest } from "../../services/orderService";
import { trackPurchase } from "../../utils/metaPixel";
import { useCustomerAuth } from "../../context/customerAuthContext";
import {
  formatCurrency,
  getOrderStatusLabel,
  getPaymentStatusLabel,
} from "../../utils/translatedLabels";
import {
  getLocalizedBundle,
  getLocalizedOffer,
} from "../../utils/localizedContent";

const ORDER_HANDOFF_KEY = "davinto_order_handoff";
const LEGACY_LAST_ORDER_KEY = "davinto_last_order";

const shouldFirePurchaseForOrder = (order) => {
  if (!order?.orderNumber) return false;

  if (order.paymentMethod === "paymobCard") {
    return order.paymentStatus === "paid";
  }

  return true;
};

const OrderSuccess = () => {
  const { t, i18n } = useTranslation([
    "orders",
    "common",
    "navigation",
    "checkout",
  ]);
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const formatMoney = (value) => formatCurrency(value, language);
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isCustomerAuthenticated } = useCustomerAuth();
  const [isTokenVisible, setIsTokenVisible] = useState(false);

  const storedOrder = useMemo(() => {
    if (location.state?.order) {
      return location.state.order;
    }

    try {
      const rawStoredOrder =
        sessionStorage.getItem(ORDER_HANDOFF_KEY) ||
        localStorage.getItem(LEGACY_LAST_ORDER_KEY);
      return rawStoredOrder ? JSON.parse(rawStoredOrder) : null;
    } catch {
      return null;
    }
  }, [location.state]);

  const [trackingCredentials] = useState(() => ({
    orderNumber:
      searchParams.get("orderNumber") || storedOrder?.orderNumber || "",
    lookupToken:
      searchParams.get("lookupToken") || storedOrder?.lookupToken || "",
  }));

  const { orderNumber, lookupToken } = trackingCredentials;
  const paymentResult = searchParams.get("payment") || "";

  const {
    data: trackedOrderData,
    isLoading: isTrackingLatestOrder,
  } = useQuery({
    queryKey: ["order-success-track", orderNumber, lookupToken],
    queryFn: () =>
      trackOrderRequest({
        orderNumber,
        lookupToken,
      }),
    enabled: Boolean(orderNumber && lookupToken),
    retry: 2,
  });

  const order = trackedOrderData?.order || storedOrder;

  useEffect(() => {
    document.title = orderNumber
      ? t("orders:success.titleWithNumber", { number: orderNumber })
      : t("orders:success.title");
  }, [orderNumber, t]);

  useEffect(() => {
    localStorage.removeItem(LEGACY_LAST_ORDER_KEY);

    if (!searchParams.has("lookupToken")) return;

    // TODO(Paymob v2): Remove the legacy query-token fallback after Paymob
    // returns can use a server-side payment/session handoff.
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete("lookupToken");
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!trackedOrderData?.order?.orderNumber || !lookupToken) return;

    sessionStorage.setItem(
      ORDER_HANDOFF_KEY,
      JSON.stringify({
        ...trackedOrderData.order,
        lookupToken,
      })
    );
  }, [trackedOrderData, lookupToken]);

  useEffect(() => {
    if (!shouldFirePurchaseForOrder(order)) return;

    const purchaseStorageKey = `davinto_purchase_tracked_${order.orderNumber}`;

    if (localStorage.getItem(purchaseStorageKey)) return;

    trackPurchase({
      orderId: order.id,
      orderNumber: order.orderNumber,
      items: order.items || [],
      value: order.total,
    });

    localStorage.setItem(purchaseStorageKey, "true");
  }, [order]);

  const showPaymentSuccess =
    paymentResult === "success" && order?.paymentMethod === "paymobCard";

  const showPaymentFailed =
    ["failed", "invalid", "missing"].includes(paymentResult) ||
    (paymentResult && paymentResult !== "success");

  return (
    <>
      <PageHeader
        label={t("orders:success.headerLabel")}
        title={t("orders:success.headerTitle")}
        description={t("orders:success.headerDescription")}
      />

      <section className="fashion-section">
        <Container>
          {!orderNumber || !lookupToken ? (
            <Card className="py-14 text-center">
              <SectionLabel className="justify-center">
                {t("orders:success.missingLabel")}
              </SectionLabel>

              <h2 className="editorial-heading text-6xl sm:text-8xl">
                {t("orders:success.missingTitle")}
              </h2>

              <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-[#f5f0e8]/52">
                {t("orders:success.missingDescription")}
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link to="/shop">
                  <Button>{t("checkout:shopNow")}</Button>
                </Link>

                <Link to="/track-order">
                  <Button variant="secondary">
                    {t("navigation:trackOrder")}
                  </Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_420px] lg:items-start">
              <Card className="p-6 sm:p-9">
                <SectionLabel>{t("orders:success.confirmedLabel")}</SectionLabel>

                <h2 className="editorial-heading text-6xl sm:text-8xl">
                  {t("orders:success.thankYou")}
                </h2>

                <p className="mt-6 max-w-2xl text-sm leading-8 text-[#f5f0e8]/58">
                  {t("orders:success.description")}
                </p>

                {isTrackingLatestOrder && (
                  <div className="mt-6 border border-[#f5f0e8]/12 bg-[#f5f0e8]/4 px-4 py-3 text-sm text-[#f5f0e8]/45">
                    {t("orders:success.updating")}
                  </div>
                )}

                {showPaymentSuccess && (
                  <div className="mt-6 border border-[#c7a852]/35 bg-[#c7a852]/10 px-4 py-3 text-sm text-[#f5f0e8]">
                    {t("orders:success.paymentSuccess")}
                  </div>
                )}

                {showPaymentFailed && (
                  <div className="mt-6 border border-[#b8585d]/45 bg-[#882c30]/18 px-4 py-3 text-sm text-[#f5d7d8]">
                    {t("orders:success.paymentFailed")}
                  </div>
                )}

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <div className="status-panel">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                      {t("orders:success.orderNumber")}
                    </p>

                    <p className="mt-3 font-serif text-2xl font-semibold text-[#f5f0e8]">
                      {orderNumber}
                    </p>
                  </div>

                  <div className="status-panel">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                      {t("orders:success.trackingToken")}
                    </p>

                    {isTokenVisible ? (
                      <p className="mt-3 break-all text-sm font-bold text-[#f5f0e8]">
                        {lookupToken}
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-[#f5f0e8]/55">
                        {t("orders:success.tokenHidden")}
                      </p>
                    )}

                    <button
                      type="button"
                      className="mt-3 text-xs font-black uppercase tracking-[0.2em] text-[#c7a852] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c7a852]"
                      onClick={() => setIsTokenVisible((current) => !current)}
                    >
                      {isTokenVisible
                        ? t("orders:success.hideToken")
                        : t("orders:success.showToken")}
                    </button>
                  </div>
                </div>

                {order && (
                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="status-panel">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                        {t("orders:success.orderStatus")}
                      </p>
                      <p className="mt-3 text-sm font-bold uppercase text-white">
                        {getOrderStatusLabel(t, order.orderStatus)}
                      </p>
                    </div>

                    <div className="status-panel">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                        {t("orders:success.payment")}
                      </p>
                      <p className="mt-3 text-sm font-bold uppercase text-white">
                        {getPaymentStatusLabel(t, order.paymentStatus)}
                      </p>
                    </div>

                    <div className="status-panel">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                        {t("common:total")}
                      </p>
                      <p className="mt-3 text-lg font-black text-white">
                        {formatMoney(order.total)}
                      </p>
                    </div>
                  </div>
                )}

                {order?.paymentMethod === "paymobCard" &&
                  order?.paymentStatus !== "paid" && (
                    <div className="mt-6 border border-[#c7a852]/30 bg-[#c7a852]/9 p-5">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                        {t("orders:success.cardPending")}
                      </p>

                      <p className="mt-3 text-sm leading-7 text-[#f5f0e8]/65">
                        {t("orders:success.cardPendingDescription")}
                      </p>
                    </div>
                  )}

                {order?.appliedBundles?.length > 0 && (
                  <div className="mt-6 border-l-2 border-[#c7a852] bg-[#c7a852]/7 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                      {t("checkout:bundlesApplied")}
                    </p>

                    <div className="mt-3 space-y-2">
                      {order.appliedBundles.map((bundle, index) => (
                        <p
                          key={`${bundle.slug}-${index}`}
                          className="text-sm text-[#f5f0e8]/72"
                        >
                          {getLocalizedBundle(bundle, language).title}: -
                          {formatMoney(bundle.discountAmount)}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {order?.appliedOffers?.length > 0 && (
                  <div className="mt-6 border-l-2 border-[#c7a852] bg-[#c7a852]/7 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                      {t("checkout:offersApplied")}
                    </p>

                    <div className="mt-3 space-y-2">
                      {order.appliedOffers.map((offer, index) => (
                        <p
                          key={`${offer.slug}-${index}`}
                          className="text-sm text-[#f5f0e8]/72"
                        >
                          {getLocalizedOffer(offer, language).title}
                          {offer.discountAmount > 0
                            ? `: -${formatMoney(offer.discountAmount)}`
                            : offer.freeDeliveryApplied
                              ? `: ${t("checkout:freeDelivery")}`
                              : ""}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {order?.discountCode?.code && (
                  <div className="mt-6 border-l-2 border-[#c7a852] bg-[#c7a852]/7 p-5">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                      {t("common:discountCode")}
                    </p>

                    <p className="mt-3 text-sm font-bold text-[#f5f0e8]/72">
                      {order.discountCode.code}: -
                      {formatMoney(order.discountCode.discountAmount)}
                    </p>
                  </div>
                )}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    to="/track-order"
                    state={{ orderNumber, lookupToken }}
                  >
                    <Button>{t("navigation:trackOrder")}</Button>
                  </Link>

                  <Link to="/shop">
                    <Button variant="secondary">
                      {t("orders:success.continueShopping")}
                    </Button>
                  </Link>

                  {(order?.checkoutMode === "customer" ||
                    isCustomerAuthenticated) && (
                    <Link to="/my-orders">
                      <Button variant="secondary">
                        {t("navigation:myOrders")}
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>

              {order && (
                <Card className="border-[#c7a852]/30 bg-[#110f0e] p-6">
                  <SectionLabel>{t("orders:success.summary")}</SectionLabel>

                  <div className="space-y-4">
                    {order.items?.map((item) => (
                      <div
                        key={
                          item._id ||
                          `${item.product}-${item.color?.name}-${item.size?.label}`
                        }
                        className="flex gap-3 border-b border-[#f5f0e8]/10 pb-4"
                      >
                        <div className="h-20 w-16 shrink-0 overflow-hidden border border-[#f5f0e8]/12 bg-[#28231f]">
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
                          <p className="truncate font-serif text-base font-semibold text-[#f5f0e8]">
                            {item.name}
                          </p>

                          <p className="mt-1 text-xs text-white/40">
                            {item.color?.name} / {item.size?.label} ×{" "}
                            {item.quantity}
                          </p>

                          <p className="mt-2 text-sm font-bold text-[#c7a852]">
                            {formatMoney(item.lineSubtotal)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/45">
                        {t("common:subtotal")}
                      </span>
                      <span>{formatMoney(order.subtotal)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-white/45">
                        {t("common:productSavings")}
                      </span>
                      <span className="text-emerald-100">
                        {formatMoney(order.productSavings)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-white/45">
                        {t("common:bundleDiscount")}
                      </span>
                      <span className="text-emerald-100">
                        -{formatMoney(order.bundleDiscountTotal)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-white/45">
                        {t("common:offerDiscount")}
                      </span>
                      <span className="text-emerald-100">
                        -{formatMoney(order.offerDiscountTotal)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-white/45">
                        {t("common:discountCode")}
                      </span>
                      <span className="text-emerald-100">
                        -{formatMoney(order.discountTotal)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-white/45">
                        {t("common:delivery")}
                      </span>
                      <span>
                        {formatMoney(order.deliveryFee)}
                        {order.deliverySnapshot?.freeDeliveryApplied && (
                          <span className="ml-2 text-emerald-100">
                            {t("common:free")}
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between border-t border-[#c7a852]/25 pt-4 font-serif text-xl font-semibold">
                      <span>{t("common:total")}</span>
                      <span>{formatMoney(order.total)}</span>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}
        </Container>
      </section>
    </>
  );
};

export default OrderSuccess;
