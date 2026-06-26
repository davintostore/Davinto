import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Container from "../../components/ui/Container";
import Input from "../../components/ui/Input";
import PageHeader from "../../components/ui/PageHeader";
import SectionLabel from "../../components/ui/SectionLabel";
import Select from "../../components/ui/Select";
import Textarea from "../../components/ui/Textarea";
import useSeo from "../../hooks/useSeo";

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
import { egyptGovernorates } from "../../utils/governorates";

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

const buildQuoteItems = (items) => {
  return items.map((item) => ({
    productId: item.productId,
    color: {
      id: item.color?.id || "",
      key: item.color?.key || "",
      name: item.color?.name || "",
      slug: item.color?.slug || "",
    },
    size: {
      id: item.size?.id || "",
      label: item.size?.label || "",
      sku: item.size?.sku || "",
    },
    quantity: Number(item.quantity || 1),
  }));
};

const Checkout = () => {
  const { t, i18n } = useTranslation(["checkout", "common", "navigation"]);
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const formatMoney = (value) => formatCurrency(value, language);
  const navigate = useNavigate();
  const initiateCheckoutTrackedRef = useRef(false);
  const { customer } = useCustomerAuth();

  // SEO
  useSeo({
    title: language === "ar" 
      ? "الدفع | متجر دافينتو" 
      : "Checkout | Davinto Store",
    description: language === "ar"
      ? "أكمل طلبك من متجر دافينتو مع خيارات التوصيل عبر جميع أنحاء مصر."
      : "Complete your Davinto order with delivery across Egypt.",
    robots: "noindex,nofollow",
  });

  const {
    items,
    cartCount,
    subtotal: localSubtotal,
    savings: localSavings,
    clearCart,
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
    data: quoteData,
    isLoading: isLoadingQuote,
    isError: isQuoteError,
    error: quoteError,
    refetch: refetchQuote,
  } = useQuery({
    queryKey: [
      "checkout-quote",
      quoteItems,
      appliedDiscountCode,
      deliveryZone,
    ],
    queryFn: () =>
      createQuoteRequest({
        items: quoteItems,
        discountCode: appliedDiscountCode,
        deliveryZone,
      }),
    enabled: items.length > 0,
    retry: 1,
  });

  const quote = quoteData?.quote;
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
    subtotal: quote?.subtotal ?? localSubtotal,
    productSavings: quote?.productSavings ?? localSavings,
    bundleDiscountTotal: quote?.bundleDiscountTotal ?? 0,
    offerDiscountTotal: quote?.offerDiscountTotal ?? 0,
    discountTotal: quote?.discountTotal ?? 0,
    totalDiscount: quote?.totalDiscount ?? 0,
    deliveryFee: quote?.deliveryFee ?? 0,
    total: quote?.total ?? localSubtotal,
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

  useEffect(() => {
    if (!items.length || initiateCheckoutTrackedRef.current) return;

    initiateCheckoutTrackedRef.current = true;

    trackInitiateCheckout({
      items,
      value: summary.total,
    });
  }, [items, summary.total]);

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
    refetchQuote();
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
      <PageHeader
        label={t("checkout:headerLabel")}
        title={t("checkout:headerTitle")}
        description={t("checkout:headerDescription")}
      />

      <section className="fashion-section">
        <Container>
          {items.length === 0 ? (
            <Card className="py-14 text-center">
              <SectionLabel className="justify-center">
                {t("navigation:checkout", { defaultValue: "Checkout" })}
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
              className="grid gap-8 lg:grid-cols-[1fr_430px] lg:items-start"
            >
              <div className="space-y-6">
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

                <Card className="p-6 sm:p-8">
                  <SectionLabel>{t("checkout:customer")}</SectionLabel>

                  <h2 className="mb-7 font-serif text-3xl font-semibold">
                    {t("checkout:deliveryDetails")}
                  </h2>

                  <div className="grid gap-4 md:grid-cols-2">
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
                </Card>

                <Card className="p-6 sm:p-8">
                  <SectionLabel>{t("checkout:payment")}</SectionLabel>

                  <h2 className="mb-7 font-serif text-3xl font-semibold">
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
                          className={`min-h-32 border p-5 text-left transition disabled:cursor-not-allowed disabled:opacity-45 ${
                            isSelected
                              ? "border-[#c7a852] bg-[#882c30]/22"
                              : "border-[#f5f0e8]/12 bg-[#f5f0e8]/3 hover:border-[#f5f0e8]/30"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-serif text-xl font-semibold text-[#f5f0e8]">
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
                    <div className="mt-5 border border-[#c7a852]/25 bg-[#c7a852]/6 p-5">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                        {manualPayment.detailLabels?.instapay ||
                          t("checkout:instapayDetails")}
                      </p>

                      {manualPayment.detailInstructions?.instapay && (
                        <p className="mt-3 text-sm leading-7 text-[#f5f0e8]/58">
                          {manualPayment.detailInstructions.instapay}
                        </p>
                      )}

                      <p className="mt-3 font-serif text-2xl font-semibold text-[#f5f0e8]">
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
                    <div className="mt-5 border border-[#c7a852]/25 bg-[#c7a852]/6 p-5">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                        {manualPayment.detailLabels?.vodafoneCash ||
                          t("checkout:vodafoneDetails")}
                      </p>

                      {manualPayment.detailInstructions?.vodafoneCash && (
                        <p className="mt-3 text-sm leading-7 text-[#f5f0e8]/58">
                          {manualPayment.detailInstructions.vodafoneCash}
                        </p>
                      )}

                      <p className="mt-3 font-serif text-2xl font-semibold text-[#f5f0e8]">
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
                    <div className="mt-5 border border-[#c7a852]/30 bg-[#c7a852]/10 p-5">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-[#c7a852]">
                        {t("checkout:secureCard")}
                      </p>

                      <p className="mt-3 text-sm leading-7 text-[#f5f0e8]/65">
                        {t("checkout:secureCardDescription")}
                      </p>
                    </div>
                  )}
                </Card>
              </div>

              <div className="lg:sticky lg:top-28">
                <Card className="border-[#c7a852]/30 bg-[#110f0e] p-6">
                  <SectionLabel>{t("checkout:summary")}</SectionLabel>

                  {isLoadingQuote && (
                    <div className="mb-4 border border-[#f5f0e8]/12 bg-[#f5f0e8]/4 px-4 py-3 text-xs text-[#f5f0e8]/45">
                      {t("checkout:calculating")}
                    </div>
                  )}

                  <div className="space-y-4">
                    {items.map((item) => (
                      <div
                        key={`${item.productId}-${item.color?.key}-${item.size?.label}`}
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

                          <p className="mt-1 text-xs text-[#f5f0e8]/40">
                            {item.color?.name} / {item.size?.label} ×{" "}
                            {item.quantity}
                          </p>

                          <p className="mt-2 text-sm font-bold text-[#c7a852]">
                            {formatMoney(
                              Number(item.price || 0) *
                                Number(item.quantity || 0)
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 space-y-4 text-sm">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-white/45">
                        {t("common:items")}
                      </span>
                      <span className="font-bold">
                        {quote?.cartQuantity || cartCount}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-white/45">
                        {t("common:subtotal")}
                      </span>
                      <span className="font-bold">
                        {formatMoney(summary.subtotal)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-white/45">
                        {t("common:productSavings")}
                      </span>
                      <span className="font-bold text-emerald-100">
                        {summary.productSavings > 0
                          ? `-${formatMoney(summary.productSavings)}`
                          : formatMoney(0)}
                      </span>
                    </div>

                    {summary.appliedBundles.length > 0 && (
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

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-white/45">
                        {t("common:bundleDiscount")}
                      </span>
                      <span className="font-bold text-emerald-100">
                        {summary.bundleDiscountTotal > 0
                          ? `-${formatMoney(summary.bundleDiscountTotal)}`
                          : formatMoney(0)}
                      </span>
                    </div>

                    {summary.appliedOffers.length > 0 && (
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

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-white/45">
                        {t("common:offerDiscount")}
                      </span>
                      <span className="font-bold text-emerald-100">
                        {summary.offerDiscountTotal > 0
                          ? `-${formatMoney(summary.offerDiscountTotal)}`
                          : formatMoney(0)}
                      </span>
                    </div>

                    <div className="border border-[#c7a852]/22 bg-[#c7a852]/5 p-4">
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

                      {appliedDiscountCode && (
                        <p className="mt-3 text-xs leading-6 text-emerald-100">
                          {t("checkout:applied", {
                            code: appliedDiscountCode,
                            amount: formatMoney(summary.discountTotal),
                          })}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <span className="text-white/45">
                        {t("common:discountCode")}
                      </span>
                      <span className="font-bold text-emerald-100">
                        {summary.discountTotal > 0
                          ? `-${formatMoney(summary.discountTotal)}`
                          : formatMoney(0)}
                      </span>
                    </div>

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
                        {formatMoney(summary.deliveryFee)}
                      </span>
                    </div>

                    {summary.deliverySnapshot?.notes && (
                      <p className="border border-[#f5f0e8]/10 bg-[#f5f0e8]/3 p-3 text-xs leading-6 text-[#f5f0e8]/45">
                        {summary.deliverySnapshot.notes}
                      </p>
                    )}

                    <div className="border-t border-[#c7a852]/25 pt-5">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[0.65rem] font-black uppercase tracking-[0.22em] text-[#8b8075]">
                          {t("common:total")}
                        </span>
                        <span className="font-serif text-3xl font-semibold">
                          {formatMoney(summary.total)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="mt-7 w-full"
                    disabled={
                      createOrderMutation.isPending ||
                      isLoadingSettings ||
                      isLoadingQuote ||
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

                  <p className="mt-5 border-t border-[#f5f0e8]/10 pt-5 text-xs leading-6 text-[#f5f0e8]/35">
                    {t("checkout:verificationNote")}
                  </p>
                </Card>
              </div>
            </form>
          )}
        </Container>
      </section>
    </>
  );
};

export default Checkout;
