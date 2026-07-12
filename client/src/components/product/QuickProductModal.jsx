import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import Button from "../ui/Button";
import { useCart } from "../../context/cartContext";
import useFocusTrap from "../../hooks/useFocusTrap";
import { getPublicProductBySlugRequest } from "../../services/productService";
import { formatCurrency } from "../../utils/translatedLabels";
import {
  getLocalizedColor,
  getLocalizedImageAlt,
  getLocalizedProduct,
} from "../../utils/localizedContent";
import { hideBrokenImage } from "../../utils/imageFallback";
import { getProductGalleryImages } from "../../utils/resolveLocalImages";

const getActiveColors = (product) => {
  if (!Array.isArray(product?.colors)) return [];
  return product.colors.filter((color) => color.isActive !== false);
};

const getActiveSizes = (color) => {
  if (!Array.isArray(color?.sizes)) return [];
  return color.sizes.filter((size) => size.isActive !== false);
};

const getColorKey = (color) => color?._id || color?.slug || color?.name || "";

const QuickProductModal = ({ product: previewProduct, isOpen, onClose }) => {
  const { t, i18n } = useTranslation(["catalog", "common"]);
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const formatMoney = (value) => formatCurrency(value, language);
  const { addItem } = useCart();
  const [selectedColorId, setSelectedColorId] = useState("");
  const [selectedSizeSelection, setSelectedSizeSelection] = useState({
    productSlug: "",
    label: "",
  });
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [errorMessage, setErrorMessage] = useState("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["quick-product", previewProduct?.slug],
    queryFn: () => getPublicProductBySlugRequest(previewProduct.slug),
    enabled: isOpen && Boolean(previewProduct?.slug),
  });

  const product = data?.product || previewProduct;
  const selectedSizeLabel =
    selectedSizeSelection.productSlug === previewProduct?.slug
      ? selectedSizeSelection.label
      : "";
  const localizedProduct = useMemo(
    () => getLocalizedProduct(product, language),
    [product, language]
  );
  const activeColors = useMemo(() => getActiveColors(product), [product]);

  const selectedColor = useMemo(() => {
    const matchedColor = activeColors.find(
      (color) =>
        (color._id && color._id === selectedColorId) ||
        color.slug === selectedColorId ||
        color.name === selectedColorId
    );

    if (matchedColor) return matchedColor;
    if (activeColors.length === 1) return activeColors[0];

    return null;
  }, [activeColors, selectedColorId]);

  const selectedSizes = useMemo(
    () => getActiveSizes(selectedColor),
    [selectedColor]
  );

  const selectedSize = useMemo(() => {
    return (
      selectedSizes.find((size) => size.label === selectedSizeLabel) || null
    );
  }, [selectedSizes, selectedSizeLabel]);

  const images = useMemo(() => {
    return getProductGalleryImages(product, selectedColor);
  }, [product, selectedColor]);

  const selectedImage = images[selectedImageIndex] || images[0] || null;
  const localizedSelectedColor = useMemo(
    () => getLocalizedColor(selectedColor, language),
    [language, selectedColor]
  );
  const selectedStock = Number(selectedSize?.stock || 0);
  const isInStock = selectedStock > 0;
  const offerPreview = product?.activeOfferPreview;
  const offerPrice = Number(offerPreview?.priceAfterOffer || 0);
  const hasOfferPrice =
    offerPrice > 0 && offerPrice < Number(product?.price || 0);
  const displayPrice = hasOfferPrice ? offerPrice : product?.price;
  const isOnSale = product?.compareAtPrice > product?.price || hasOfferPrice;
  const dialogRef = useFocusTrap({
    isActive: isOpen && Boolean(product),
    onEscape: onClose,
    lockScroll: true,
  });

  const handleColorChange = (color) => {
    setSelectedColorId(getColorKey(color));
    setSelectedSizeSelection({ productSlug: "", label: "" });
    setSelectedImageIndex(0);
    setQuantity(1);
    setErrorMessage("");
  };

  const handleAddToCart = () => {
    if (!product?._id) {
      setErrorMessage(t("catalog:product.chooseVariant"));
      return;
    }

    if (!selectedColor) {
      setErrorMessage(t("catalog:product.selectColor"));
      return;
    }

    if (!selectedSize) {
      setErrorMessage(t("catalog:product.selectSize"));
      return;
    }

    if (!isInStock) {
      setErrorMessage(t("catalog:product.outOfStock"));
      return;
    }

    addItem({
      productId: product._id,
      slug: product.slug,
      name: product.name,
      category: {
        id: product.category?._id || "",
        name: product.category?.name || "",
        slug: product.category?.slug || "",
      },
      color: {
        id: selectedColor._id || "",
        key: selectedColor._id || selectedColor.slug || selectedColor.name,
        name: selectedColor.name,
        slug: selectedColor.slug || "",
        hex: selectedColor.hex || "",
      },
      size: {
        id: selectedSize._id || "",
        label: selectedSize.label,
        sku: selectedSize.sku || "",
      },
      image: selectedImage?.url || product.primaryImage || "",
      price: Number(product.price || 0),
      compareAtPrice: Number(product.compareAtPrice || 0),
      quantity,
      maxStock: selectedStock,
    });

    onClose();
  };

  if (!isOpen || typeof document === "undefined") return null;

  const modal = (
    <div
      ref={dialogRef}
      className="davinto-public-portal fixed inset-0 z-[95] flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t("catalog:product.quickView")}
      tabIndex={-1}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#050505]/52"
        aria-label={t("catalog:product.closeQuickView")}
        tabIndex={-1}
        onClick={onClose}
      />

      <div className="quick-product-panel relative z-10 max-h-[90vh] w-full max-w-[58rem] overflow-y-auto border border-[#c7a852]/28 bg-[#0b0a09] shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="davinto-press-icon absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center border border-[#f5f0e8]/14 bg-[#110f0e]/80 text-[#f5f0e8]/70 transition hover:border-[#c7a852] hover:text-[#f5f0e8]"
          aria-label={t("catalog:product.closeQuickView")}
          data-autofocus
        >
          <X size={18} />
        </button>

        {isLoading && !product?.colors?.length ? (
          <div className="grid gap-5 p-5 sm:grid-cols-[0.9fr_1.1fr] sm:p-7">
            <div className="catalog-skeleton aspect-[4/5]" />
            <div className="space-y-4 py-4">
              <div className="catalog-skeleton h-4 w-32" />
              <div className="catalog-skeleton h-16 w-full" />
              <div className="catalog-skeleton h-48 w-full" />
            </div>
          </div>
        ) : isError ? (
          <div className="p-6 sm:p-8">
            <p className="font-serif text-3xl text-[#f5f0e8]">
              {t("catalog:product.notFound")}
            </p>
            <p className="mt-3 text-sm leading-7 text-[#f5f0e8]/55">
              {error?.friendlyMessage ||
                error?.message ||
                t("catalog:product.notFoundDescription")}
            </p>
          </div>
        ) : (
          <div className="grid gap-0 md:grid-cols-[0.92fr_1.08fr]">
            <div className="bg-[#1c1917]">
              <div className="relative">
                {selectedImage?.url ? (
                  <img
                    src={selectedImage.url}
                    alt={getLocalizedImageAlt(
                      selectedImage,
                      localizedProduct?.name,
                      language
                    )}
                    onError={hideBrokenImage}
                    className="aspect-[4/5] w-full object-contain"
                  />
                ) : (
                  <div className="flex aspect-[4/5] flex-col items-center justify-center bg-[#28231f]">
                    <span className="brand-wordmark text-7xl text-[#f5f0e8]/10">
                      D
                    </span>
                    <span className="mt-3 text-[0.58rem] font-black uppercase tracking-[0.22em] text-[#8b8075]">
                      {t("common:imageComingSoon")}
                    </span>
                  </div>
                )}
              </div>

              {images.length > 1 && (
                <div className="grid grid-cols-5 gap-2 border-t border-[#f5f0e8]/10 p-3">
                  {images.slice(0, 5).map((image, index) => (
                    <button
                      key={`${image.url}-${index}`}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      className={`overflow-hidden border transition ${
                        selectedImageIndex === index
                          ? "border-[#c7a852]"
                          : "border-[#f5f0e8]/12 hover:border-[#f5f0e8]/35"
                      }`}
                      aria-label={t("catalog:product.viewImage", {
                        number: index + 1,
                      })}
                    >
                      <img
                        src={image.url}
                        alt={getLocalizedImageAlt(
                          image,
                          localizedProduct?.name,
                          language
                        )}
                        onError={hideBrokenImage}
                        className="aspect-[3/4] w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 sm:p-7">
              <p className="text-[0.58rem] font-black uppercase tracking-[0.24em] text-[#c7a852]">
                {localizedProduct?.category?.name || t("common:davintoPiece")}
              </p>
              <h2 className="mt-3 pr-12 font-serif text-4xl font-semibold text-[#f5f0e8] sm:text-5xl">
                {localizedProduct?.name}
              </h2>

              <div className="mt-5 flex flex-wrap items-center gap-3 border-y border-[#f5f0e8]/12 py-4">
                <p className="font-serif text-3xl font-semibold text-[#f5f0e8]">
                  {formatMoney(displayPrice)}
                </p>
                {isOnSale && (
                  <p className="text-sm text-[#8b8075] line-through">
                    {formatMoney(
                      hasOfferPrice ? product.price : product.compareAtPrice
                    )}
                  </p>
                )}
                {hasOfferPrice && (
                  <span className="border border-[#c7a852]/30 bg-[#c7a852]/10 px-2 py-1 text-[0.56rem] font-black uppercase tracking-[0.16em] text-[#c7a852]">
                    {t("common:offer")}
                  </span>
                )}
              </div>

              <div className="mt-6 space-y-6">
                <fieldset>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <legend className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-[#c7a852]">
                      {t("catalog:product.selectColor")}
                    </legend>
                    {localizedSelectedColor?.name && (
                      <span className="text-sm text-[#f5f0e8]/58">
                        {localizedSelectedColor.name}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {activeColors.map((color) => {
                      const colorKey = color._id || color.slug || color.name;
                      const localizedColor = getLocalizedColor(
                        color,
                        language
                      );
                      const isSelected =
                        colorKey === selectedColorId ||
                        color.name === selectedColor?.name;

                      return (
                        <button
                          key={colorKey}
                          type="button"
                          onClick={() => handleColorChange(color)}
                          aria-pressed={isSelected}
                          aria-label={t("catalog:product.selectColorName", {
                            color: localizedColor.name,
                          })}
                          className={`flex min-h-10 items-center gap-2 border px-3 text-xs font-bold transition ${
                            isSelected
                              ? "border-[#c7a852] bg-[#c7a852]/12 text-[#f5f0e8]"
                              : "border-[#f5f0e8]/14 text-[#f5f0e8]/55 hover:border-[#f5f0e8]/35 hover:text-[#f5f0e8]"
                          }`}
                        >
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-[#f5f0e8]/35"
                            style={{ backgroundColor: color.hex || "#777" }}
                            aria-hidden="true"
                          />
                          {localizedColor.name}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <legend className="text-[0.62rem] font-black uppercase tracking-[0.22em] text-[#c7a852]">
                      {t("catalog:product.selectSize")}
                    </legend>
                    {selectedSize?.label && (
                      <span className="text-sm text-[#f5f0e8]/58">
                        {selectedSize.label}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {!selectedColor && (
                      <p className="text-sm text-[#f5f0e8]/48">
                        {t("catalog:product.selectColor")}
                      </p>
                    )}

                    {selectedSizes.map((size) => {
                      const stock = Number(size.stock || 0);
                      const disabled = stock <= 0;
                      const isSelected = selectedSize?.label === size.label;

                      return (
                        <button
                          key={size.label}
                          type="button"
                          aria-pressed={isSelected}
                          aria-label={t("catalog:product.selectSizeName", {
                            size: size.label,
                          })}
                          onClick={() => {
                            setSelectedSizeSelection({
                              productSlug: previewProduct?.slug || "",
                              label: size.label,
                            });
                            setQuantity(1);
                            setErrorMessage("");
                          }}
                          className={`min-h-11 min-w-12 border px-3 text-xs font-black uppercase tracking-[0.14em] transition ${
                            isSelected
                              ? disabled
                                ? "border-[#b8585d] bg-[#882c30]/28 text-[#f5d7d8]"
                                : "border-[#f5f0e8] bg-[#f5f0e8] text-[#1c1917]"
                              : disabled
                                ? "border-[#f5f0e8]/10 text-[#f5f0e8]/32 hover:border-[#b8585d]/55 hover:text-[#f5d7d8]"
                              : "border-[#f5f0e8]/14 text-[#f5f0e8]/58 hover:border-[#c7a852] hover:text-[#f5f0e8]"
                          }`}
                        >
                          {size.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <div className="flex flex-wrap items-center justify-between gap-4 border-y border-[#f5f0e8]/12 py-4">
                  <div>
                    <p className="text-[0.58rem] font-black uppercase tracking-[0.22em] text-[#8b8075]">
                      {t("catalog:product.availability")}
                    </p>
                    <p
                      className={`mt-1 text-sm font-bold ${
                        !selectedSize
                          ? "text-[#f5f0e8]/62"
                          : isInStock
                            ? "text-[#c7a852]"
                            : "text-[#e8a3a6]"
                      }`}
                    >
                      {!selectedSize
                        ? t("catalog:product.chooseSizeFirst")
                        : isInStock
                        ? t("catalog:product.stockAvailable", {
                            count: selectedStock,
                          })
                        : t("catalog:product.outOfStock")}
                    </p>
                  </div>

                  <div className="flex h-11 items-center border border-[#f5f0e8]/16">
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((current) => Math.max(1, current - 1))
                      }
                      className="davinto-press-icon flex h-full w-11 items-center justify-center text-[#f5f0e8]/65 transition hover:bg-[#c7a852]/12 hover:text-[#c7a852]"
                      aria-label={t("catalog:product.decreaseQuantity")}
                    >
                      <Minus size={14} />
                    </button>
                    <span className="min-w-10 text-center text-sm font-black">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((current) =>
                          isInStock ? Math.min(selectedStock, current + 1) : 1
                        )
                      }
                      className="davinto-press-icon flex h-full w-11 items-center justify-center text-[#f5f0e8]/65 transition hover:bg-[#c7a852]/12 hover:text-[#c7a852]"
                      aria-label={t("catalog:product.increaseQuantity")}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div className="border border-[#b8585d]/45 bg-[#882c30]/18 px-4 py-3 text-sm text-[#f5d7d8]">
                    {errorMessage}
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Button
                    type="button"
                    onClick={handleAddToCart}
                    disabled={!selectedColor || !selectedSize || !isInStock}
                    className="w-full gap-2 whitespace-nowrap px-4 py-2.5 tracking-[0.12em] sm:min-w-[10.5rem]"
                  >
                    <ShoppingBag size={16} />
                    {selectedSize && !isInStock
                      ? t("catalog:product.outOfStock")
                      : t("catalog:product.addToCart")}
                  </Button>
                  <Link to={`/product/${product.slug}`} onClick={onClose}>
                    <Button
                      variant="secondary"
                      className="w-full whitespace-nowrap px-4 py-2.5 tracking-[0.12em]"
                    >
                      {t("catalog:product.viewFullDetails")}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default QuickProductModal;
