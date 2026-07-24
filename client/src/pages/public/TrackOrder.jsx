import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Container from "../../components/ui/Container";
import Input from "../../components/ui/Input";
import PageHeader from "../../components/ui/PageHeader";
import SectionLabel from "../../components/ui/SectionLabel";
import useSeo from "../../hooks/useSeo";

import { trackOrderRequest } from "../../services/orderService";
import {
  formatCurrency,
  formatCustomerDate,
  getOrderStatusLabel,
  getPaymentMethodLabel,
  getPaymentStatusLabel,
} from "../../utils/translatedLabels";
import {
  getLocalizedAppliedBundle,
  getLocalizedAppliedOffer,
  getLocalizedDeliverySnapshot,
  getLocalizedOrderItem,
  getLocalizedPaymentSnapshot,
} from "../../utils/localizedContent";
import { hideBrokenImage } from "../../utils/imageFallback";
import { getOrderItemImage } from "../../utils/resolveLocalImages";

const ORDER_NUMBER_PREFIX = "DV-";

const normalizeOrderDigits = (value = "") =>
  String(value)
    .replace(/[\u0660-\u0669]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x0660)
    )
    .replace(/[\u06f0-\u06f9]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x06f0)
    )
    .replace(/[^0-9]/g, "");

const getFullOrderNumber = (orderDigits) =>
  `${ORDER_NUMBER_PREFIX}${orderDigits}`;

