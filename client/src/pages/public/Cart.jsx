import { Link } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Container from "../../components/ui/Container";
import PageHeader from "../../components/ui/PageHeader";
import SectionLabel from "../../components/ui/SectionLabel";
import useSeo from "../../hooks/useSeo";

import { useCart } from "../../context/cartContext";
import { createQuoteRequest } from "../../services/quoteService";
import {
  getLocalizedBundle,
  getLocalizedOffer,
} from "../../utils/localizedContent";
import { formatCurrency } from "../../utils/translatedLabels";

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

const buildQuoteItemKey = (item) => {
  return `${item.product}__${item.color?.key || item.color?.name}__${
    item.size?.label
  }`;
};

const Cart = () => {
  const { t, i18n } = useTranslation(["cart", "common"]);
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";

  // SEO
  useSeo({
    title: language === "ar" 
      ? "سلتك | متجر دافينتو" 
      : "Your Cart | Davinto Store",
    description: language === "ar"
      ? "راجع سلتك قبل الدفع في متجر دافينتو."
      : "Review your Davinto cart before checkout.",
    robots: "noindex,nofollow",
  });
  const formatMoney = (value) => formatCurrency(value, language);
  const eachLabel =
    t("common:each", {
      price: "",
      defaultValue: "each",
    }).trim() || "each";
  const {
    items,
    cartCount,
    subtotal,
    savings,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    clearCart,
    getCartItemKey,
  } = useCart();

  const quoteItems = useMemo(() => buildQuoteItems(items), [items]);

  const {
    data: quoteData,
    isLoading: isLoadingQuote,
    isError: isQuoteError,
    error: quoteError,
  } = useQuery({
    queryKey: ["cart-quote", quoteItems],
    queryFn: () =>
      createQuoteRequest({
        items: quoteItems,
      }),
    enabled: items.length > 0,
    retry: 1,
  });

  const quote = quoteData?.quote;
  const summary = {
    subtotal: quote?.subtotal ?? subtotal,
    productSavings: quote?.productSavings ?? savings,
    bundleDiscountTotal: quote?.bundleDiscountTotal ?? 0,
    offerDiscountTotal: quote?.offerDiscountTotal ?? 0,
    totalDiscount: quote?.totalDiscount ?? 0,
    totalBeforeDelivery:
      quote?.subtotal !== undefined
        ? Math.max(
            Number(quote.subtotal || 0) - Number(quote.totalDiscount || 0),
            0
          )
        : subtotal,
    appliedBundles: (quote?.appliedBundles || []).map((bundle) =>
      getLocalizedBundle(bundle, language)
    ),
    appliedOffers: (quote?.appliedOffers || []).map((offer) =>
      getLocalizedOffer(offer, language)
    ),
  };
  const quoteItemsByKey = useMemo(() => {
    const entries = quote?.items || [];

    return new Map(entries.map((item) => [buildQuoteItemKey(item), item]));
  }, [quote?.items]);

  const deliveryPreview = subtotal > 0 ? 0 : 0;
  const totalPreview = summary.totalBeforeDelivery + deliveryPreview;

  return (
    <>
      <PageHeader
        label={t("cart:label")}
        title={t("cart:title")}
        description={t("cart:description")}
      />

      <section className="fashion-section">
        <Container>
          {items.length === 0 ? (
            <Card className="py-14 text-center sm:py-20">
              <SectionLabel className="justify-center">
                {t("cart:emptyLabel")}
              </SectionLabel>
              <h2 className="editorial-heading text-6xl sm:text-8xl">
                {t("cart:emptyTitle")}
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-sm leading-8 text-[#f5f0e8]/52">
                {t("cart:emptyDescription")}
              </p>
              <div className="mt-9">
                <Link to="/shop">
                  <Button>{t("cart:explore")}</Button>
                </Link>
              </div>
            </Card>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1fr_390px] lg:items-start">
              <div>
                <div className="mb-7 flex flex-col gap-4 border-y border-[#f5f0e8]/12 py-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[0.62rem] font-black uppercase tracking-[0.28em] text-[#c7a852]">
                      {t("cart:totalItems", { count: cartCount })}
                    </p>
                    <h2 className="mt-2 font-serif text-3xl">
                      {t("cart:currentSelection")}
                    </h2>
                  </div>

                  <Button variant="ghost" onClick={clearCart}>
                    {t("cart:clear")}
                  </Button>
                </div>

                <div className="divide-y divide-[#f5f0e8]/12 border-t border-[#f5f0e8]/12">
                  {items.map((item, index) => {
                    const itemKey = getCartItemKey(item);
                    const quoteItem =
                      quoteItemsByKey.get(itemKey) || quote?.items?.[index];
                    const lineTotal =
                      Number(item.price || 0) * Number(item.quantity || 0);
                    const itemOfferDiscountTotal = Number(
                      quoteItem?.itemOfferDiscountTotal || 0
                    );
                    const itemOfferDiscount = Number(
                      quoteItem?.itemOfferDiscount || 0
                    );
                    const hasItemOffer = itemOfferDiscountTotal > 0;
                    const originalUnitPrice = Number(
                      quoteItem?.originalUnitPrice || item.price || 0
                    );
                    const finalUnitPrice = Number(
                      quoteItem?.finalUnitPrice || item.price || 0
                    );
                    const finalLineTotal = hasItemOffer
                      ? Math.max(lineTotal - itemOfferDiscountTotal, 0)
                      : lineTotal;
                    const appliedOfferTitle =
                      quoteItem?.appliedOfferTitle ||
                      t("common:offer", { defaultValue: "Offer" });
                    const maxStock = Number(item.maxStock || 1);
                    const canIncrease = Number(item.quantity || 1) < maxStock;

                    return (
                      <article
                        key={itemKey}
                        className="grid gap-5 py-6 sm:grid-cols-[150px_1fr]"
                      >
                        <Link
                          to={`/product/${item.slug}`}
                          className="relative aspect-[3/4] overflow-hidden border border-[#f5f0e8]/12 bg-[#28231f]"
                        >
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover transition duration-500 hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[0.58rem] font-black uppercase tracking-[0.22em] text-[#8b8075]">
                              {t("common:imagePending")}
                            </div>
                          )}
                          <span className="absolute left-0 top-0 bg-[#c7a852] px-2.5 py-1.5 text-[0.55rem] font-black tracking-[0.18em] text-[#1c1917]">
                            0{index + 1}
                          </span>
                        </Link>

                        <div className="flex min-w-0 flex-col justify-between">
                          <div>
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-[0.58rem] font-black uppercase tracking-[0.22em] text-[#c7a852]">
                                  {item.category?.name || "Davinto"}
                                </p>
                                <Link to={`/product/${item.slug}`}>
                                  <h3 className="mt-2 font-serif text-3xl font-semibold transition hover:text-[#c7a852]">
                                    {item.name}
                                  </h3>
                                </Link>
                              </div>

                              <div className="sm:text-right">
                                {hasItemOffer ? (
                                  <div>
                                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#c7a852]">
                                      {formatMoney(finalUnitPrice)}{" "}
                                      {eachLabel}
                                    </p>
                                    <p className="mt-1 text-xs text-[#8b8075] line-through">
                                      {formatMoney(originalUnitPrice)}{" "}
                                      {eachLabel}
                                    </p>
                                    <p className="mt-2 font-serif text-xl font-semibold text-[#f5f0e8]">
                                      {formatMoney(finalLineTotal)}
                                    </p>
                                  </div>
                                ) : (
                                  <>
                                    <p className="font-serif text-xl font-semibold">
                                      {formatMoney(lineTotal)}
                                    </p>
                                    {item.compareAtPrice > item.price && (
                                      <p className="mt-1 text-xs text-[#8b8075] line-through">
                                        {formatMoney(item.compareAtPrice)}
                                      </p>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>

                            {hasItemOffer && (
                              <div className="mt-4 w-fit border border-[#c7a852]/30 bg-[#c7a852]/10 px-3 py-2 text-xs font-bold text-[#f5f0e8]/80">
                                <span className="font-black uppercase tracking-[0.14em] text-[#c7a852]">
                                  {appliedOfferTitle}
                                </span>
                                <span className="mx-2 text-[#8b8075]">/</span>
                                <span>
                                  -{formatMoney(itemOfferDiscount)}{" "}
                                  {eachLabel}
                                </span>
                              </div>
                            )}

                            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-y border-[#f5f0e8]/10 py-3 text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#f5f0e8]/48">
                              <span>
                                {t("common:color")} / {item.color?.name}
                              </span>
                              <span>
                                {t("common:size")} / {item.size?.label}
                              </span>
                              {item.size?.sku && (
                                <span>
                                  {t("common:sku")} / {item.size.sku}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                              <p className="mb-2 text-[0.56rem] font-black uppercase tracking-[0.2em] text-[#8b8075]">
                                {t("common:quantity")}
                              </p>
                              <div className="flex h-11 w-fit items-center border border-[#f5f0e8]/16">
                                <button
                                  type="button"
                                  onClick={() => decreaseQuantity(itemKey)}
                                  className="flex h-full w-11 items-center justify-center transition hover:bg-[#f5f0e8]/8"
                                  aria-label={t("cart:decreaseItem", {
                                    name: item.name,
                                  })}
                                >
                                  <Minus size={14} />
                                </button>
                                <span className="min-w-10 text-center text-sm font-black">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => increaseQuantity(itemKey)}
                                  disabled={!canIncrease}
                                  className="flex h-full w-11 items-center justify-center transition hover:bg-[#f5f0e8]/8 disabled:opacity-25"
                                  aria-label={t("cart:increaseItem", {
                                    name: item.name,
                                  })}
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <p className="text-xs text-[#8b8075]">
                                {t("cart:max", { count: maxStock })}
                              </p>
                              <button
                                type="button"
                                onClick={() => removeItem(itemKey)}
                                className="flex items-center gap-2 border-b border-[#b8585d] pb-1 text-[0.58rem] font-black uppercase tracking-[0.18em] text-[#e8a3a6] transition hover:text-[#f5d7d8]"
                              >
                                <Trash2 size={13} />
                                {t("common:remove")}
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <aside className="lg:sticky lg:top-32">
                <Card className="border-[#c7a852]/30 bg-[#110f0e] p-7">
                  <SectionLabel>{t("cart:summary")}</SectionLabel>

                  {isLoadingQuote && (
                    <div className="mb-4 border border-[#f5f0e8]/12 bg-[#f5f0e8]/4 px-4 py-3 text-xs text-[#f5f0e8]/45">
                      {t("common:calculating", {
                        defaultValue: "Calculating offers...",
                      })}
                    </div>
                  )}

                  {isQuoteError && (
                    <div className="mb-4 border border-[#b8585d]/45 bg-[#882c30]/18 px-4 py-3 text-xs text-[#f5d7d8]">
                      {quoteError?.friendlyMessage ||
                        quoteError?.message ||
                        "Could not refresh cart pricing."}
                    </div>
                  )}

                  {summary.appliedBundles.length > 0 && (
                    <div className="mb-4 border-l-2 border-[#c7a852] bg-[#c7a852]/7 p-3">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#c7a852]">
                        {t("common:bundleDiscount")}
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

                  {summary.appliedOffers.length > 0 && (
                    <div className="mb-4 border-l-2 border-[#c7a852] bg-[#c7a852]/7 p-3">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#c7a852]">
                        {t("common:offerDiscount")}
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
                                ? `: ${t("common:free")}`
                                : ""}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="divide-y divide-[#f5f0e8]/10 border-y border-[#f5f0e8]/10 text-sm">
                    {[
                      [t("common:items"), cartCount],
                      [t("common:subtotal"), formatMoney(summary.subtotal)],
                      [
                        t("common:productSavings"),
                        summary.productSavings > 0
                          ? `-${formatMoney(summary.productSavings)}`
                          : formatMoney(0),
                      ],
                      [
                        t("common:bundleDiscount"),
                        summary.bundleDiscountTotal > 0
                          ? `-${formatMoney(summary.bundleDiscountTotal)}`
                          : formatMoney(0),
                      ],
                      [
                        t("common:offerDiscount"),
                        summary.offerDiscountTotal > 0
                          ? `-${formatMoney(summary.offerDiscountTotal)}`
                          : formatMoney(0),
                      ],
                      [
                        t("common:delivery"),
                        deliveryPreview === 0
                          ? t("cart:calculatedLater")
                          : formatMoney(deliveryPreview),
                      ],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-4 py-4"
                      >
                        <span className="text-[#f5f0e8]/48">{label}</span>
                        <span
                          className={
                            label === t("common:productSavings")
                              ? "font-bold text-[#c7a852]"
                              : "font-bold"
                          }
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-end justify-between gap-4 py-6">
                    <span className="text-[0.62rem] font-black uppercase tracking-[0.24em] text-[#8b8075]">
                      {t("cart:estimatedTotal")}
                    </span>
                    <span className="font-serif text-3xl font-semibold">
                      {formatMoney(totalPreview)}
                    </span>
                  </div>

                  <div className="grid gap-3">
                    <Link to="/checkout">
                      <Button className="w-full">{t("cart:checkout")}</Button>
                    </Link>
                    <Link to="/shop">
                      <Button variant="secondary" className="w-full">
                        {t("cart:keepShopping")}
                      </Button>
                    </Link>
                  </div>

                  <p className="mt-5 border-t border-[#f5f0e8]/10 pt-5 text-xs leading-6 text-[#f5f0e8]/38">
                    {t("cart:secureNote")}
                  </p>
                </Card>
              </aside>
            </div>
          )}
        </Container>
      </section>
    </>
  );
};

export default Cart;
