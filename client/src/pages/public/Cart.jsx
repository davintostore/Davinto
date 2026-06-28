import { Link } from "react-router-dom";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import Button from "../../components/ui/Button";
import Container from "../../components/ui/Container";
import useFocusTrap from "../../hooks/useFocusTrap";
import useSeo from "../../hooks/useSeo";

import { useCart } from "../../context/cartContext";
import useStableQuote from "../../hooks/useStableQuote";
import { createQuoteRequest } from "../../services/quoteService";
import {
  getLocalizedBundle,
  getLocalizedOffer,
} from "../../utils/localizedContent";
import {
  buildCartQuoteSignature,
  buildQuoteItems,
  buildQuoteItemsByKey,
} from "../../utils/cartQuote";
import { formatCurrency } from "../../utils/translatedLabels";
import { hideBrokenImage } from "../../utils/imageFallback";
import { getCartItemImage } from "../../utils/resolveLocalImages";

const Cart = () => {
  const { t, i18n } = useTranslation(["cart", "common"]);
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);

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
  const {
    items,
    cartCount,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    clearCart,
    getCartItemKey,
  } = useCart();

  const quoteItems = useMemo(() => buildQuoteItems(items), [items]);
  const quoteSignature = useMemo(
    () => buildCartQuoteSignature({ items: quoteItems }),
    [quoteItems]
  );

  const {
    isLoading: isLoadingQuote,
    isFetching: isFetchingQuote,
    isError: isQuoteError,
    error: quoteError,
    refetch: refetchQuote,
    quote,
    isQuoteCalculating,
    hasCurrentQuote,
  } = useStableQuote({
    queryKey: ["cart-quote", quoteSignature],
    queryFn: () =>
      createQuoteRequest({
        items: quoteItems,
      }),
    enabled: items.length > 0,
    signature: quoteSignature,
    retry: 1,
    scope: "cart",
  });

  const summary = {
    subtotal: quote?.subtotal || 0,
    productSavings: quote?.productSavings || 0,
    bundleDiscountTotal: quote?.bundleDiscountTotal || 0,
    offerDiscountTotal: quote?.offerDiscountTotal || 0,
    totalDiscount: quote?.totalDiscount || 0,
    totalBeforeDelivery:
      quote?.subtotal !== undefined
        ? Math.max(
            Number(quote.subtotal || 0) - Number(quote.totalDiscount || 0),
            0
          )
        : 0,
    appliedBundles: (quote?.appliedBundles || []).map((bundle) =>
      getLocalizedBundle(bundle, language)
    ),
    appliedOffers: (quote?.appliedOffers || []).map((offer) =>
      getLocalizedOffer(offer, language)
    ),
  };
  const quoteItemsByKey = useMemo(
    () => buildQuoteItemsByKey(quote),
    [quote]
  );
  const isQuotePending =
    !hasCurrentQuote && (isQuoteCalculating || isFetchingQuote || isLoadingQuote);
  const quoteStatusText = isQuotePending
    ? t("common:updatingTotals", { defaultValue: "Updating totals..." })
    : t("common:totalsUnavailable", { defaultValue: "Totals unavailable" });
  const isQuoteRefreshing = hasCurrentQuote && isFetchingQuote;
  const formatQuotedMoney = (value) =>
    hasCurrentQuote ? formatMoney(value) : quoteStatusText;

  const handleClearCart = () => {
    clearCart();
    setIsClearConfirmOpen(false);
  };
  const clearConfirmRef = useFocusTrap({
    isActive: isClearConfirmOpen,
    onEscape: () => setIsClearConfirmOpen(false),
    lockScroll: true,
  });

  return (
    <>
      <div className="border-b border-[#c7a852]/20 bg-[#050505]">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Link
            to="/"
            aria-label="Davinto home"
            className="flex h-11 w-28 items-center"
          >
            <img
              src="/images/logo/logo-3.webp"
              alt="Davinto"
              className="max-h-10 w-full object-contain"
            />
          </Link>
          <Link
            to="/shop"
            className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-[#f5f0e8]/62 transition hover:text-[#c7a852]"
          >
            Back to shop
          </Link>
        </Container>
      </div>

      <section className="cart-page-section bg-[#050505]">
        <Container>
          <div className="mb-6 flex flex-col gap-3 border-b border-[#f5f0e8]/12 pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.58rem] font-black uppercase tracking-[0.22em] text-[#c7a852]">
                {t("cart:label")}
              </p>
              <h1 className="mt-2 font-serif text-4xl font-semibold text-[#f5f0e8] sm:text-5xl">
                {t("cart:title")}
              </h1>
            </div>
            {items.length > 0 && (
              <p className="text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#f5f0e8]/48">
                {t("cart:totalItems", { count: cartCount })}
              </p>
            )}
          </div>

          {items.length === 0 ? (
            <div className="fashion-panel px-5 py-12 text-center sm:px-8">
              <p className="text-[0.62rem] font-black uppercase tracking-[0.24em] text-[#c7a852]">
                {t("cart:emptyLabel")}
              </p>
              <h2 className="mt-4 font-serif text-4xl font-semibold text-[#f5f0e8] sm:text-5xl">
                {t("cart:emptyTitle")}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-[#f5f0e8]/52">
                {t("cart:emptyDescription")}
              </p>
              <div className="mt-7">
                <Link to="/shop">
                  <Button>{t("cart:explore")}</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
              <div className="min-w-0">
                <div className="hidden border-b border-[#f5f0e8]/12 pb-3 text-[0.58rem] font-black uppercase tracking-[0.2em] text-[#8b8075] md:grid md:grid-cols-[minmax(0,1fr)_110px_140px_120px_40px] md:gap-4">
                  <span>{t("common:items")}</span>
                  <span>{t("common:subtotal")}</span>
                  <span>{t("common:quantity")}</span>
                  <span className="text-right">{t("common:total")}</span>
                  <span className="sr-only">{t("common:remove")}</span>
                </div>

                <div className="divide-y divide-[#f5f0e8]/12">
                  {items.map((item, index) => {
                    const itemKey = getCartItemKey(item);
                    const quoteItem =
                      quoteItemsByKey.get(itemKey) || quote?.items?.[index];
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
                    const originalLineTotal = originalUnitPrice * quantity;
                    const itemQuoteStatus = isQuotePending
                      ? t("common:updating", { defaultValue: "Updating..." })
                      : t("common:unavailable", { defaultValue: "Unavailable" });
                    const appliedOfferTitle =
                      quoteItem?.appliedOfferTitle ||
                      t("common:offer", { defaultValue: "Offer" });
                    const maxStock = Number(item.maxStock || 1);
                    const canIncrease = Number(item.quantity || 1) < maxStock;
                    const displayImage = getCartItemImage(item);

                    return (
                      <article
                        key={itemKey}
                        className="grid gap-4 py-5 md:grid-cols-[minmax(0,1fr)_110px_140px_120px_40px] md:items-center md:gap-4"
                      >
                        <div className="flex min-w-0 gap-3">
                          <Link
                            to={`/product/${item.slug}`}
                            className="h-24 w-[4.5rem] shrink-0 overflow-hidden border border-[#f5f0e8]/12 bg-[#28231f]"
                          >
                            {displayImage ? (
                              <img
                                src={displayImage}
                                alt={item.name}
                                onError={hideBrokenImage}
                                className="h-full w-full object-cover transition duration-500 hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[0.52rem] font-black uppercase tracking-[0.16em] text-[#8b8075]">
                                {t("common:imagePending")}
                              </div>
                            )}
                          </Link>

                          <div className="min-w-0">
                            <p className="text-[0.54rem] font-black uppercase tracking-[0.18em] text-[#c7a852]">
                              {item.category?.name || "Davinto"}
                            </p>
                            <Link to={`/product/${item.slug}`}>
                              <h3 className="mt-1 line-clamp-2 font-serif text-xl font-semibold text-[#f5f0e8] transition hover:text-[#c7a852]">
                                {item.name}
                              </h3>
                            </Link>
                            <p className="mt-2 text-xs leading-5 text-[#f5f0e8]/48">
                              {t("common:color")}: {item.color?.name}
                              <span className="mx-2 text-[#8b8075]">/</span>
                              {t("common:size")}: {item.size?.label}
                            </p>
                            {hasItemOffer && (
                              <p className="mt-2 w-fit border border-[#c7a852]/25 bg-[#c7a852]/8 px-2 py-1 text-[0.54rem] font-black uppercase tracking-[0.14em] text-[#c7a852]">
                                {appliedOfferTitle} -
                                {formatMoney(itemOfferDiscount)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="mb-1 text-[0.55rem] font-black uppercase tracking-[0.18em] text-[#8b8075] md:hidden">
                            {t("common:subtotal")}
                          </p>
                          <p className="text-sm font-bold text-[#f5f0e8]">
                            {hasQuoteItem
                              ? formatMoney(finalUnitPrice)
                              : itemQuoteStatus}
                          </p>
                          {hasItemOffer && (
                            <p className="mt-1 text-xs text-[#8b8075] line-through">
                              {formatMoney(originalUnitPrice)}
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="mb-2 text-[0.55rem] font-black uppercase tracking-[0.18em] text-[#8b8075] md:hidden">
                            {t("common:quantity")}
                          </p>
                          <div className="flex h-10 w-fit items-center border border-[#f5f0e8]/16">
                            <button
                              type="button"
                              onClick={() => decreaseQuantity(itemKey)}
                              className="flex h-full w-10 items-center justify-center transition hover:bg-[#f5f0e8]/8"
                              aria-label={t("cart:decreaseItem", {
                                name: item.name,
                              })}
                            >
                              <Minus size={14} />
                            </button>
                            <span className="min-w-9 text-center text-sm font-black">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => increaseQuantity(itemKey)}
                              disabled={!canIncrease}
                              className="flex h-full w-10 items-center justify-center transition hover:bg-[#f5f0e8]/8 disabled:opacity-25"
                              aria-label={t("cart:increaseItem", {
                                name: item.name,
                              })}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <p className="mt-2 text-[0.68rem] text-[#8b8075]">
                            {t("cart:max", { count: maxStock })}
                          </p>
                        </div>

                        <div className="md:text-right">
                          <p className="mb-1 text-[0.55rem] font-black uppercase tracking-[0.18em] text-[#8b8075] md:hidden">
                            {t("common:total")}
                          </p>
                          <p className="font-serif text-xl font-semibold text-[#f5f0e8]">
                            {hasQuoteItem
                              ? formatMoney(finalLineTotal)
                              : itemQuoteStatus}
                          </p>
                          {hasItemOffer && (
                            <p className="mt-1 text-xs text-[#8b8075] line-through">
                              {formatMoney(originalLineTotal)}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => removeItem(itemKey)}
                          className="flex h-10 w-10 items-center justify-center border border-[#f5f0e8]/12 text-[#e8a3a6] transition hover:border-[#b8585d]/60 hover:text-[#f5d7d8]"
                          aria-label={`${t("common:remove")} ${item.name}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </article>
                    );
                  })}
                </div>

                <div className="mt-5 flex justify-end border-t border-[#f5f0e8]/12 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsClearConfirmOpen(true)}
                    className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-[#e8a3a6]/80 transition hover:text-[#f5d7d8]"
                  >
                    {t("cart:clear")}
                  </button>
                </div>
              </div>

              <aside className="border border-[#f5f0e8]/12 bg-[#110f0e]/72 p-5 lg:sticky lg:top-24">
                <h2 className="text-[0.64rem] font-black uppercase tracking-[0.24em] text-[#c7a852]">
                  {t("cart:summary")}
                </h2>

                {(isQuotePending || isQuoteRefreshing) && (
                  <div className="mt-4 border border-[#f5f0e8]/12 bg-[#f5f0e8]/4 px-3 py-2 text-xs text-[#f5f0e8]/45">
                    {t("common:updatingTotals", {
                      defaultValue: isQuotePending
                        ? "Updating totals..."
                        : "Refreshing totals...",
                    })}
                  </div>
                )}

                {isQuoteError && (
                  <div className="mt-4 border border-[#b8585d]/45 bg-[#882c30]/18 px-3 py-2 text-xs text-[#f5d7d8]">
                    {quoteError?.friendlyMessage ||
                      quoteError?.message ||
                      "Could not refresh cart pricing."}
                  </div>
                )}

                {hasCurrentQuote &&
                  (summary.appliedBundles.length > 0 ||
                  summary.appliedOffers.length > 0) && (
                  <div className="mt-4 space-y-2 border border-[#c7a852]/18 bg-[#c7a852]/5 p-3">
                    {summary.appliedBundles.map((bundle) => (
                      <p
                        key={`${bundle.slug}-${bundle.discountAmount}`}
                        className="text-xs text-[#f5f0e8]/68"
                      >
                        <span className="font-black uppercase tracking-[0.14em] text-[#c7a852]">
                          {t("common:bundleDiscount")}
                        </span>{" "}
                        {bundle.title}: -{formatMoney(bundle.discountAmount)}
                      </p>
                    ))}
                    {summary.appliedOffers.map((offer) => (
                      <p
                        key={`${offer.slug}-${offer.discountAmount}`}
                        className="text-xs text-[#f5f0e8]/68"
                      >
                        <span className="font-black uppercase tracking-[0.14em] text-[#c7a852]">
                          {t("common:offerDiscount")}
                        </span>{" "}
                        {offer.title}
                        {offer.discountAmount > 0
                          ? `: -${formatMoney(offer.discountAmount)}`
                          : offer.freeDeliveryApplied
                            ? `: ${t("common:free")}`
                            : ""}
                      </p>
                    ))}
                  </div>
                )}

                <div className="mt-5 space-y-3 border-y border-[#f5f0e8]/10 py-4 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#f5f0e8]/48">
                      {t("common:items")}
                    </span>
                    <span className="font-bold">{cartCount}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#f5f0e8]/48">
                      {t("common:subtotal")}
                    </span>
                    <span className="font-bold">
                      {formatQuotedMoney(summary.subtotal)}
                    </span>
                  </div>
                  {hasCurrentQuote && summary.productSavings > 0 && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[#f5f0e8]/48">
                        {t("common:productSavings")}
                      </span>
                      <span className="font-bold text-[#c7a852]">
                        -{formatMoney(summary.productSavings)}
                      </span>
                    </div>
                  )}
                  {hasCurrentQuote && summary.bundleDiscountTotal > 0 && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[#f5f0e8]/48">
                        {t("common:bundleDiscount")}
                      </span>
                      <span className="font-bold text-[#c7a852]">
                        -{formatMoney(summary.bundleDiscountTotal)}
                      </span>
                    </div>
                  )}
                  {hasCurrentQuote && summary.offerDiscountTotal > 0 && (
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[#f5f0e8]/48">
                        {t("common:offerDiscount")}
                      </span>
                      <span className="font-bold text-[#c7a852]">
                        -{formatMoney(summary.offerDiscountTotal)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[#f5f0e8]/48">
                      {t("common:delivery")}
                    </span>
                    <span className="font-bold">
                      {t("cart:calculatedLater")}
                    </span>
                  </div>
                </div>

                <div className="flex items-end justify-between gap-4 py-5">
                  <span className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-[#8b8075]">
                    {t("cart:estimatedTotal")}
                  </span>
                  <span className="font-serif text-3xl font-semibold text-[#f5f0e8]">
                    {formatQuotedMoney(summary.totalBeforeDelivery)}
                  </span>
                </div>

                <div className="grid gap-3">
                  {isQuotePending ? (
                    <Button className="w-full" disabled>
                      {t("common:updatingTotals", {
                        defaultValue: "Updating totals...",
                      })}
                    </Button>
                  ) : (
                    <Link to="/checkout">
                      <Button className="w-full">{t("cart:checkout")}</Button>
                    </Link>
                  )}
                  {isQuoteError && !isQuotePending && (
                    <button
                      type="button"
                      onClick={() => refetchQuote()}
                      className="text-[0.58rem] font-black uppercase tracking-[0.18em] text-[#c7a852] transition hover:text-[#f5f0e8]"
                    >
                      {t("common:tryAgain", { defaultValue: "Try again" })}
                    </button>
                  )}
                  <Link to="/shop">
                    <Button variant="secondary" className="w-full">
                      {t("cart:keepShopping")}
                    </Button>
                  </Link>
                </div>

                <p className="mt-4 border-t border-[#f5f0e8]/10 pt-4 text-xs leading-6 text-[#f5f0e8]/38">
                  {t("cart:secureNote")}
                </p>
              </aside>
            </div>
          )}
        </Container>
      </section>

      {isClearConfirmOpen && (
        <div
          ref={clearConfirmRef}
          className="fixed inset-0 z-[90] grid place-items-center bg-[#050505]/78 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-cart-dialog-title"
          aria-describedby="clear-cart-dialog-message"
          tabIndex={-1}
        >
          <div className="w-full max-w-md border border-[#c7a852]/28 bg-[#110f0e] p-6 shadow-2xl">
            <p
              id="clear-cart-dialog-title"
              className="font-serif text-3xl font-semibold text-[#f5f0e8]"
            >
              Clear cart?
            </p>
            <p
              id="clear-cart-dialog-message"
              className="mt-3 text-sm leading-7 text-[#f5f0e8]/58"
            >
              This will remove all items from your cart.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsClearConfirmOpen(false)}
                data-autofocus
              >
                Cancel
              </Button>
              <Button type="button" variant="danger" onClick={handleClearCart}>
                Clear Cart
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Cart;
