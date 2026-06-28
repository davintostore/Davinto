import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Container from "../../components/ui/Container";
import Input from "../../components/ui/Input";
import SectionLabel from "../../components/ui/SectionLabel";
import Select from "../../components/ui/Select";
import Textarea from "../../components/ui/Textarea";
import useSeo from "../../hooks/useSeo";
import useStableQuote from "../../hooks/useStableQuote";

import { useCart } from "../../context/cartContext";
import { useCustomerAuth } from "../../context/customerAuthContext";
import { createOrderRequest } from "../../services/orderService";
import { getPublicPaymobConfigRequest } from "../../services/paymobService";
import { createQuoteRequest } from "../../services/quoteService";
import { getPublicSettingsRequest } from "../../services/settingsService";
import {
  trackAddPaymentInfo,
  trackInitiateCheckout,
} from "../../utils/metaPixel";
import { formatCurrency } from "../../utils/translatedLabels";
import {
  getLocalizedBundle,
  getLocalizedOffer,
  getLocalizedSettings,
} from "../../utils/localizedContent";
import {
  buildCartQuoteSignature,
  buildQuoteItems,
  buildQuoteItemsByKey,
} from "../../utils/cartQuote";
import { egyptGovernorates } from "../../utils/governorates";
import { hideBrokenImage } from "../../utils/imageFallback";
import { getCartItemImage } from "../../utils/resolveLocalImages";

const ORDER_HANDOFF_KEY = "davinto_order_handoff";
const LEGACY_LAST_ORDER_KEY = "davinto_last_order";

const initialCustomerInfo = {
  fullName: "",
  phone: "",
  secondPhone: "",
  email: "",
  city: "",
  address: "",
  notes: "",
};

const paymentMethodsOrder = ["cod", "instapay", "vodafoneCash", "paymobCard"];

