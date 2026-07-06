import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import Button from "../ui/Button";
import { useCart } from "../../context/cartContext";
import useFocusTrap from "../../hooks/useFocusTrap";
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

const CartDrawer = () => {
  const { t, i18n } = useTranslation(["cart", "common"]);
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const formatMoney = (value) => formatCurrency(value, language);
  const {
    items,
    cartCount,
    increaseQuantity,
    decreaseQuantity,
    removeItem,
    getCartItemKey,
    isCartDrawerOpen,
    closeCartDrawer,
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
    queryKey: ["cart-drawer-quote", quoteSignature],
    queryFn: () =>
      createQuoteRequest({
        items: quoteItems,
      }),
    enabled: isCartDrawerOpen && items.length > 0,
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
    ? t("common:updatingTotals")
    : t("common:totalsUnavailable");
  const isQuoteRefreshing = hasCurrentQuote && isFetchingQuote;
  const formatQuotedMoney = (value) =>
    hasCurrentQuote ? formatMoney(value) : quoteStatusText;
  const drawerRef = useFocusTrap({
    isActive: isCartDrawerOpen,
    onEscape: closeCartDrawer,
    lockScroll: true,
  });

  if (!isCartDrawerOpen) return null;

  return (
    <div
      ref={drawerRef}
      className="fixed inset-0 z-[80]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
      tabIndex={-1}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#050505]/45"
        aria-label={t("cart:closeDrawer")}
        tabIndex={-1}
        onClick={closeCartDrawer}
      />

      <aside className="cart-drawer-panel absolute inset-y-0 right-0 flex w-[min(92vw,26rem)] flex-col border-l border-[#c7a852]/28 bg-[#0b0a09] shadow-2xl sm:w-full sm:max-w-[28rem]">
        <div className="flex h-[4.5rem] items-center justify-between gap-4 border-b border-[#f5f0e8]/12 px-6">
          <div>
            <p className="text-[0.56rem] font-black uppercase tracking-[0.26em] text-[#c7a852]">
              {t("cart:totalItems", { count: cartCount })}
            </p>
            <h2
              id="cart-drawer-title"
              className="mt-1 font-serif text-2xl font-semibold text-[#f5f0e8]"
            >
              {t("cart:title")}
            </h2>
          </div>

          <button
            type="button"
            onClick={closeCartDrawer}
            className="flex h-11 w-11 items-center justify-center border border-[#f5f0e8]/14 text-[#f5f0e8]/70 transition hover:border-[#c7a852] hover:text-[#f5f0e8]"
            aria-label={t("cart:closeDrawer")}
            data-autofocus
          >
            <X size={18} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-7 text-center">
            <p className="text-[0.62rem] font-black uppercase tracking-[0.26em] text-[#c7a852]">
              {t("cart:emptyLabel")}
            </p>
            <h3 className="mt-4 font-serif text-5xl text-[#f5f0e8]">
              {t("cart:emptyTitle")}
            </h3>
            <p className="mt-5 max-w-xs text-sm leading-7 text-[#f5f0e8]/52">
              {t("cart:emptyDescription")}
            </p>
            <Link to="/shop" className="mt-8 w-full" onClick={closeCartDrawer}>
              <Button className="w-full">{t("cart:explore")}</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {isQuoteError && (
                <div className="mb-4 border border-[#b8585d]/45 bg-[#882c30]/18 px-4 py-3 text-xs text-[#f5d7d8]">
                  {quoteError?.friendlyMessage ||
                    quoteError?.message ||
                    "Could not refresh cart pricing."}
                </div>
              )}

              <div className="divide-y divide-[#f5f0e8]/10">
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
                  const finalLineTotal = hasQuoteItem ? finalUnitPrice * quantity : 0;
                  const itemQuoteStatus = isQuotePending
                    ? t("common:updating")
                    : t("common:unavailable");
                  const appliedOfferTitle =
                    quoteItem?.appliedOfferTitle ||
                    t("common:offer");
                  const maxStock = Number(item.maxStock || 1);
                  const canIncrease = quantity < maxStock;
                  const displayImage = getCartItemImage(item);

                  return (
                    <article
                      key={itemKey}
                      className="grid grid-cols-[72px_1fr] gap-4 py-4"
                    >
                      <Link
                        to={`/product/${item.slug}`}
                        onClick={closeCartDrawer}
                        className="overflow-hidden border border-[#f5f0e8]/12 bg-[#28231f]"
                        aria-label={t("cart:viewItem", {
                          name: item.name,
                        })}
                      >
                        {displayImage ? (
                          <img
                            src={displayImage}
                            alt={item.name}
                            onError={hideBrokenImage}
                            className="aspect-[3/4] h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-[3/4] items-center justify-center text-[0.5rem] font-black uppercase tracking-[0.16em] text-[#8b8075]">
                            {t("common:imagePending")}
                          </div>
                        )}
                      </Link>

                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              to={`/product/${item.slug}`}
                              onClick={closeCartDrawer}
                              className="block"
                            >
                              <h3 className="truncate font-serif text-lg font-semibold text-[#f5f0e8] transition hover:text-[#c7a852]">
                                {item.name}
                              </h3>
                            </Link>
                            <p className="mt-1 text-[0.6rem] font-black uppercase tracking-[0.15em] text-[#f5f0e8]/42">
                              {item.color?.name} / {item.size?.label}
                            </p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-sm font-black text-[#f5f0e8]">
                              {hasQuoteItem
                                ? formatMoney(finalLineTotal)
                                : itemQuoteStatus}
                            </p>
                            {hasItemOffer && (
                              <p className="mt-1 text-[0.68rem] text-[#8b8075] line-through">
                                {formatMoney(originalUnitPrice * quantity)}
                              </p>
                            )}
                          </div>
                        </div>

                        {hasItemOffer && (
                          <p className="mt-2 w-fit border border-[#c7a852]/25 bg-[#c7a852]/8 px-2 py-1 text-[0.56rem] font-black uppercase tracking-[0.14em] text-[#c7a852]">
                            {appliedOfferTitle}
                          </p>
                        )}

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="flex h-9 items-center border border-[#f5f0e8]/14">
                            <button
                              type="button"
                              onClick={() => decreaseQuantity(itemKey)}
                              className="flex h-full w-9 items-center justify-center text-[#f5f0e8]/65 transition hover:bg-[#f5f0e8]/8"
                              aria-label={t("cart:decreaseItem", {
                                name: item.name,
                              })}
                            >
                              <Minus size={13} />
                            </button>
                            <span className="min-w-8 text-center text-xs font-black">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => increaseQuantity(itemKey)}
                              disabled={!canIncrease}
                              className="flex h-full w-9 items-center justify-center text-[#f5f0e8]/65 transition hover:bg-[#f5f0e8]/8 disabled:opacity-25"
                              aria-label={t("cart:increaseItem", {
                                name: item.name,
                              })}
                            >
                              <Plus size={13} />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(itemKey)}
                            className="flex items-center gap-1.5 text-[0.55rem] font-black uppercase tracking-[0.16em] text-[#e8a3a6] transition hover:text-[#f5d7d8]"
                            aria-label={t("cart:removeItem", {
                              name: item.name,
                            })}
                          >
                            <Trash2 size={12} />
                            {t("common:remove")}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-[#c7a852]/20 bg-[#110f0e] px-6 py-5">
              {(isQuotePending || isQuoteRefreshing) && (
                <p className="mb-3 text-xs text-[#f5f0e8]/45">
                  {isQuotePending
                    ? t("common:updatingTotals")
                    : t("common:refreshingTotals")}
                </p>
              )}

              {hasCurrentQuote &&
                (summary.appliedBundles.length > 0 ||
                summary.appliedOffers.length > 0) && (
                <div className="mb-4 space-y-2 border border-[#c7a852]/18 bg-[#c7a852]/5 p-3">
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

              <div className="space-y-3 text-sm">
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
                <div className="flex items-end justify-between gap-4 border-t border-[#f5f0e8]/10 pt-4">
                  <span className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-[#8b8075]">
                    {t("cart:estimatedTotal")}
                  </span>
                  <span className="font-serif text-3xl font-semibold text-[#f5f0e8]">
                    {formatQuotedMoney(summary.totalBeforeDelivery)}
                  </span>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                {isQuotePending ? (
                  <Button className="w-full" disabled>
                    {t("common:updatingTotals")}
                  </Button>
                ) : (
                  <>
                    <Link to="/cart" onClick={closeCartDrawer}>
                      <Button
                        variant="secondary"
                        className="w-full tracking-[0.14em]"
                      >
                        {t("cart:viewCartPage")}
                      </Button>
                    </Link>
                    <Link to="/checkout" onClick={closeCartDrawer}>
                      <Button className="w-full tracking-[0.14em]">
                        {t("cart:checkout")}
                      </Button>
                    </Link>
                  </>
                )}
                {isQuoteError && !isQuotePending && (
                  <button
                    type="button"
                    onClick={() => refetchQuote()}
                    className="text-[0.58rem] font-black uppercase tracking-[0.14em] text-[#c7a852] transition hover:text-[#f5f0e8]"
                  >
                    {t("common:tryAgain")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={closeCartDrawer}
                  className="text-[0.6rem] font-black uppercase tracking-[0.14em] text-[#f5f0e8]/52 transition hover:text-[#c7a852]"
                >
                  {t("cart:keepShopping")}
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </div>
  );
};

export default CartDrawer;
