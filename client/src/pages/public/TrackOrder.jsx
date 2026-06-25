import { useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Container from "../../components/ui/Container";
import Input from "../../components/ui/Input";
import PageHeader from "../../components/ui/PageHeader";
import SectionLabel from "../../components/ui/SectionLabel";

import {
  retryCustomerPaymobPaymentRequest,
  trackOrderRequest,
} from "../../services/orderService";
import {
  formatCurrency,
  formatCustomerDate,
  getOrderStatusLabel,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
} from "../../utils/translatedLabels";
import {
  getLocalizedBundle,
  getLocalizedOffer,
} from "../../utils/localizedContent";

const canRetryCardPayment = (order) => {
  return (
    order?.paymentMethod === "paymobCard" &&
    order.paymentStatus !== "paid" &&
    order.orderStatus !== "cancelled"
  );
};

const TrackOrder = () => {
  const { t, i18n } = useTranslation(["orders", "common", "checkout"]);
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const formatMoney = (value) => formatCurrency(value, language);
  const formatDate = (value) =>
    value ? formatCustomerDate(value, language, true) : "";
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialTrackingCredentials] = useState(() => ({
    orderNumber:
      location.state?.orderNumber || searchParams.get("orderNumber") || "",
    lookupToken:
      location.state?.lookupToken || searchParams.get("lookupToken") || "",
  }));
  const lookupTokenRef = useRef(initialTrackingCredentials.lookupToken);

  const [formData, setFormData] = useState({
    orderNumber: initialTrackingCredentials.orderNumber,
    lookupToken: initialTrackingCredentials.lookupToken,
  });

  const [error, setError] = useState("");
  const [trackedOrder, setTrackedOrder] = useState(null);

  const paymentResult = searchParams.get("payment") || "";

  const trackMutation = useMutation({
    mutationFn: trackOrderRequest,
    onSuccess: (response, variables) => {
      setTrackedOrder(response.order);
      lookupTokenRef.current = variables.lookupToken;
      setFormData((current) => ({
        ...current,
        orderNumber: response.order?.orderNumber || current.orderNumber,
        lookupToken: "",
      }));
      setError("");
    },
    onError: (err) => {
      setTrackedOrder(null);
      setError(
        err?.friendlyMessage || err?.message || t("orders:track.notFound")
      );
    },
  });

  const retryPaymentMutation = useMutation({
    mutationFn: retryCustomerPaymobPaymentRequest,
    onSuccess: (response) => {
      const nextOrder = response?.order;
      const paymentLink = response?.payment?.redirectUrl || "";

      if (nextOrder) {
        setTrackedOrder(nextOrder);
      }

      if (paymentLink) {
        window.location.href = paymentLink;
        return;
      }

      setError(
        response?.payment?.error ||
          t("orders:track.paymentLinkError")
      );
    },
    onError: (err) => {
      setError(
        err?.friendlyMessage ||
          err?.message ||
          t("orders:track.paymentRetryError")
      );
    },
  });

  useEffect(() => {
    const { orderNumber, lookupToken } = initialTrackingCredentials;

    if (orderNumber && lookupToken) {
      trackMutation.mutate({ orderNumber, lookupToken });
    }

    if (searchParams.has("lookupToken")) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete("lookupToken");
      setSearchParams(nextSearchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (event) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));

    if (error) setError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formData.orderNumber.trim() || !formData.lookupToken.trim()) {
      setError(t("orders:track.required"));
      return;
    }

    trackMutation.mutate({
      orderNumber: formData.orderNumber.trim(),
      lookupToken: formData.lookupToken.trim(),
    });
  };

  const handleRetryCardPayment = () => {
    const lookupToken =
      formData.lookupToken.trim() || lookupTokenRef.current.trim();

    if (!trackedOrder?.orderNumber || !lookupToken) {
      setError(t("orders:track.required"));
      return;
    }

    retryPaymentMutation.mutate({
      orderNumber: trackedOrder.orderNumber,
      lookupToken,
    });
  };

  const showPaymentSuccess =
    paymentResult === "success" && trackedOrder?.paymentMethod === "paymobCard";

  const showPaymentFailed =
    ["failed", "invalid", "missing"].includes(paymentResult) ||
    (paymentResult && paymentResult !== "success");

  return (
    <>
      <PageHeader
        label={t("orders:track.headerLabel")}
        title={t("orders:track.headerTitle")}
        description={t("orders:track.headerDescription")}
      />

      <section className="fashion-section">
        <Container>
          <div className="grid gap-6 lg:grid-cols-[420px_1fr] lg:items-start">
            <Card className="border-[#c7a852]/28 bg-[#110f0e] p-6 sm:p-8">
              <SectionLabel>{t("orders:track.label")}</SectionLabel>

              <h2 className="mb-7 font-serif text-3xl font-semibold">
                {t("orders:track.find")}
              </h2>

              {error && (
                <div className="mb-5 border border-[#b8585d]/45 bg-[#882c30]/18 px-4 py-3 text-sm text-[#f5d7d8]">
                  {error}
                </div>
              )}

              {showPaymentSuccess && (
                <div className="mb-5 border border-[#c7a852]/35 bg-[#c7a852]/10 px-4 py-3 text-sm text-[#f5f0e8]">
                  {t("orders:track.paymentSuccess")}
                </div>
              )}

              {showPaymentFailed && (
                <div className="mb-5 border border-[#b8585d]/45 bg-[#882c30]/18 px-4 py-3 text-sm text-[#f5d7d8]">
                  {t("orders:track.paymentFailed")}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label={t("orders:track.orderNumber")}
                  name="orderNumber"
                  value={formData.orderNumber}
                  onChange={updateField}
                  placeholder="DV-1001"
                />

                <Input
                  label={t("orders:track.token")}
                  name="lookupToken"
                  value={formData.lookupToken}
                  onChange={updateField}
                  placeholder={t("orders:track.tokenPlaceholder")}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={trackMutation.isPending}
                >
                  {trackMutation.isPending
                    ? t("orders:track.tracking")
                    : t("orders:track.button")}
                </Button>
              </form>

              {canRetryCardPayment(trackedOrder) && (
                <div className="mt-5 border border-[#c7a852]/30 bg-[#c7a852]/9 p-5">
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                    {t("orders:track.retryPending")}
                  </p>

                  <p className="mt-3 text-sm leading-7 text-[#f5f0e8]/65">
                    {t("orders:track.retryDescription")}
                  </p>

                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-4 w-full"
                    onClick={handleRetryCardPayment}
                    disabled={retryPaymentMutation.isPending}
                  >
                    {retryPaymentMutation.isPending
                      ? t("orders:track.openingPayment")
                      : t("orders:track.retryPayment")}
                  </Button>
                </div>
              )}
            </Card>

            {!trackedOrder ? (
              <Card className="py-16 text-center">
                <SectionLabel className="justify-center">
                  {t("orders:track.status")}
                </SectionLabel>

                <h2 className="editorial-heading text-6xl sm:text-8xl">
                  {t("orders:track.waiting")}
                </h2>

                <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-[#f5f0e8]/52">
                  {t("orders:track.waitingDescription")}
                </p>
              </Card>
            ) : (
              <div className="space-y-5">
                <Card>
                  <SectionLabel>{t("orders:track.found")}</SectionLabel>

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="font-serif text-4xl font-semibold">
                        {trackedOrder.orderNumber}
                      </h2>

                      <p className="mt-2 text-sm text-[#f5f0e8]/45">
                        {t("common:created", {
                          date: formatDate(trackedOrder.createdAt),
                        })}
                      </p>
                    </div>

                    <p className="font-serif text-3xl font-semibold">
                      {formatMoney(trackedOrder.total)}
                    </p>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="status-panel">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                        {t("orders:track.orderStatus")}
                      </p>
                      <p className="mt-3 text-sm font-bold uppercase text-white">
                        {getOrderStatusLabel(t, trackedOrder.orderStatus)}
                      </p>
                    </div>

                    <div className="status-panel">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                        {t("orders:track.paymentStatus")}
                      </p>
                      <p className="mt-3 text-sm font-bold uppercase text-white">
                        {getPaymentStatusLabel(t, trackedOrder.paymentStatus)}
                      </p>
                    </div>

                    <div className="status-panel">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                        {t("orders:track.paymentMethod")}
                      </p>
                      <p className="mt-3 text-sm font-bold uppercase text-white">
                        {getPaymentMethodLabel(t, trackedOrder.paymentMethod)}
                      </p>
                    </div>
                  </div>
                </Card>

                {(trackedOrder.appliedBundles?.length > 0 ||
                  trackedOrder.appliedOffers?.length > 0 ||
                  trackedOrder.discountCode?.code) && (
                  <Card>
                    <SectionLabel>
                      {t("orders:track.appliedSavings")}
                    </SectionLabel>

                    <div className="space-y-3">
                      {trackedOrder.appliedBundles?.map((bundle, index) => (
                        <div
                          key={`${bundle.slug}-${index}`}
                          className="border-l-2 border-[#c7a852] bg-[#c7a852]/7 p-4"
                        >
                          <div className="flex justify-between gap-4">
                            <div>
                              <p className="text-sm font-black uppercase text-white">
                                {getLocalizedBundle(bundle, language).title}
                              </p>
                              <p className="mt-1 text-xs text-[#f5f0e8]/62">
                                {t("orders:track.bundleApplication", {
                                  count: bundle.applications,
                                })}
                              </p>
                            </div>

                            <p className="text-sm font-black text-emerald-100">
                              -{formatMoney(bundle.discountAmount)}
                            </p>
                          </div>
                        </div>
                      ))}

                      {trackedOrder.appliedOffers?.map((offer, index) => (
                        <div
                          key={`${offer.slug}-${index}`}
                          className="border-l-2 border-[#c7a852] bg-[#c7a852]/7 p-4"
                        >
                          <div className="flex justify-between gap-4">
                            <div>
                              <p className="text-sm font-black uppercase text-white">
                                {getLocalizedOffer(offer, language).title}
                              </p>
                              <p className="mt-1 text-xs text-[#f5f0e8]/62">
                                {offer.freeDeliveryApplied
                                  ? t("orders:track.offerFree")
                                  : t("orders:track.offer")}
                              </p>
                            </div>

                            <p className="text-sm font-black text-emerald-100">
                              {offer.discountAmount > 0
                                ? `-${formatMoney(offer.discountAmount)}`
                                : t("checkout:freeDelivery")}
                            </p>
                          </div>
                        </div>
                      ))}

                      {trackedOrder.discountCode?.code && (
                        <div className="border-l-2 border-[#c7a852] bg-[#c7a852]/7 p-4">
                          <div className="flex justify-between gap-4">
                            <div>
                              <p className="text-sm font-black uppercase text-white">
                                {trackedOrder.discountCode.code}
                              </p>
                              <p className="mt-1 text-xs text-[#f5f0e8]/62">
                                {t("common:discountCode")}
                              </p>
                            </div>

                            <p className="text-sm font-black text-emerald-100">
                              -
                              {formatMoney(
                                trackedOrder.discountCode.discountAmount
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                <Card>
                  <SectionLabel>{t("orders:track.totals")}</SectionLabel>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/45">
                        {t("common:subtotal")}
                      </span>
                      <span>{formatMoney(trackedOrder.subtotal)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-white/45">
                        {t("common:productSavings")}
                      </span>
                      <span className="text-emerald-100">
                        {formatMoney(trackedOrder.productSavings)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-white/45">
                        {t("common:bundleDiscount")}
                      </span>
                      <span className="text-emerald-100">
                        -{formatMoney(trackedOrder.bundleDiscountTotal)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-white/45">
                        {t("common:offerDiscount")}
                      </span>
                      <span className="text-emerald-100">
                        -{formatMoney(trackedOrder.offerDiscountTotal)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-white/45">
                        {t("common:discountCode")}
                      </span>
                      <span className="text-emerald-100">
                        -{formatMoney(trackedOrder.discountTotal)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-white/45">
                        {t("common:totalDiscount")}
                      </span>
                      <span className="text-emerald-100">
                        -{formatMoney(trackedOrder.totalDiscount)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-white/45">
                        {t("common:delivery")}
                      </span>
                      <span>
                        {formatMoney(trackedOrder.deliveryFee)}
                        {trackedOrder.deliverySnapshot
                          ?.freeDeliveryApplied && (
                          <span className="ml-2 text-emerald-100">
                            {t("common:free")}
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between border-t border-[#c7a852]/25 pt-4 font-serif text-xl font-semibold">
                      <span>{t("common:total")}</span>
                      <span>{formatMoney(trackedOrder.total)}</span>
                    </div>
                  </div>
                </Card>

                <Card>
                  <SectionLabel>{t("common:items")}</SectionLabel>

                  <div className="space-y-4">
                    {trackedOrder.items?.map((item) => (
                      <div
                        key={
                          item._id ||
                          `${item.name}-${item.color?.name}-${item.size?.label}`
                        }
                        className="flex gap-3 border-b border-[#f5f0e8]/10 pb-4 last:border-b-0 last:pb-0"
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
                </Card>

                {trackedOrder.statusHistory?.length > 0 && (
                  <Card>
                    <SectionLabel>{t("orders:track.timeline")}</SectionLabel>

                    <div className="space-y-3">
                      {trackedOrder.statusHistory.map((entry, index) => (
                        <div
                          key={`${entry.status}-${index}`}
                          className="border-l-2 border-[#882c30] bg-[#f5f0e8]/3 p-4"
                        >
                          <p className="text-sm font-black uppercase text-white">
                            {getOrderStatusLabel(t, entry.status)}
                          </p>

                          {entry.note && (
                            <p className="mt-2 text-xs leading-6 text-white/45">
                              {entry.note}
                            </p>
                          )}

                          <p className="mt-2 text-xs text-white/30">
                            {formatDate(entry.changedAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        </Container>
      </section>
    </>
  );
};

export default TrackOrder;