const Checkout = () => {
  const { t, i18n } = useTranslation(["checkout", "common", "navigation"]);
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const formatMoney = (value) => formatCurrency(value, language);
  const navigate = useNavigate();
  const initiateCheckoutTrackedRef = useRef(false);
  const { customer } = useCustomerAuth();

  // SEO
  useSeo({
    title: t("checkout:seo.title"),
    description: t("checkout:seo.description"),
    robots: "noindex,nofollow",
  });

  const {
    items,
    cartCount,
    clearCart,
    rememberCheckoutQuote,
  } = useCart();

  const [customerInfo, setCustomerInfo] = useState(() => ({
    ...initialCustomerInfo,
    fullName: customer?.name || "",
    phone: customer?.phone || "",
    email: customer?.email || "",
  }));
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [paymentReference, setPaymentReference] = useState("");
  const [formError, setFormError] = useState("");

  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscountCode, setAppliedDiscountCode] = useState("");
  const [discountError, setDiscountError] = useState("");

  const quoteItems = useMemo(() => buildQuoteItems(items), [items]);
  const deliveryZone = customerInfo.city;
  const quoteSignature = useMemo(
    () =>
      buildCartQuoteSignature({
        items: quoteItems,
        discountCode: appliedDiscountCode,
        deliveryZone,
      }),
    [appliedDiscountCode, deliveryZone, quoteItems]
  );

  const {
    data: settingsData,
    isLoading: isLoadingSettings,
    isError: isSettingsError,
    error: settingsError,
  } = useQuery({
    queryKey: ["public-settings"],
    queryFn: getPublicSettingsRequest,
  });

  const {
    data: paymobConfigData,
    isLoading: isLoadingPaymobConfig,
  } = useQuery({
    queryKey: ["paymob-config"],
    queryFn: getPublicPaymobConfigRequest,
    retry: 1,
  });

  const {
    isLoading: isLoadingQuote,
    isFetching: isFetchingQuote,
    isError: isQuoteError,
    error: quoteError,
    quote,
    isQuoteCalculating,
    hasCurrentQuote,
  } = useStableQuote({
    queryKey: [
      "checkout-quote",
      quoteSignature,
    ],
    queryFn: () =>
      createQuoteRequest({
        items: quoteItems,
        discountCode: appliedDiscountCode,
        deliveryZone,
      }),
    enabled: items.length > 0,
    signature: quoteSignature,
    retry: 1,
    scope: "checkout",
  });

  const settings = settingsData?.settings;
  const localizedSettings = useMemo(
    () => getLocalizedSettings(settings, language),
    [settings, language]
  );
  const isPaymobReady = Boolean(paymobConfigData?.configured);

  const availablePayments = useMemo(() => {
    const payments = localizedSettings?.payments || {};

    return paymentMethodsOrder
      .map((method) => ({
        method,
        ...payments[method],
      }))
      .filter((payment) => payment.enabled);
  }, [localizedSettings]);

  const effectivePaymentMethod = useMemo(() => {
    const currentPayment = availablePayments.find(
      (payment) => payment.method === paymentMethod
    );

    if (currentPayment) {
      return currentPayment.method;
    }

    const firstEnabledNonBlockedPayment =
      availablePayments.find(
        (payment) => payment.method !== "paymobCard" || isPaymobReady
      ) || availablePayments[0];

    return firstEnabledNonBlockedPayment?.method || "";
  }, [availablePayments, paymentMethod, isPaymobReady]);

  const manualPayment = localizedSettings?.manualPayment || {};

  const requiresReference =
    ["instapay", "vodafoneCash"].includes(effectivePaymentMethod) &&
    manualPayment.requireTransactionReference !== false;

  const summary = {
    subtotal: quote?.subtotal || 0,
    productSavings: quote?.productSavings || 0,
    bundleDiscountTotal: quote?.bundleDiscountTotal || 0,
    offerDiscountTotal: quote?.offerDiscountTotal || 0,
    discountTotal: quote?.discountTotal || 0,
    totalDiscount: quote?.totalDiscount || 0,
    deliveryFee: quote?.deliveryFee || 0,
    total: quote?.total || 0,
    appliedBundles: (quote?.appliedBundles || []).map((bundle) =>
      getLocalizedBundle(bundle, language)
    ),
    appliedOffers: (quote?.appliedOffers || []).map((offer) =>
      getLocalizedOffer(offer, language)
    ),
    appliedDiscountCode: quote?.appliedDiscountCode || null,
    deliverySnapshot: quote?.deliverySnapshot
      ? {
          ...quote.deliverySnapshot,
          notes:
            localizedSettings?.delivery?.notes ||
            quote.deliverySnapshot.notes ||
            "",
        }
      : null,
  };

  const quoteItemsByKey = useMemo(
    () => buildQuoteItemsByKey(quote),
    [quote]
  );
  const isQuotePending =
    !hasCurrentQuote && (isQuoteCalculating || isFetchingQuote || isLoadingQuote);
  const quoteStatusText = isQuotePending
    ? t("common:updatingTotals")
    : t("common:totalsUnavailable");
  const isQuoteRefreshing = hasCurrentQuote && isFetchingQuote;
  const formatQuotedMoney = (value) =>
    hasCurrentQuote ? formatMoney(value) : quoteStatusText;

  useEffect(() => {
    if (!items.length || !hasCurrentQuote || initiateCheckoutTrackedRef.current) {
      return;
    }

    initiateCheckoutTrackedRef.current = true;

    trackInitiateCheckout({
      items,
      value: summary.total,
    });
  }, [hasCurrentQuote, items, summary.total]);

  const createOrderMutation = useMutation({
    mutationFn: createOrderRequest,
    onSuccess: (response) => {
      const order = response?.order;

      if (!order?.orderNumber) {
        setFormError(t("checkout:errors.trackingMissing"));
        return;
      }

      sessionStorage.setItem(ORDER_HANDOFF_KEY, JSON.stringify(order));
      localStorage.removeItem(LEGACY_LAST_ORDER_KEY);

      if (effectivePaymentMethod === "paymobCard") {
        const redirectUrl = response?.payment?.redirectUrl;

        if (redirectUrl) {
          clearCart();
          window.location.href = redirectUrl;
          return;
        }

        setFormError(
          response?.payment?.error ||
            t("checkout:errors.paymentOpen")
        );

        return;
      }

      clearCart();

      navigate("/order-success", {
        replace: true,
        state: { order },
      });
    },
    onError: (err) => {
      setFormError(
        err?.friendlyMessage ||
          err?.message ||
          t("checkout:errors.create")
      );
    },
  });

  const validateDiscountMutation = useMutation({
    mutationFn: createQuoteRequest,
    onSuccess: (response) => {
      const nextQuote = response?.quote;
      const code = nextQuote?.appliedDiscountCode?.code;

      if (!code) {
        setAppliedDiscountCode("");
        setDiscountError(t("checkout:errors.discountNotApplied"));
        return;
      }

      rememberCheckoutQuote(
        nextQuote,
        buildCartQuoteSignature({
          items: quoteItems,
          discountCode: code,
          deliveryZone,
        })
      );
      setAppliedDiscountCode(code);
      setDiscountCode(code);
      setDiscountError("");
    },
    onError: (err) => {
      setAppliedDiscountCode("");
      setDiscountError(
        err?.friendlyMessage ||
          err?.message ||
          t("checkout:errors.discount")
      );
    },
  });

  const updateCustomerField = (event) => {
    const { name, value } = event.target;

    setCustomerInfo((current) => ({
      ...current,
      [name]: value,
    }));

    if (formError) {
      setFormError("");
    }
  };

  const validateForm = () => {
    if (items.length === 0) {
      return t("checkout:errors.cartEmpty");
    }

    if (isQuoteError) {
      return (
        quoteError?.friendlyMessage ||
        quoteError?.message ||
        t("checkout:errors.quote")
      );
    }

    if (isFetchingQuote || !hasCurrentQuote) {
      return t("checkout:errors.quoteLoading");
    }

    if (!quote) {
      return t("checkout:errors.quoteLoading");
    }

    if (!customerInfo.fullName.trim()) {
      return t("checkout:errors.name");
    }

    if (!customerInfo.phone.trim()) {
      return t("checkout:errors.phone");
    }

    if (!customerInfo.city.trim()) {
      return t("checkout:errors.city");
    }

    if (!customerInfo.address.trim()) {
      return t("checkout:errors.address");
    }

    if (
      customerInfo.email.trim() &&
      !/^\S+@\S+\.\S+$/.test(customerInfo.email.trim())
    ) {
      return t("checkout:errors.email");
    }

    if (!effectivePaymentMethod) {
      return t("checkout:errors.payment");
    }

    if (effectivePaymentMethod === "paymobCard" && !isPaymobReady) {
      return t("checkout:errors.paymob");
    }

    if (requiresReference && !paymentReference.trim()) {
      return t("checkout:errors.reference");
    }

    if (discountCode.trim() && !appliedDiscountCode) {
      return t("checkout:errors.discountFirst");
    }

    return "";
  };

  const buildOrderPayload = () => {
    return {
      customerInfo: {
        fullName: customerInfo.fullName.trim(),
        phone: customerInfo.phone.trim(),
        secondPhone: customerInfo.secondPhone.trim(),
        email: customerInfo.email.trim(),
        city: customerInfo.city.trim(),
        address: customerInfo.address.trim(),
        notes: customerInfo.notes.trim(),
      },
      paymentMethod: effectivePaymentMethod,
      paymentReference: paymentReference.trim(),
      discountCode: appliedDiscountCode || "",
      locale: language === "ar" ? "ar" : "en",
      items: quoteItems,
    };
  };

  const handleApplyDiscount = () => {
    if (!discountCode.trim()) {
      setDiscountError(t("checkout:errors.enterCode"));
      setAppliedDiscountCode("");
      return;
    }

    if (items.length === 0) {
      setDiscountError(t("checkout:errors.emptyDiscountCart"));
      setAppliedDiscountCode("");
      return;
    }

    validateDiscountMutation.mutate({
      items: quoteItems,
      discountCode: discountCode.trim(),
      deliveryZone,
    });
  };

  const handleRemoveDiscount = () => {
    setDiscountCode("");
    setAppliedDiscountCode("");
    setDiscountError("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    trackAddPaymentInfo({
      paymentMethod: effectivePaymentMethod,
      value: summary.total,
    });

    setFormError("");
    createOrderMutation.mutate(buildOrderPayload());
  };

  const handlePaymentChange = (method) => {
    if (method === "paymobCard" && !isPaymobReady) {
      setFormError(
        t("checkout:errors.paymob")
      );
      return;
    }

    setPaymentMethod(method);
    setPaymentReference("");
    setFormError("");
  };

  return (
    <>
      <div className="border-b border-[#c7a852]/20 bg-[#050505]">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Link
            to="/"
            aria-label={t("common:homeAria")}
            className="flex h-11 w-28 items-center"
          >
            <img
              src="/images/logo/logo-3.webp"
              alt="Davinto"
              className="max-h-10 w-full object-contain"
            />
          </Link>
          <Link
            to="/cart"
            className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-[#f5f0e8]/62 transition hover:text-[#c7a852]"
          >
            {t("checkout:backToCart")}
          </Link>
        </Container>
      </div>

      <section className="checkout-section">
        <Container>
          {items.length === 0 ? (
            <Card className="py-14 text-center">
              <SectionLabel className="justify-center">
                {t("navigation:checkout")}
              </SectionLabel>

              <h2 className="editorial-heading text-6xl sm:text-8xl">
                {t("checkout:emptyTitle")}
              </h2>

              <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-[#f5f0e8]/52">
                {t("checkout:emptyDescription")}
              </p>

              <div className="mt-8">
                <Link to="/shop">
                  <Button>{t("checkout:shopNow")}</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start"
            >
              <div className="space-y-4">
                {formError && (
                  <div className="border border-[#b8585d]/45 bg-[#882c30]/18 px-4 py-3 text-sm text-[#f5d7d8]">
                    {formError}
                  </div>
                )}

                {isSettingsError && (
                  <div className="border border-[#b8585d]/45 bg-[#882c30]/18 px-4 py-3 text-sm text-[#f5d7d8]">
                    {settingsError?.friendlyMessage ||
                      settingsError?.message ||
                      t("checkout:errors.settings")}
                  </div>
                )}

                {isQuoteError && (
                  <div className="border border-[#b8585d]/45 bg-[#882c30]/18 px-4 py-3 text-sm text-[#f5d7d8]">
                    {quoteError?.friendlyMessage ||
                      quoteError?.message ||
                      t("checkout:errors.totals")}
                  </div>
                )}

                <section className="border border-[#f5f0e8]/12 bg-[#0f0d0c] p-4 sm:p-5">
                  <SectionLabel>{t("checkout:customer")}</SectionLabel>

                  <h2 className="mb-5 font-serif text-2xl font-semibold">
                    {t("checkout:deliveryDetails")}
                  </h2>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Input
                      label={t("checkout:fullName")}
                      name="fullName"
                      value={customerInfo.fullName}
                      onChange={updateCustomerField}
                      placeholder={t("checkout:fullNamePlaceholder")}
                    />

                    <Input
                      label={t("checkout:phone")}
                      name="phone"
                      value={customerInfo.phone}
                      onChange={updateCustomerField}
                      placeholder="011..."
                    />

                    <Input
                      label={t("checkout:secondPhone")}
                      name="secondPhone"
                      value={customerInfo.secondPhone}
                      onChange={updateCustomerField}
                      placeholder={t("checkout:optional")}
                    />

                    <Input
                      label={t("checkout:email")}
                      name="email"
                      type="email"
                      value={customerInfo.email}
                      onChange={updateCustomerField}
                      placeholder="you@example.com"
                    />

                    <Select
                      label={t("checkout:city")}
                      name="city"
                      value={customerInfo.city}
                      onChange={updateCustomerField}
                    >
                      <option value="">
                        {t("checkout:cityPlaceholder")}
                      </option>
                      {egyptGovernorates.map((zone) => (
                        <option key={zone.slug} value={zone.slug}>
                          {t(`checkout:deliveryZones.${zone.slug}`)}
                        </option>
                      ))}
                    </Select>

                    <div className="md:col-span-2">
                      <Textarea
                        label={t("checkout:address")}
                        name="address"
                        value={customerInfo.address}
                        onChange={updateCustomerField}
                        placeholder={t("checkout:addressPlaceholder")}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Textarea
                        label={t("checkout:notes")}
                        name="notes"
                        value={customerInfo.notes}
                        onChange={updateCustomerField}
                        placeholder={t("checkout:notesPlaceholder")}
                      />
                    </div>
                  </div>
                </section>

                <section className="border border-[#f5f0e8]/12 bg-[#0f0d0c] p-4 sm:p-5">
                  <SectionLabel>{t("checkout:payment")}</SectionLabel>

                  <h2 className="mb-5 font-serif text-2xl font-semibold">
                    {t("checkout:paymentMethod")}
                  </h2>

                  {isLoadingSettings && (
                    <p className="text-sm text-[#f5f0e8]/45">
                      {t("checkout:loadingPayments")}
                    </p>
                  )}

                  {!isLoadingSettings && availablePayments.length === 0 && (
                    <div className="border border-[#b8585d]/45 bg-[#882c30]/18 px-4 py-3 text-sm text-[#f5d7d8]">
                      {t("checkout:noPayments")}
                    </div>
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    {availablePayments.map((payment) => {
                      const isSelected =
                        effectivePaymentMethod === payment.method;
                      const isPaymobPayment = payment.method === "paymobCard";
                      const isPaymobDisabled =
                        isPaymobPayment &&
                        (!isPaymobReady || isLoadingPaymobConfig);

                      return (
                        <button
                          key={payment.method}
                          type="button"
                          disabled={isPaymobDisabled}
                          onClick={() => handlePaymentChange(payment.method)}
                          aria-pressed={isSelected}
                          className={`min-h-24 border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                            isSelected
                              ? "border-[#c7a852] bg-[#882c30]/22"
                              : "border-[#f5f0e8]/12 bg-[#f5f0e8]/3 hover:border-[#f5f0e8]/30"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-serif text-lg font-semibold text-[#f5f0e8]">
                                {payment.label}
                              </p>

                              {payment.instructions && (
                                <p className="mt-2 text-xs leading-6 text-[#f5f0e8]/45">
                                  {payment.instructions}
                                </p>
                              )}

                              {isPaymobPayment && isLoadingPaymobConfig && (
                                <p className="mt-2 text-xs font-bold text-yellow-100">
                                  {t("checkout:checkingVisa")}
                                </p>
                              )}

                              {isPaymobPayment &&
                                !isLoadingPaymobConfig &&
                                !isPaymobReady && (
                                  <p className="mt-2 text-xs font-bold text-yellow-100">
                                    {t("checkout:paymobMissing")}
                                  </p>
                                )}

                              {isPaymobPayment &&
                                !isLoadingPaymobConfig &&
                                isPaymobReady && (
                                  <p className="mt-2 text-xs font-bold text-emerald-100">
                                    {t("checkout:paymobReady")}
                                  </p>
                                )}
                            </div>

                            <span
                              className={`mt-1 h-4 w-4 rounded-full border ${
                                isSelected
                                  ? "border-[#c7a852] bg-[#c7a852]"
                                  : "border-[#f5f0e8]/25"
                              }`}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {effectivePaymentMethod === "instapay" && (
                    <div className="mt-4 border border-[#c7a852]/25 bg-[#c7a852]/6 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                        {manualPayment.detailLabels?.instapay ||
                          t("checkout:instapayDetails")}
                      </p>

                      {manualPayment.detailInstructions?.instapay && (
                        <p className="mt-3 text-sm leading-7 text-[#f5f0e8]/58">
                          {manualPayment.detailInstructions.instapay}
                        </p>
                      )}

                      <p className="mt-3 font-serif text-xl font-semibold text-[#f5f0e8]">
                        {manualPayment.instapayHandle ||
                          t("checkout:instapayMissing")}
                      </p>

                      {requiresReference && (
                        <div className="mt-4">
                          <Input
                            label={t("checkout:transactionReference")}
                            value={paymentReference}
                            onChange={(event) =>
                              setPaymentReference(event.target.value)
                            }
                            placeholder={t("checkout:transactionPlaceholder")}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {effectivePaymentMethod === "vodafoneCash" && (
                    <div className="mt-4 border border-[#c7a852]/25 bg-[#c7a852]/6 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                        {manualPayment.detailLabels?.vodafoneCash ||
                          t("checkout:vodafoneDetails")}
                      </p>

                      {manualPayment.detailInstructions?.vodafoneCash && (
                        <p className="mt-3 text-sm leading-7 text-[#f5f0e8]/58">
                          {manualPayment.detailInstructions.vodafoneCash}
                        </p>
                      )}

                      <p className="mt-3 font-serif text-xl font-semibold text-[#f5f0e8]">
                        {manualPayment.vodafoneCashNumber ||
                          t("checkout:vodafoneMissing")}
                      </p>

                      {requiresReference && (
                        <div className="mt-4">
                          <Input
                            label={t("checkout:transactionReference")}
                            value={paymentReference}
                            onChange={(event) =>
                              setPaymentReference(event.target.value)
                            }
                            placeholder={t("checkout:transactionPlaceholder")}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {effectivePaymentMethod === "paymobCard" &&
                    isPaymobReady && (
                    <div className="mt-4 border border-[#c7a852]/30 bg-[#c7a852]/10 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                        {t("checkout:secureCard")}
                      </p>

                      <p className="mt-3 text-sm leading-7 text-[#f5f0e8]/65">
                        {t("checkout:secureCardDescription")}
                      </p>
                    </div>
                  )}
                </section>
              </div>

              <div className="lg:sticky lg:top-24">
                <aside className="border border-[#f5f0e8]/12 bg-[#110f0e]/72 p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h2 className="text-[0.64rem] font-black uppercase tracking-[0.24em] text-[#c7a852]">
                      {t("checkout:summary")}
                    </h2>
                    <span className="text-xs font-bold text-[#f5f0e8]/48">
                      {cartCount} {t("common:items")}
                    </span>
                  </div>

                  {(isQuotePending || isQuoteRefreshing) && (
                    <div className="mb-4 border border-[#f5f0e8]/12 bg-[#f5f0e8]/4 px-3 py-2 text-xs text-[#f5f0e8]/45">
                      {isQuotePending
                        ? t("common:updatingTotals")
                        : t("common:refreshingTotals")}
                    </div>
                  )}

                  <div className="space-y-3">
                    {items.map((item, index) => {
                      const quoteLookupKey = `${item.productId}__${
                        item.color?.key || item.color?.name
                      }__${item.size?.label}`;
                      const quoteItem =
                        quoteItemsByKey.get(quoteLookupKey) ||
                        quote?.items?.[index];
                      const quantity = Number(item.quantity || 0);
                      const hasQuoteItem = Boolean(quoteItem);
                      const itemOfferDiscountTotal = Number(
                        quoteItem?.itemOfferDiscountTotal || 0
                      );
                      const originalUnitPrice = Number(
                        quoteItem?.originalUnitPrice || item.price || 0
                      );
                      const finalUnitPrice = Number(
                        quoteItem?.finalUnitPrice || item.price || 0
                      );
                      const itemOfferDiscount = Number(
                        quoteItem?.itemOfferDiscount ||
                          Math.max(originalUnitPrice - finalUnitPrice, 0)
                      );
                      const hasItemOffer =
                        hasQuoteItem &&
                        (itemOfferDiscountTotal > 0 ||
                          itemOfferDiscount > 0 ||
                          originalUnitPrice > finalUnitPrice ||
                          Boolean(quoteItem?.appliedOfferTitle));
                      const finalLineTotal = hasQuoteItem
                        ? finalUnitPrice * quantity
                        : 0;
                      const itemQuoteStatus = isQuotePending
                        ? t("common:updating")
                        : t("common:unavailable");
                      const displayImage = getCartItemImage(item);

                      return (
                      <div
                        key={`${item.productId}-${item.color?.key}-${item.size?.label}`}
                        className="flex gap-3 border-b border-[#f5f0e8]/10 pb-3"
                      >
                        <div className="h-16 w-12 shrink-0 overflow-hidden border border-[#f5f0e8]/12 bg-[#28231f]">
                          {displayImage ? (
                            <img
                              src={displayImage}
                              alt={item.name}
                              onError={hideBrokenImage}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="h-full w-full bg-white/5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-serif text-sm font-semibold text-[#f5f0e8]">
                            {item.name}
                          </p>

                          <p className="mt-1 text-[0.72rem] text-[#f5f0e8]/40">
                            {item.color?.name} / {item.size?.label} x{" "}
                            {item.quantity}
                          </p>

                          <p className="mt-1 text-sm font-bold text-[#c7a852]">
                            {hasQuoteItem
                              ? formatMoney(finalLineTotal)
                              : itemQuoteStatus}
                          </p>
                          {hasItemOffer && (
                            <>
                              <p className="mt-1 text-[0.68rem] text-[#8b8075] line-through">
                                {formatMoney(originalUnitPrice * quantity)}
                              </p>
                              <p className="mt-2 text-[0.58rem] font-black uppercase tracking-[0.14em] text-[#c7a852]">
                                {quoteItem?.appliedOfferTitle ||
                                  t("common:offer")}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>

                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-white/45">
                        {t("common:subtotal")}
                      </span>
                      <span className="font-bold">
                        {formatQuotedMoney(summary.subtotal)}
                      </span>
                    </div>

                    {hasCurrentQuote && summary.productSavings > 0 && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-white/45">
                          {t("common:productSavings")}
                        </span>
                        <span className="font-bold text-emerald-100">
                          -{formatQuotedMoney(summary.productSavings)}
                        </span>
                      </div>
                    )}

                    {hasCurrentQuote && summary.appliedBundles.length > 0 && (
                      <div className="border-l-2 border-[#c7a852] bg-[#c7a852]/7 p-3">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#c7a852]">
                          {t("checkout:bundlesApplied")}
                        </p>

                        <div className="mt-2 space-y-1">
                          {summary.appliedBundles.map((bundle) => (
                            <p
                              key={`${bundle.slug}-${bundle.discountAmount}`}
                              className="text-xs text-[#f5f0e8]/68"
                            >
                              {bundle.title}: -
                              {formatMoney(bundle.discountAmount)}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {hasCurrentQuote && summary.bundleDiscountTotal > 0 && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-white/45">
                          {t("common:bundleDiscount")}
                        </span>
                        <span className="font-bold text-emerald-100">
                          -{formatQuotedMoney(summary.bundleDiscountTotal)}
                        </span>
                      </div>
                    )}

                    {hasCurrentQuote && summary.appliedOffers.length > 0 && (
                      <div className="border-l-2 border-[#c7a852] bg-[#c7a852]/7 p-3">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#c7a852]">
                          {t("checkout:offersApplied")}
                        </p>

                        <div className="mt-2 space-y-1">
                          {summary.appliedOffers.map((offer) => (
                            <p
                              key={`${offer.slug}-${offer.discountAmount}`}
                              className="text-xs text-[#f5f0e8]/68"
                            >
                              {offer.title}
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

                    {hasCurrentQuote && summary.offerDiscountTotal > 0 && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-white/45">
                          {t("common:offerDiscount")}
                        </span>
                        <span className="font-bold text-emerald-100">
                          -{formatQuotedMoney(summary.offerDiscountTotal)}
                        </span>
                      </div>
                    )}

                    <div className="border border-[#c7a852]/22 bg-[#c7a852]/5 p-3">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                        {t("common:discountCode")}
                      </p>

                      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                        <Input
                          label={t("checkout:code")}
                          value={discountCode}
                          onChange={(event) => {
                            setDiscountCode(
                              event.target.value
                                .toUpperCase()
                                .replace(/\s+/g, "")
                            );
                            setAppliedDiscountCode("");
                            setDiscountError("");
                          }}
                          placeholder="DAVINTO10"
                        />

                        <div className="flex items-end gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={handleApplyDiscount}
                            disabled={validateDiscountMutation.isPending}
                            className="min-h-11 px-4"
                          >
                            {validateDiscountMutation.isPending
                              ? t("common:checking")
                              : t("common:apply")}
                          </Button>

                          {appliedDiscountCode && (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={handleRemoveDiscount}
                              className="min-h-11 px-4"
                            >
                              {t("common:remove")}
                            </Button>
                          )}
                        </div>
                      </div>

                      {discountError && (
                        <p className="mt-3 text-xs leading-6 text-red-100">
                          {discountError}
                        </p>
                      )}

                      {appliedDiscountCode && hasCurrentQuote && (
                        <p className="mt-3 text-xs leading-6 text-emerald-100">
                          {t("checkout:applied", {
                            code: appliedDiscountCode,
                            amount: formatQuotedMoney(summary.discountTotal),
                          })}
                        </p>
                      )}
                    </div>

                    {hasCurrentQuote && summary.discountTotal > 0 && (
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-white/45">
                          {t("common:discountCode")}
                        </span>
                        <span className="font-bold text-emerald-100">
                          -{formatQuotedMoney(summary.discountTotal)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-white/45">
                        {t("common:delivery")}
                        {summary.deliverySnapshot?.freeDeliveryApplied && (
                          <span className="ml-2 text-emerald-100">
                            {t("common:free")}
                          </span>
                        )}
                      </span>

                      <span className="font-bold">
                        {formatQuotedMoney(summary.deliveryFee)}
                      </span>
                    </div>

                    <div className="border-t border-[#c7a852]/25 pt-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-[#8b8075]">
                          {t("common:total")}
                        </span>
                        <span className="font-serif text-2xl font-semibold">
                          {formatQuotedMoney(summary.total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="mt-5 w-full"
                    disabled={
                      createOrderMutation.isPending ||
                      isLoadingSettings ||
                      !hasCurrentQuote ||
                      isFetchingQuote ||
                      availablePayments.length === 0 ||
                      (effectivePaymentMethod === "paymobCard" &&
                        !isPaymobReady)
                    }
                  >
                    {createOrderMutation.isPending
                      ? effectivePaymentMethod === "paymobCard"
                        ? t("checkout:openingPayment")
                        : t("checkout:creatingOrder")
                      : effectivePaymentMethod === "paymobCard"
                        ? t("checkout:placeAndPay")
                        : t("checkout:placeOrder")}
                  </Button>

                  <p className="mt-4 border-t border-[#f5f0e8]/10 pt-4 text-xs leading-6 text-[#f5f0e8]/35">
                    {t("checkout:verificationNote")}
                  </p>
                </aside>
              </div>
            </form>
          )}
        </Container>
      </section>
    </>
  );
};

export default Checkout;
