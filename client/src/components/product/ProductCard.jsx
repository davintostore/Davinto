import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import QuickProductModal from "./QuickProductModal";
import { formatCurrency } from "../../utils/translatedLabels";
import { getLocalizedProduct } from "../../utils/localizedContent";
import { hideBrokenImage } from "../../utils/imageFallback";
import { getProductGalleryImages } from "../../utils/resolveLocalImages";

const getSimpleBadge = (badge = "", t) => {
  const normalizedBadge = String(badge || "").toLowerCase();

  if (normalizedBadge.includes("launch") || normalizedBadge.includes("offer")) {
    return t("common:offer");
  }

  return badge;
};

const ProductCard = ({ product }) => {
  const { t, i18n } = useTranslation(["common", "catalog"]);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const formatMoney = (value) => formatCurrency(value, language);
  const localizedProduct = getLocalizedProduct(product, language);
  const galleryImages = getProductGalleryImages(product);
  const primaryGalleryImage = galleryImages[0] || null;
  const hoverGalleryImage = galleryImages[1] || null;
  const primaryImage = primaryGalleryImage?.url || product?.primaryImage || "";
  const hoverImage = hoverGalleryImage?.url || product?.hoverImage || "";
  const localizedImages = localizedProduct.colors?.flatMap(
    (color) => color.images || []
  );
  const primaryImageAlt =
    localizedImages?.find((image) => image.url === primaryImage)?.alt ||
    primaryGalleryImage?.alt ||
    localizedProduct.name;
  const hoverImageAlt =
    localizedImages?.find((image) => image.url === hoverImage)?.alt ||
    hoverGalleryImage?.alt ||
    t("catalog:product.alternateView", {
      name: localizedProduct.name,
    });
  const hasHoverImage = hoverImage && hoverImage !== primaryImage;
  const offerPreview = product.activeOfferPreview;
  const offerPrice = Number(offerPreview?.priceAfterOffer || 0);
  const hasOfferPrice = offerPrice > 0 && offerPrice < Number(product.price || 0);
  const displayPrice = hasOfferPrice ? offerPrice : product.price;
  const isOnSale = product.compareAtPrice > product.price || hasOfferPrice;
  const displayBadges = hasOfferPrice
    ? [t("common:offer")]
    : product.compareAtPrice > product.price
      ? [t("common:sale")]
      : (localizedProduct.badges || [])
        .map((badge) => getSimpleBadge(badge, t))
        .filter(Boolean)
        .slice(0, 1);

  return (
      <article className="group">
        <div className="relative">
          <Link
            to={`/product/${product.slug}`}
            className="block focus-visible:outline-offset-4"
            aria-label={localizedProduct.name}
          >
        <div className="relative aspect-[3/4] overflow-hidden border border-[#f5f0e8]/12 bg-[#28231f]">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={primaryImageAlt}
              onError={hideBrokenImage}
              className={`h-full w-full object-cover transition duration-700 ease-out ${
                hasHoverImage
                  ? "md:group-hover:scale-[1.025] md:group-hover:opacity-0"
                  : "group-hover:scale-[1.035]"
              }`}
              loading="lazy"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center bg-[linear-gradient(145deg,#332c27,#1c1917)] text-center">
              <span className="brand-wordmark text-5xl text-[#f5f0e8]/10">
                D
              </span>
              <span className="mt-3 text-[0.58rem] font-black uppercase tracking-[0.28em] text-[#8b8075]">
                {t("common:imageComingSoon")}
              </span>
            </div>
          )}

          {hasHoverImage && (
            <img
              src={hoverImage}
              alt={hoverImageAlt}
              onError={hideBrokenImage}
              className="pointer-events-none absolute inset-0 hidden h-full w-full scale-[1.025] object-cover opacity-0 transition duration-700 ease-out group-hover:scale-100 group-hover:opacity-100 md:block"
              loading="lazy"
            />
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#110f0e]/45 via-transparent to-transparent opacity-55" />

          <div className="absolute left-0 top-0 flex flex-wrap">
            {displayBadges.map((badge) => (
                <span
                  key={badge}
                  className={`border-l border-[#1c1917]/20 px-2 py-1.5 text-[0.52rem] font-black uppercase tracking-[0.14em] sm:px-3 sm:py-2 sm:text-[0.56rem] sm:tracking-[0.2em] ${
                    isOnSale
                      ? "bg-[#882c30] text-[#f5f0e8]"
                      : "bg-[#c7a852] text-[#1c1917]"
                  }`}
                >
                  {badge}
                </span>
              ))}
          </div>
        </div>
          </Link>

          <button
            type="button"
            onClick={() => setIsQuickViewOpen(true)}
            className="absolute inset-x-3 bottom-3 z-10 hidden min-h-11 items-center justify-center border border-[#c7a852]/55 bg-[#110f0e]/92 px-4 py-3 text-[0.6rem] font-black uppercase tracking-[0.18em] text-[#f5f0e8] opacity-0 shadow-xl transition duration-300 hover:border-[#c7a852] hover:bg-[#882c30]/88 focus-visible:outline-offset-2 md:flex md:translate-y-4 md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-within:translate-y-0 md:group-focus-within:opacity-100"
            aria-haspopup="dialog"
          >
            {t("catalog:product.chooseOptions", {
              defaultValue: "Choose Options",
            })}
          </button>
        </div>

        <div className="border-b border-[#f5f0e8]/12 py-3 sm:py-4">
          <div className="flex items-start justify-between gap-2 sm:gap-5">
            <div className="min-w-0">
              <Link to={`/product/${product.slug}`}>
                <h3 className="truncate font-serif text-base font-semibold text-[#f5f0e8] transition hover:text-[#c7a852] sm:text-xl">
                  {localizedProduct.name}
                </h3>
              </Link>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-xs font-black text-[#f5f0e8] sm:text-sm">
                {formatMoney(displayPrice)}
              </p>
              {isOnSale && (
                <p className="mt-1 text-xs text-[#8b8075] line-through">
                  {formatMoney(
                    hasOfferPrice ? product.price : product.compareAtPrice
                  )}
                </p>
              )}
            </div>
          </div>

          {Array.isArray(localizedProduct.colors) &&
            localizedProduct.colors.length > 0 && (
            <div className="mt-3 flex items-center justify-between gap-3 sm:mt-4 sm:gap-4">
              <div className="flex items-center gap-2">
                {localizedProduct.colors.slice(0, 5).map((color) => (
                  <span
                    key={color._id || color.slug || color.name}
                    title={color.name}
                    className="h-3 w-3 rounded-full border border-[#f5f0e8]/35 ring-1 ring-[#1c1917] sm:h-3.5 sm:w-3.5"
                    style={{ backgroundColor: color.hex || "#777" }}
                  />
                ))}
                {localizedProduct.colors.length > 5 && (
                  <span className="text-[0.62rem] text-[#8b8075]">
                    +{localizedProduct.colors.length - 5}
                  </span>
                )}
              </div>

            </div>
          )}

        </div>

        {isQuickViewOpen && (
          <QuickProductModal
            product={product}
            isOpen={isQuickViewOpen}
            onClose={() => setIsQuickViewOpen(false)}
          />
        )}
      </article>
  );
};

export default ProductCard;