const TrackOrder = () => {
  const { t, i18n } = useTranslation(["orders", "common", "checkout"]);
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";

  // SEO
  useSeo({
    title: t("orders:track.seoTitle"),
    description: t("orders:track.seoDescription"),
    robots: "noindex,nofollow",
  });
  const formatMoney = (value) => formatCurrency(value, language);
  const formatDate = (value) =>
    value ? formatCustomerDate(value, language, true) : "";
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialTrackingCredentials] = useState(() => ({
    orderDigits: normalizeOrderDigits(
      location.state?.orderNumber || searchParams.get("orderNumber") || ""
    ),
    email:
      location.state?.email ||
      searchParams.get("email") ||
      location.state?.order?.customerInfo?.email ||
      "",
  }));

  const [formData, setFormData] = useState({
    orderDigits: initialTrackingCredentials.orderDigits,
    email: initialTrackingCredentials.email,
  });

  const [error, setError] = useState("");
  const [trackedOrder, setTrackedOrder] = useState(null);

  const paymentResult = searchParams.get("payment") || "";

  const trackMutation = useMutation({
    mutationFn: trackOrderRequest,
    onSuccess: (response) => {
      setTrackedOrder(response.order);
      setFormData((current) => ({
        ...current,
        orderDigits:
          normalizeOrderDigits(response.order?.orderNumber) ||
          current.orderDigits,
        email: response.order?.customerInfo?.email || current.email,
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

  useEffect(() => {
    const { orderDigits, email } = initialTrackingCredentials;

    if (orderDigits && email) {
      trackMutation.mutate({
        orderNumber: getFullOrderNumber(orderDigits),
        email,
      });
    }

    if (searchParams.has("lookupToken")) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.delete("lookupToken");
      setSearchParams(nextSearchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateEmail = (event) => {
    setFormData((current) => ({
      ...current,
      email: event.target.value,
    }));

    if (error) setError("");
  };

  const updateOrderDigits = (value) => {
    setFormData((current) => ({
      ...current,
      orderDigits: normalizeOrderDigits(value),
    }));

    if (error) setError("");
  };

  const handleOrderNumberPaste = (event) => {
    event.preventDefault();
    updateOrderDigits(event.clipboardData.getData("text"));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formData.orderDigits || !formData.email.trim()) {
      setError(t("orders:track.required"));
      return;
    }

    trackMutation.mutate({
      orderNumber: getFullOrderNumber(formData.orderDigits),
      email: formData.email.trim(),
    });
  };

  const showPaymentSuccess =
    paymentResult === "success" && trackedOrder?.paymentMethod === "paymobCard";

  const showPaymentFailed =
    ["failed", "invalid", "missing"].includes(paymentResult) ||
    (paymentResult && paymentResult !== "success");
  const localizedPaymentSnapshot = getLocalizedPaymentSnapshot(
    trackedOrder?.paymentSnapshot,
    language
  );
  const localizedDeliverySnapshot = getLocalizedDeliverySnapshot(
    trackedOrder?.deliverySnapshot,
    language
  );

  return (
    <>
      <PageHeader
        label={t("orders:track.headerLabel")}
        title={t("orders:track.headerTitle")}
        description={t("orders:track.headerDescription")}
        backgroundVideo={{
          mp4: "/videos/track-order/track-order.mp4",
          poster: "/videos/track-order/track-order-poster.webp",
        }}
        className="bg-[#f5f0e8] text-[#1c1917]"
      />

      <section className="fashion-section">
        <Container>
          <div className="grid gap-6 lg:grid-cols-[420px_1fr] lg:items-start">
            <Card className="public-order-surface border-[#c7a852]/28 bg-[#f5f0e8] p-6 text-[#1c1917] sm:p-8">
              <SectionLabel>{t("orders:track.label")}</SectionLabel>

              <h2 className="mb-7 font-serif text-3xl font-semibold">
                {t("orders:track.find")}
              </h2>

              {error && (
                <div
                  className="public-order-error mb-5 border border-[#882c30]/35 bg-[#882c30]/8 px-4 py-3 text-sm text-[#882c30]"
                  role="alert"
                >
                  {error}
                </div>
              )}

              {showPaymentSuccess && (
                <div className="public-order-notice mb-5 border border-[#c7a852]/35 bg-[#c7a852]/10 px-4 py-3 text-sm text-[#1c1917]">
                  {t("orders:track.paymentSuccess")}
                </div>
              )}

              {showPaymentFailed && (
                <div
                  className="public-order-error mb-5 border border-[#882c30]/35 bg-[#882c30]/8 px-4 py-3 text-sm text-[#882c30]"
                  role="alert"
                >
                  {t("orders:track.paymentFailed")}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="public-order-number-field">
                  <label
                    htmlFor="track-order-number"
                    className="mb-2.5 block text-[0.66rem] font-black uppercase tracking-[0.22em] text-[#c7a852]"
                  >
                    {t("orders:track.orderNumber")}
                  </label>

                  <div
                    className="public-order-number-group flex rounded-[0.5rem] border border-[#8b8075]/45 bg-[#f5f0e8] text-[#1c1917] transition focus-within:border-[#c7a852] focus-within:ring-2 focus-within:ring-[#c7a852]/20"
                    dir="ltr"
                  >
                    <span
                      className="pointer-events-none flex select-none items-center border-r border-[#8b8075]/30 px-4 py-3.5 text-sm font-bold text-[#1c1917]"
                      aria-hidden="true"
                    >
                      {ORDER_NUMBER_PREFIX}
                    </span>

                    <input
                      id="track-order-number"
                      name="orderDigits"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={formData.orderDigits}
                      onChange={(event) => updateOrderDigits(event.target.value)}
                      onPaste={handleOrderNumberPaste}
                      placeholder="1015"
                      aria-describedby="track-order-number-help"
                      className="public-order-number-input min-w-0 flex-1 bg-transparent px-3 py-3.5 text-left text-sm text-[#1c1917] caret-[#1c1917] outline-none placeholder:text-[#8b8075]"
                    />
                  </div>

                  <p
                    id="track-order-number-help"
                    className="public-order-secondary mt-2 text-xs leading-5 text-[#8b8075]"
                  >
                    {t("orders:track.orderNumberHelper")}
                  </p>
                </div>

                <Input
                  label={t("orders:track.email")}
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={updateEmail}
                  placeholder="you@example.com"
                  className="public-order-input !text-[#1c1917] !caret-[#1c1917]"
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

            </Card>

            {!trackedOrder ? (
              <Card className="public-order-surface py-16 text-center text-[#1c1917]">
                <SectionLabel className="justify-center">
                  {t("orders:track.status")}
                </SectionLabel>

                <h2 className="editorial-heading text-6xl sm:text-8xl">
                  {t("orders:track.waiting")}
                </h2>

                <p className="public-order-secondary mx-auto mt-6 max-w-xl text-sm leading-7 text-[#8b8075]">
                  {t("orders:track.waitingDescription")}
                </p>
              </Card>
            ) : (
              <div className="space-y-5">
                <Card className="public-order-surface text-[#1c1917]">
                  <SectionLabel>{t("orders:track.found")}</SectionLabel>

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="public-order-primary font-serif text-4xl font-semibold text-[#1c1917]">
                        {trackedOrder.orderNumber}
                      </h2>

                      <p className="public-order-secondary mt-2 text-sm text-[#8b8075]">
                        {t("common:created", {
                          date: formatDate(trackedOrder.createdAt),
                        })}
                      </p>
                    </div>

                    <p className="public-order-primary font-serif text-3xl font-semibold text-[#1c1917]">
                      {formatMoney(trackedOrder.total)}
                    </p>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <div className="public-order-status-panel status-panel border-[#8b8075]/30 bg-[#8b8075]/8">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                        {t("orders:track.orderStatus")}
                      </p>
                      <p className="public-order-primary mt-3 text-sm font-bold uppercase text-[#1c1917]">
                        {getOrderStatusLabel(t, trackedOrder.orderStatus)}
                      </p>
                    </div>

                    <div className="public-order-status-panel status-panel border-[#8b8075]/30 bg-[#8b8075]/8">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                        {t("orders:track.paymentStatus")}
                      </p>
                      <p className="public-order-primary mt-3 text-sm font-bold uppercase text-[#1c1917]">
                        {getPaymentStatusLabel(t, trackedOrder.paymentStatus)}
                      </p>
                    </div>

                    <div className="public-order-status-panel status-panel border-[#8b8075]/30 bg-[#8b8075]/8">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                        {t("orders:track.paymentMethod")}
                      </p>
                      <p className="public-order-primary mt-3 text-sm font-bold uppercase text-[#1c1917]">
                        {getPaymentMethodLabel(t, trackedOrder.paymentMethod)}
                      </p>
                    </div>
                  </div>
                </Card>

                {(trackedOrder.appliedBundles?.length > 0 ||
                  trackedOrder.appliedOffers?.length > 0 ||
                  trackedOrder.discountCode?.code) && (
                  <Card className="public-order-surface text-[#1c1917]">
                    <SectionLabel>
                      {t("orders:track.appliedSavings")}
                    </SectionLabel>

                    <div className="space-y-3">
                      {trackedOrder.appliedBundles?.map((bundle, index) => {
                        const localizedBundle = getLocalizedAppliedBundle(
                          bundle,
                          language
                        );

                        return (
                          <div
                            key={`${bundle.slug}-${index}`}
                            className="public-order-savings-panel border-s-2 border-[#c7a852] bg-[#c7a852]/7 p-4 text-[#1c1917]"
                          >
                            <div className="flex justify-between gap-4">
                              <div>
                                <p className="public-order-primary text-sm font-black uppercase text-[#1c1917]">
                                  {localizedBundle.title}
                                </p>
                                <p className="public-order-secondary mt-1 text-xs text-[#8b8075]">
                                  {t("orders:track.bundleApplication", {
                                    count: bundle.applications,
                                  })}
                                </p>
                                {localizedBundle.description && (
                                  <p className="public-order-secondary mt-2 text-xs leading-6 text-[#8b8075]">
                                    {localizedBundle.description}
                                  </p>
                                )}
                              </div>

                              <p className="public-order-savings-value text-sm font-black text-[#1c1917]">
                                -{formatMoney(bundle.discountAmount)}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                      {trackedOrder.appliedOffers?.map((offer, index) => {
                        const localizedOffer = getLocalizedAppliedOffer(
                          offer,
                          language
                        );

                        return (
                          <div
                            key={`${offer.slug}-${index}`}
                            className="public-order-savings-panel border-s-2 border-[#c7a852] bg-[#c7a852]/7 p-4 text-[#1c1917]"
                          >
                            <div className="flex justify-between gap-4">
                              <div>
                                <p className="public-order-primary text-sm font-black uppercase text-[#1c1917]">
                                  {localizedOffer.title}
                                </p>
                                <p className="public-order-secondary mt-1 text-xs text-[#8b8075]">
                                  {offer.freeDeliveryApplied
                                    ? t("orders:track.offerFree")
                                    : t("orders:track.offer")}
                                </p>
                                {localizedOffer.description && (
                                  <p className="public-order-secondary mt-2 text-xs leading-6 text-[#8b8075]">
                                    {localizedOffer.description}
                                  </p>
                                )}
                              </div>

                              <p className="public-order-savings-value text-sm font-black text-[#1c1917]">
                                {offer.discountAmount > 0
                                  ? `-${formatMoney(offer.discountAmount)}`
                                  : t("checkout:freeDelivery")}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                      {trackedOrder.discountCode?.code && (
                        <div className="public-order-savings-panel border-s-2 border-[#c7a852] bg-[#c7a852]/7 p-4 text-[#1c1917]">
                          <div className="flex justify-between gap-4">
                            <div>
                              <p className="public-order-primary text-sm font-black uppercase text-[#1c1917]">
                                {trackedOrder.discountCode.code}
                              </p>
                              <p className="public-order-secondary mt-1 text-xs text-[#8b8075]">
                                {t("common:discountCode")}
                              </p>
                            </div>

                            <p className="public-order-savings-value text-sm font-black text-[#1c1917]">
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

                <Card className="public-order-surface text-[#1c1917]">
                  <SectionLabel>{t("orders:track.totals")}</SectionLabel>

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="public-order-secondary text-[#8b8075]">
                        {t("common:subtotal")}
                      </span>
                      <span className="public-order-primary text-[#1c1917]">
                        {formatMoney(trackedOrder.subtotal)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="public-order-secondary text-[#8b8075]">
                        {t("common:productSavings")}
                      </span>
                      <span className="public-order-savings-value text-[#882c30]">
                        {formatMoney(trackedOrder.productSavings)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="public-order-secondary text-[#8b8075]">
                        {t("common:bundleDiscount")}
                      </span>
                      <span className="public-order-savings-value text-[#882c30]">
                        -{formatMoney(trackedOrder.bundleDiscountTotal)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="public-order-secondary text-[#8b8075]">
                        {t("common:offerDiscount")}
                      </span>
                      <span className="public-order-savings-value text-[#882c30]">
                        -{formatMoney(trackedOrder.offerDiscountTotal)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="public-order-secondary text-[#8b8075]">
                        {t("common:discountCode")}
                      </span>
                      <span className="public-order-savings-value text-[#882c30]">
                        -{formatMoney(trackedOrder.discountTotal)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="public-order-secondary text-[#8b8075]">
                        {t("common:totalDiscount")}
                      </span>
                      <span className="public-order-savings-value text-[#882c30]">
                        -{formatMoney(trackedOrder.totalDiscount)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="public-order-secondary text-[#8b8075]">
                        {t("common:delivery")}
                      </span>
                      <span className="public-order-primary text-[#1c1917]">
                        {formatMoney(trackedOrder.deliveryFee)}
                        {trackedOrder.deliverySnapshot
                          ?.freeDeliveryApplied && (
                          <span className="public-order-savings-value ms-2 text-[#882c30]">
                            {t("common:free")}
                          </span>
                        )}
                      </span>
                    </div>

                    {localizedDeliverySnapshot?.notes && (
                      <p className="public-order-secondary border border-[#8b8075]/25 bg-[#8b8075]/8 p-3 text-xs leading-6 text-[#8b8075]">
                        {localizedDeliverySnapshot.notes}
                      </p>
                    )}

                    {(localizedPaymentSnapshot?.label ||
                      localizedPaymentSnapshot?.instructions) && (
                      <div className="public-order-secondary border border-[#8b8075]/25 bg-[#8b8075]/8 p-3 text-xs leading-6 text-[#8b8075]">
                        {localizedPaymentSnapshot?.label && (
                          <p className="public-order-primary font-bold text-[#1c1917]">
                            {localizedPaymentSnapshot.label}
                          </p>
                        )}
                        {localizedPaymentSnapshot?.instructions && (
                          <p className="mt-1">
                            {localizedPaymentSnapshot.instructions}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="public-order-total flex justify-between border-t border-[#c7a852]/25 pt-4 font-serif text-xl font-semibold text-[#1c1917]">
                      <span>{t("common:total")}</span>
                      <span>{formatMoney(trackedOrder.total)}</span>
                    </div>
                  </div>
                </Card>

                <Card className="public-order-surface text-[#1c1917]">
                  <SectionLabel>{t("common:items")}</SectionLabel>

                  <div className="space-y-4">
                    {trackedOrder.items?.map((rawItem) => {
                      const item = getLocalizedOrderItem(rawItem, language);
                      const displayImage = getOrderItemImage(rawItem);

                      return (
                        <div
                          key={
                            item._id ||
                            `${item.name}-${item.color?.name}-${item.size?.label}`
                          }
                          className="public-order-item flex gap-3 border-b border-[#8b8075]/25 pb-4 last:border-b-0 last:pb-0"
                        >
                          <div className="h-20 w-16 shrink-0 overflow-hidden border border-[#8b8075]/30 bg-[#1c1917]">
                            {displayImage ? (
                              <img
                                src={displayImage}
                                alt={item.imageAlt || item.name}
                                onError={hideBrokenImage}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            ) : (
                              <div className="h-full w-full bg-white/5" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="public-order-primary truncate font-serif text-base font-semibold text-[#1c1917]">
                              {item.name}
                            </p>

                            <p className="public-order-secondary mt-1 text-xs text-[#8b8075]">
                              {item.color?.name} / {item.size?.label} ×{" "}
                              {item.quantity}
                            </p>

                            <p className="public-order-price mt-2 text-sm font-bold text-[#1c1917]">
                              {formatMoney(item.lineSubtotal)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {trackedOrder.statusHistory?.length > 0 && (
                  <Card className="public-order-surface text-[#1c1917]">
                    <SectionLabel>{t("orders:track.timeline")}</SectionLabel>

                    <div className="space-y-3">
                      {trackedOrder.statusHistory.map((entry, index) => (
                        <div
                          key={`${entry.status}-${index}`}
                          className="public-order-timeline-entry border-s-2 border-[#882c30] bg-[#8b8075]/8 p-4"
                        >
                          <p className="public-order-primary text-sm font-black uppercase text-[#1c1917]">
                            {getOrderStatusLabel(t, entry.status)}
                          </p>

                          {entry.note && (
                            <p className="public-order-secondary mt-2 text-xs leading-6 text-[#8b8075]">
                              {entry.note}
                            </p>
                          )}

                          <p className="public-order-secondary mt-2 text-xs text-[#8b8075]">
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
