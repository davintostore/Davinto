import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Minus,
  Plus,
  Share2,
  ShoppingBag,
} from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useTranslation } from "react-i18next";

import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import Container from "../../components/ui/Container";
import ProductCard from "../../components/product/ProductCard";
import SectionLabel from "../../components/ui/SectionLabel";
import useSeo from "../../hooks/useSeo";

import { useCart } from "../../context/cartContext";
import {
  getPublicProductBySlugRequest,
  getPublicProductsRequest,
} from "../../services/productService";
import { trackViewContent } from "../../utils/metaPixel";
import { formatCurrency } from "../../utils/translatedLabels";
import {
  getLocalizedBadges,
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

const hasProductAvailableStock = (product) => {
  return getActiveColors(product).some((color) =>
    getActiveSizes(color).some((size) => Number(size.stock || 0) > 0)
  );
};

const getSimpleBadge = (badge = "", t) => {
  const normalizedBadge = String(badge || "").toLowerCase();

  if (normalizedBadge.includes("launch") || normalizedBadge.includes("offer")) {
    return t("common:offer");
  }

  return badge;
};

const ProductInfoAccordion = ({ title, children, isOpen, onToggle }) => {
  return (
    <section className="border-b border-[#8b8075]/30">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 py-5 text-left text-[0.68rem] font-black uppercase tracking-[0.2em] text-[#1c1917] transition hover:text-[#882c30]"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span>{title}</span>
        <ChevronDown
          size={17}
          className={`shrink-0 text-[#c7a852] transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pb-5 text-sm leading-7 text-[#8b8075]">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
};

const ProductDetails = () => {
  const { t, i18n } = useTranslation(["catalog", "common"]);
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const formatMoney = (value) => formatCurrency(value, language);
  const { slug } = useParams();
  const { addItem } = useCart();
  const viewedProductRef = useRef("");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["public-product", slug],
    queryFn: () => getPublicProductBySlugRequest(slug),
    enabled: Boolean(slug),
  });

  const product = data?.product;
  const localizedProduct = useMemo(
    () => getLocalizedProduct(product, language),
    [product, language]
  );
  const localizedBadges = useMemo(
    () => getLocalizedBadges(product, language),
    [product, language]
  );
  const activeColors = useMemo(() => getActiveColors(product), [product]);
  const offerPreview = product?.activeOfferPreview;
  const offerPrice = Number(offerPreview?.priceAfterOffer || 0);
  const hasOfferPrice =
    offerPrice > 0 && offerPrice < Number(product?.price || 0);
  const displayPrice = hasOfferPrice ? offerPrice : product?.price;
  const isOnSale = product?.compareAtPrice > product?.price || hasOfferPrice;
  const structuredDataPrice = Number(displayPrice || 0);
  const structuredDataAvailability =
    product?.status === "active" && hasProductAvailableStock(product)
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";

  // SEO
  useSeo({
    title: localizedProduct?.name
      ? t("catalog:product.seoTitle", { name: localizedProduct.name })
      : t("catalog:product.seoFallbackTitle"),
    description: t("catalog:product.seoDescription", {
      name: localizedProduct?.name || t("catalog:product.seoFallbackName"),
    }),
    robots: "index,follow",
    canonical: `${window.location.origin}/product/${slug}`,
    og: {
      title:
        localizedProduct?.name || t("catalog:product.seoFallbackOgTitle"),
      description:
        localizedProduct?.shortDescription ||
        t("catalog:product.seoFallbackOgDescription"),
      type: "product",
      url: `${window.location.origin}/product/${slug}`,
    },
    jsonLd: product ? {
      "@context": "https://schema.org",
      "@type": "Product",
      name: localizedProduct?.name || product.name,
      description: localizedProduct?.shortDescription || product.shortDescription,
      brand: {
        "@type": "Brand",
        name: "Davinto",
      },
      image: product.primaryImage ? [product.primaryImage] : undefined,
      offers: {
        "@type": "Offer",
        priceCurrency: "EGP",
        price:
          structuredDataPrice > 0 ? structuredDataPrice.toFixed(2) : "0",
        availability: structuredDataAvailability,
        url: `${window.location.origin}/product/${slug}`,
      },
    } : null,
  });

  const [selectedColorId, setSelectedColorId] = useState("");
  const [selectedSizeSelection, setSelectedSizeSelection] = useState({
    productSlug: "",
    label: "",
  });
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState("");
  const [openInfoSection, setOpenInfoSection] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const selectedSizeLabel =
    selectedSizeSelection.productSlug === slug
      ? selectedSizeSelection.label
      : "";

  const selectedColor = useMemo(() => {
    return (
      activeColors.find(
        (color) =>
          (color._id && color._id === selectedColorId) ||
          color.slug === selectedColorId ||
          color.name === selectedColorId
      ) ||
      activeColors[0] ||
      null
    );
  }, [activeColors, selectedColorId]);

  const selectedSizes = useMemo(
    () => getActiveSizes(selectedColor),
    [selectedColor]
  );

  const selectedSize = useMemo(() => {
    return selectedSizes.find((size) => size.label === selectedSizeLabel) || null;
  }, [selectedSizes, selectedSizeLabel]);

  const images = useMemo(() => {
    return getProductGalleryImages(product, selectedColor);
  }, [product, selectedColor]);

  const selectedImage = images[selectedImageIndex] || images[0] || null;
  const hasMultipleImages = images.length > 1;
  const localizedSelectedColor = useMemo(
    () => getLocalizedColor(selectedColor, language),
    [selectedColor, language]
  );
  const selectedStock = Number(selectedSize?.stock || 0);
  const isInStock = selectedStock > 0;
  const displayBadges = hasOfferPrice
    ? [t("common:offer")]
    : product?.compareAtPrice > product?.price
      ? [t("common:sale")]
      : localizedBadges
        .map((badge) => getSimpleBadge(badge, t))
        .filter(Boolean)
        .slice(0, 1);
  const productDescription =
    localizedProduct?.description ||
    localizedProduct?.shortDescription ||
    t("catalog:product.descriptionFallback");
  const materialsText =
    localizedProduct?.fabric || t("catalog:product.materialsFallback");
  const careText =
    localizedProduct?.care ||
    localizedProduct?.careInstructions ||
    t("catalog:product.careTextFallback");
  const detailBullets = [
    localizedProduct?.category?.name
      ? t("catalog:product.detailCollection", {
          name: localizedProduct.category.name,
        })
      : "",
    localizedSelectedColor?.name
      ? t("catalog:product.detailSelectedColor", {
          color: localizedSelectedColor.name,
        })
      : "",
    selectedSize?.label
      ? t("catalog:product.detailSelectedSize", {
          size: selectedSize.label,
        })
      : "",
    !selectedSize
      ? t("catalog:product.chooseSizeFirst")
      : isInStock
      ? t("catalog:product.detailStockAvailable", {
          count: selectedStock,
        })
      : t("catalog:product.outOfStock"),
  ].filter(Boolean);

  const { data: relatedData } = useQuery({
    queryKey: ["related-products", product?.category?.slug, product?._id],
    queryFn: () =>
      getPublicProductsRequest({
        category: product.category.slug,
        limit: 9,
        sort: "newest",
      }),
    enabled: Boolean(product?.category?.slug),
  });

  const { data: relatedFallbackData } = useQuery({
    queryKey: ["related-products-fallback", product?._id],
    queryFn: () => getPublicProductsRequest({ limit: 12, sort: "newest" }),
    enabled: Boolean(product?._id),
  });

  const relatedProducts = useMemo(
    () => {
      const seen = new Set([String(product?._id || "")]);
      const mergedProducts = [];

      [...(relatedData?.products || []), ...(relatedFallbackData?.products || [])]
        .forEach((relatedProduct) => {
          const id = String(relatedProduct?._id || "");
          if (!id || seen.has(id) || mergedProducts.length >= 8) return;
          seen.add(id);
          mergedProducts.push(relatedProduct);
        });

      return mergedProducts;
    },
    [relatedData, relatedFallbackData, product?._id]
  );
  const [relatedViewportRef, relatedEmblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    direction: "ltr",
    dragFree: false,
    loop: false,
    slidesToScroll: 1,
  });
  const scrollRelated = useCallback(
    (direction) => {
      if (direction === "previous") relatedEmblaApi?.scrollPrev();
      else relatedEmblaApi?.scrollNext();
    },
    [relatedEmblaApi]
  );

  useEffect(() => {
    if (!product?._id || viewedProductRef.current === product._id) return;

    viewedProductRef.current = product._id;

    trackViewContent({
      productId: product._id,
      name: product.name,
      category: product.category?.name || "",
      price: product.price,
    });
  }, [product]);

  const handleColorChange = (color) => {
    const colorKey = color._id || color.slug || color.name;

    setSelectedColorId(colorKey);
    setSelectedSizeSelection({ productSlug: "", label: "" });
    setSelectedImageIndex(0);
    setQuantity(1);
    setCartMessage("");
  };

  const showPreviousImage = () => {
    if (!hasMultipleImages) return;

    setSelectedImageIndex((current) =>
      current <= 0 ? images.length - 1 : current - 1
    );
  };

  const showNextImage = () => {
    if (!hasMultipleImages) return;

    setSelectedImageIndex((current) =>
      current >= images.length - 1 ? 0 : current + 1
    );
  };

  const handleGalleryKeyDown = (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      showPreviousImage();
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      showNextImage();
    }
  };

  const handleTouchStart = (event) => {
    if (!hasMultipleImages) return;

    const touch = event.touches[0];
    setTouchStartX(touch.clientX);
    setTouchStartY(touch.clientY);
  };

  const handleTouchEnd = (event) => {
    if (!hasMultipleImages || touchStartX === null || touchStartY === null) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = touch.clientY - touchStartY;

    setTouchStartX(null);
    setTouchStartY(null);

    if (Math.abs(deltaX) < 42 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) {
      return;
    }

    if (deltaX > 0) {
      showPreviousImage();
      return;
    }

    showNextImage();
  };

  const decreaseQuantity = () => {
    setQuantity((current) => Math.max(1, current - 1));
  };

  const increaseQuantity = () => {
    setQuantity((current) => {
      if (!isInStock) return 1;
      return Math.min(selectedStock, current + 1);
    });
  };

  const handleAddToCart = () => {
    if (!product || !selectedColor || !selectedSize || !isInStock) {
      setCartMessage(t("catalog:product.chooseVariant"));
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

    setCartMessage("");
  };

  const toggleInfoSection = (section) => {
    setOpenInfoSection((current) => (current === section ? "" : section));
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: localizedProduct.name,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareMessage(t("catalog:product.shareCopied"));
      window.setTimeout(() => setShareMessage(""), 2200);
    } catch {
      setShareMessage(t("catalog:product.shareReady"));
      window.setTimeout(() => setShareMessage(""), 2200);
    }
  };

  if (isLoading) {
    return (
      <section className="fashion-section">
        <Container>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="catalog-skeleton aspect-[4/5]" />
            <div className="space-y-5 py-8">
              <div className="catalog-skeleton h-4 w-40" />
              <div className="catalog-skeleton h-28 w-full" />
              <div className="catalog-skeleton h-48 w-full" />
            </div>
          </div>
        </Container>
      </section>
    );
  }

  if (isError || !product) {
    return (
      <section className="fashion-section">
        <Container>
          <Card>
            <SectionLabel>{t("catalog:product.archive")}</SectionLabel>
            <h1 className="editorial-heading text-7xl">
              {t("catalog:product.notFound")}
            </h1>
            <p className="mt-6 max-w-xl text-sm leading-7 text-[#f5f0e8]/52">
              {error?.friendlyMessage ||
                error?.message ||
                t("catalog:product.notFoundDescription")}
            </p>
            <div className="mt-8">
              <Link to="/shop">
                <Button>{t("catalog:product.backToShop")}</Button>
              </Link>
            </div>
          </Card>
        </Container>
      </section>
    );
  }

  return (
    <>
      <section className="border-b border-[#c7a852]/20 bg-[#f5f0e8] py-10 text-[#1c1917] sm:py-14 lg:py-20">
        <Container>
          <div className="mb-7 flex items-center justify-between border-b border-[#f5f0e8]/10 pb-4">
            <Link
              to="/shop"
              className="text-[0.6rem] font-black uppercase tracking-[0.24em] text-[#8b8075] transition hover:text-[#c7a852]"
            >
              {t("catalog:product.breadcrumbShop")}
            </Link>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-start">
            <div
              className={`grid gap-4 ${
                hasMultipleImages ? "sm:grid-cols-[88px_1fr]" : ""
              }`}
              tabIndex={hasMultipleImages ? 0 : undefined}
              onKeyDown={handleGalleryKeyDown}
            >
              {hasMultipleImages && (
                <div className="order-2 grid grid-cols-4 gap-2 sm:order-1 sm:grid-cols-1 sm:self-start">
                  {images.map((image, index) => (
                    <button
                      key={`${image.url}-${index}`}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      className={`relative overflow-hidden border transition ${
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
                          localizedProduct.name,
                          language
                        )}
                        onError={hideBrokenImage}
                        className="aspect-[3/4] w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div
                className="order-1 relative overflow-hidden bg-[#1c1917] touch-pan-y sm:order-2"
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                {selectedImage?.url ? (
                  <img
                    src={selectedImage.url}
                    alt={getLocalizedImageAlt(
                      selectedImage,
                      localizedProduct.name,
                      language
                    )}
                    onError={hideBrokenImage}
                    className="aspect-[4/5] w-full object-contain bg-[#1c1917]"
                  />
                ) : (
                  <div className="flex aspect-[4/5] flex-col items-center justify-center bg-[#1c1917]">
                    <span className="brand-wordmark text-8xl text-[#f5f0e8]/10">
                      D
                    </span>
                    <span className="mt-4 text-[0.6rem] font-black uppercase tracking-[0.28em] text-[#8b8075]">
                      {t("common:imageComingSoon")}
                    </span>
                  </div>
                )}

                <div className="absolute left-0 top-0 flex">
                  {displayBadges.map((badge) => (
                    <span
                      key={badge}
                      className={`px-4 py-2 text-[0.6rem] font-black uppercase tracking-[0.22em] ${
                        isOnSale
                          ? "bg-[#882c30] text-[#f5f0e8]"
                          : "bg-[#c7a852] text-[#1c1917]"
                      }`}
                    >
                      {badge}
                    </span>
                  ))}
                </div>

                {hasMultipleImages && (
                  <>
                    <button
                      type="button"
                      className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-white bg-white text-[#1c1917] transition hover:border-[#c7a852] hover:text-[#882c30]"
                      onClick={showPreviousImage}
                      aria-label={t("common:previous")}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-white bg-white text-[#1c1917] transition hover:border-[#c7a852] hover:text-[#882c30]"
                      onClick={showNextImage}
                      aria-label={t("common:next")}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="lg:sticky lg:top-32">
              <div className="border border-[#8b8075]/30 bg-[#f5f0e8] p-6 sm:p-9">
                <SectionLabel>
                  {localizedProduct.category?.name ||
                    t("common:davintoPiece")}
                </SectionLabel>

                <h1 className="editorial-heading mt-3 text-5xl sm:text-6xl lg:text-7xl">
                  {localizedProduct.name}
                </h1>

                <div className="mt-7 flex flex-wrap items-center gap-4 border-y border-[#f5f0e8]/12 py-5">
                  <p className="font-serif text-4xl font-semibold text-[#1c1917] sm:text-5xl">
                    {formatMoney(displayPrice)}
                  </p>
                  {isOnSale && (
                    <p className="text-sm text-[#8b8075] line-through sm:text-base">
                      {formatMoney(
                        hasOfferPrice ? product.price : product.compareAtPrice
                      )}
                    </p>
                  )}
                </div>

                {localizedProduct.shortDescription && (
                  <p className="mt-6 text-base leading-8 text-[#8b8075]">
                    {localizedProduct.shortDescription}
                  </p>
                )}

                <div className="mt-9 space-y-8">
                  <fieldset>
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <legend className="text-[0.64rem] font-black uppercase tracking-[0.25em] text-[#c7a852]">
                        {t("catalog:product.selectColor")}
                      </legend>
                      {selectedColor && (
                        <span className="text-sm text-[#1c1917]">
                          {localizedSelectedColor.name}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2.5">
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
                            aria-label={t(
                              "catalog:product.selectColorName",
                              {
                                color: localizedColor.name,
                              }
                            )}
                            className={`flex min-h-11 items-center gap-2.5 border px-4 text-xs font-bold transition ${
                              isSelected
                                ? "border-[#c7a852] bg-[#c7a852]/12 text-[#1c1917]"
                                : "border-[#8b8075]/35 text-[#8b8075] hover:border-[#c7a852] hover:text-[#1c1917]"
                            }`}
                          >
                            <span
                              className="h-4 w-4 rounded-full border border-[#f5f0e8]/35"
                              style={{ backgroundColor: color.hex || "#8b8075" }}
                              aria-hidden="true"
                            />
                            {localizedColor.name}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <fieldset>
                    <div className="mb-4 flex items-center justify-between gap-4">
                      <legend className="text-[0.64rem] font-black uppercase tracking-[0.25em] text-[#c7a852]">
                        {t("catalog:product.selectSize")}
                      </legend>
                      {selectedSize && (
                        <span className="text-sm text-[#1c1917]">
                          {selectedSize.label}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      {selectedSizes.map((size) => {
                        const stock = Number(size.stock || 0);
                        const disabled = stock <= 0;
                        const isSelected = selectedSizeLabel === size.label;

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
                                productSlug: slug || "",
                                label: size.label,
                              });
                              setQuantity(1);
                              setCartMessage("");
                            }}
                            className={`min-h-12 min-w-14 border px-4 text-xs font-black uppercase tracking-[0.16em] transition ${
                              isSelected
                                ? disabled
                                  ? "border-[#b8585d] bg-[#882c30]/28 text-[#f5d7d8]"
                                  : "product-size-option--selected border-[#1c1917] bg-[#1c1917]"
                                : disabled
                                  ? "border-[#8b8075]/25 text-[#8b8075]/70 hover:border-[#882c30]/55 hover:text-[#882c30]"
                                : "border-[#8b8075]/35 text-[#1c1917] hover:border-[#c7a852] hover:text-[#882c30]"
                            }`}
                          >
                            {size.label}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="grid gap-4 border-y border-[#f5f0e8]/12 py-5 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <p className="text-[0.6rem] font-black uppercase tracking-[0.24em] text-[#8b8075]">
                        {t("catalog:product.availability")}
                      </p>
                      <p
                        className={`mt-2 text-sm font-bold ${
                          !selectedSize
                            ? "text-[#8b8075]"
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

                    <div className="flex h-12 w-fit items-center border border-[#8b8075]/35">
                      <button
                        type="button"
                        onClick={decreaseQuantity}
                        className="davinto-press-icon flex h-full w-12 items-center justify-center text-[#1c1917] transition hover:bg-[#c7a852]/15 hover:text-[#882c30]"
                        aria-label={t("catalog:product.decreaseQuantity")}
                      >
                        <Minus size={15} />
                      </button>
                      <span className="min-w-11 text-center text-sm font-black">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={increaseQuantity}
                        className="davinto-press-icon flex h-full w-12 items-center justify-center text-[#1c1917] transition hover:bg-[#c7a852]/15 hover:text-[#882c30]"
                        aria-label={t("catalog:product.increaseQuantity")}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>

                  {cartMessage && (
                    <div className="border border-[#c7a852]/45 bg-[#c7a852]/10 px-4 py-3 text-sm text-[#1c1917]">
                      {cartMessage}
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <Button
                      className="w-full gap-2"
                      disabled={!selectedColor || !selectedSize || !isInStock}
                      onClick={handleAddToCart}
                    >
                      <ShoppingBag size={16} />
                      {selectedSize && !isInStock
                        ? t("catalog:product.outOfStock")
                        : t("catalog:product.addToCart")}
                    </Button>
                    <Link to="/cart">
                      <Button variant="secondary" className="w-full">
                        {t("catalog:product.viewCart")}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="fashion-section bg-[#f5f0e8] text-[#1c1917]">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div>
              <SectionLabel>{t("catalog:product.notes")}</SectionLabel>
              <h2 className="editorial-heading mt-4 text-5xl sm:text-7xl">
                {t("catalog:product.detailsTitle")}
              </h2>
            </div>

            <div className="border-t border-[#8b8075]/30">
              <p className="py-6 text-base leading-8 text-[#8b8075]">
                {productDescription}
              </p>

              {detailBullets.length > 0 && (
                <ul className="mb-2 grid gap-3 border-y border-[#8b8075]/30 py-5 text-sm text-[#1c1917] sm:grid-cols-2">
                  {detailBullets.map((detail) => (
                    <li key={detail} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c7a852]" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              )}

              <ProductInfoAccordion
                title={t("catalog:product.materialsTitle")}
                isOpen={openInfoSection === "materials"}
                onToggle={() => toggleInfoSection("materials")}
              >
                {materialsText}
                {localizedProduct.fit
                  ? ` ${t("catalog:product.fitLine", {
                      fit: localizedProduct.fit,
                    })}`
                  : ""}
              </ProductInfoAccordion>

              <ProductInfoAccordion
                title={t("catalog:product.shippingReturnsTitle")}
                isOpen={openInfoSection === "shipping"}
                onToggle={() => toggleInfoSection("shipping")}
              >
                {t("catalog:product.shippingReturnsDescription")}{" "}
                <Link
                  to="/shipping-policy"
                  className="font-bold text-[#882c30] transition hover:text-[#1c1917]"
                >
                  {t("catalog:product.shippingPolicyLink")}
                </Link>
              </ProductInfoAccordion>

              <ProductInfoAccordion
                title={t("catalog:product.careInstructionsTitle")}
                isOpen={openInfoSection === "care"}
                onToggle={() => toggleInfoSection("care")}
              >
                {careText}
              </ProductInfoAccordion>

              <div className="flex flex-wrap items-center gap-3 border-b border-[#8b8075]/30 py-5">
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 text-[0.64rem] font-black uppercase tracking-[0.2em] text-[#882c30] transition hover:text-[#1c1917]"
                >
                  <Share2 size={15} />
                  {t("catalog:product.share")}
                </button>
                {shareMessage && (
                  <span className="text-xs text-[#8b8075]">
                    {shareMessage}
                  </span>
                )}
              </div>
            </div>
          </div>

          {relatedProducts.length > 0 && (
            <div className="mt-16 border-t border-[#c7a852]/20 pt-10">
              <div className="mb-8 flex items-end justify-between gap-5">
                <div>
                  <SectionLabel>{t("catalog:product.relatedLabel")}</SectionLabel>
                  <h2 className="editorial-heading mt-3 text-5xl sm:text-6xl">
                    {t("catalog:product.relatedTitle")}
                  </h2>
                </div>
                <Link
                  to="/shop"
                  className="group hidden items-center gap-2 text-[0.62rem] font-black uppercase tracking-[0.2em] text-[#882c30] transition hover:text-[#1c1917] sm:flex"
                >
                  {t("catalog:product.shopAll")}
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              <div ref={relatedViewportRef} className="overflow-hidden touch-pan-y" dir="ltr">
                <div className="flex touch-pan-y gap-4 sm:gap-5">
                  {relatedProducts.map((relatedProduct) => (
                    <div
                      key={relatedProduct._id}
                      className="min-w-0 flex-[0_0_78%] sm:flex-[0_0_46%] md:flex-[0_0_32%] xl:flex-[0_0_24%]"
                      style={{ direction: language === "ar" ? "rtl" : "ltr" }}
                    >
                      <ProductCard product={relatedProduct} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-7 flex items-center justify-end gap-3" dir="ltr">
                <button
                  type="button"
                  onClick={() => scrollRelated("previous")}
                  className="davinto-press-icon flex h-11 w-11 items-center justify-center rounded-full border border-[#8b8075]/40 text-[#1c1917] transition hover:border-[#c7a852] hover:text-[#882c30]"
                  aria-label={t("common:previous")}
                >
                  <ChevronLeft size={19} />
                </button>
                <button
                  type="button"
                  onClick={() => scrollRelated("next")}
                  className="davinto-press-icon flex h-11 w-11 items-center justify-center rounded-full border border-[#8b8075]/40 text-[#1c1917] transition hover:border-[#c7a852] hover:text-[#882c30]"
                  aria-label={t("common:next")}
                >
                  <ChevronRight size={19} />
                </button>
              </div>
            </div>
          )}
        </Container>
      </section>
    </>
  );
};

export default ProductDetails;
