import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Share2,
  ShoppingBag,
} from "lucide-react";
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

const getFirstAvailableSize = (color) => {
  const sizes = getActiveSizes(color);
  return sizes.find((size) => Number(size.stock || 0) > 0) || sizes[0] || null;
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
    <section className="border-b border-[#f5f0e8]/12">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 py-5 text-left text-[0.68rem] font-black uppercase tracking-[0.2em] text-[#f5f0e8]"
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
          <div className="pb-5 text-sm leading-7 text-[#f5f0e8]/62">
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
  const { addItem, openCartDrawer } = useCart();
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

  // SEO
  useSeo({
    title: localizedProduct?.name 
      ? `${localizedProduct.name} | Davinto Store`
      : "Product | Davinto Store",
    description: `Shop ${localizedProduct?.name || "product"} from Davinto Store with available sizes, delivery options, and order tracking.`,
    robots: "index,follow",
    canonical: `${window.location.origin}/product/${slug}`,
    og: {
      title: localizedProduct?.name || "Davinto Product",
      description: localizedProduct?.shortDescription || "Shop premium clothing from Davinto Store",
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
      offers: {
        "@type": "Offer",
        priceCurrency: "EGP",
        price: product.price?.toFixed(2) || "0",
        availability: product.isActive ? "InStock" : "OutOfStock",
        url: `${window.location.origin}/product/${slug}`,
      },
    } : null,
  });

  const [selectedColorId, setSelectedColorId] = useState("");
  const [selectedSizeLabel, setSelectedSizeLabel] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchStartY, setTouchStartY] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [cartMessage, setCartMessage] = useState("");
  const [openInfoSection, setOpenInfoSection] = useState("");
  const [shareMessage, setShareMessage] = useState("");

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
    return (
      selectedSizes.find((size) => size.label === selectedSizeLabel) ||
      getFirstAvailableSize(selectedColor) ||
      null
    );
  }, [selectedColor, selectedSizes, selectedSizeLabel]);

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
  const offerPreview = product?.activeOfferPreview;
  const offerPrice = Number(offerPreview?.priceAfterOffer || 0);
  const hasOfferPrice =
    offerPrice > 0 && offerPrice < Number(product?.price || 0);
  const displayPrice = hasOfferPrice ? offerPrice : product?.price;
  const isOnSale = product?.compareAtPrice > product?.price || hasOfferPrice;
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
    "A Davinto piece designed for everyday rotation with a clean, premium finish.";
  const materialsText = localizedProduct?.fabric || "Premium cotton blend.";
  const careText =
    localizedProduct?.care ||
    localizedProduct?.careInstructions ||
    "Wash gently with similar colors. Avoid bleach and high heat to preserve the print and fabric.";
  const detailBullets = [
    localizedProduct?.category?.name
      ? `Collection: ${localizedProduct.category.name}`
      : "",
    localizedSelectedColor?.name ? `Selected color: ${localizedSelectedColor.name}` : "",
    selectedSize?.label ? `Selected size: ${selectedSize.label}` : "",
    isInStock
      ? `${selectedStock} pieces available in the selected option`
      : t("catalog:product.outOfStock"),
  ].filter(Boolean);

  const { data: relatedData } = useQuery({
    queryKey: ["related-products", product?.category?.slug, product?._id],
    queryFn: () =>
      getPublicProductsRequest({
        category: product.category.slug,
        limit: 5,
        sort: "newest",
      }),
    enabled: Boolean(product?.category?.slug),
  });

  const relatedProducts = useMemo(
    () =>
      (relatedData?.products || [])
        .filter((relatedProduct) => relatedProduct._id !== product?._id)
        .slice(0, 4),
    [relatedData, product?._id]
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
    const firstAvailableSize = getFirstAvailableSize(color);

    setSelectedColorId(colorKey);
    setSelectedSizeLabel(firstAvailableSize?.label || "");
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

    setCartMessage(t("catalog:product.addedToCart"));
    openCartDrawer();
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
      setShareMessage("Link copied.");
      window.setTimeout(() => setShareMessage(""), 2200);
    } catch {
      setShareMessage("Share link is ready in your browser bar.");
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
      <section className="border-b border-[#c7a852]/20 py-10 sm:py-14 lg:py-20">
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
                className="order-1 relative overflow-hidden border border-[#f5f0e8]/12 bg-[#28231f] touch-pan-y sm:order-2"
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
                  <div className="flex aspect-[4/5] flex-col items-center justify-center bg-[linear-gradient(145deg,#332c27,#1c1917)]">
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
                      className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-[#f5f0e8]/18 bg-[#110f0e]/78 text-[#f5f0e8] transition hover:border-[#c7a852]"
                      onClick={showPreviousImage}
                      aria-label={t("common:previous")}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center border border-[#f5f0e8]/18 bg-[#110f0e]/78 text-[#f5f0e8] transition hover:border-[#c7a852]"
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
              <div className="border border-[#f5f0e8]/12 bg-[#110f0e] p-6 sm:p-9">
                <SectionLabel>
                  {localizedProduct.category?.name ||
                    t("common:davintoPiece")}
                </SectionLabel>

                <h1 className="editorial-heading mt-3 text-5xl sm:text-6xl lg:text-7xl">
                  {localizedProduct.name}
                </h1>

                <div className="mt-7 flex flex-wrap items-center gap-4 border-y border-[#f5f0e8]/12 py-5">
                  <p className="font-serif text-4xl font-semibold text-[#f5f0e8] sm:text-5xl">
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
                  <p className="mt-6 text-base leading-8 text-[#f5f0e8]/62">
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
                        <span className="text-sm text-[#f5f0e8]/65">
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
                            className={`flex min-h-11 items-center gap-2.5 border px-4 text-xs font-bold transition ${
                              isSelected
                                ? "border-[#c7a852] bg-[#c7a852]/12 text-[#f5f0e8]"
                                : "border-[#f5f0e8]/14 text-[#f5f0e8]/55 hover:border-[#f5f0e8]/35 hover:text-[#f5f0e8]"
                            }`}
                          >
                            <span
                              className="h-4 w-4 rounded-full border border-[#f5f0e8]/35"
                              style={{ backgroundColor: color.hex || "#777" }}
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
                        <span className="text-sm text-[#f5f0e8]/65">
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
                            disabled={disabled}
                            aria-pressed={isSelected}
                            onClick={() => {
                              setSelectedSizeLabel(size.label);
                              setQuantity(1);
                              setCartMessage("");
                            }}
                            className={`min-h-12 min-w-14 border px-4 text-xs font-black uppercase tracking-[0.16em] transition disabled:cursor-not-allowed disabled:opacity-25 ${
                              isSelected
                                ? "border-[#f5f0e8] bg-[#f5f0e8] text-[#1c1917]"
                                : "border-[#f5f0e8]/14 text-[#f5f0e8]/58 hover:border-[#c7a852] hover:text-[#f5f0e8]"
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
                          isInStock ? "text-[#c7a852]" : "text-[#e8a3a6]"
                        }`}
                      >
                        {isInStock
                          ? t("catalog:product.stockAvailable", {
                              count: selectedStock,
                            })
                          : t("catalog:product.outOfStock")}
                      </p>
                    </div>

                    <div className="flex h-12 w-fit items-center border border-[#f5f0e8]/16">
                      <button
                        type="button"
                        onClick={decreaseQuantity}
                        className="flex h-full w-12 items-center justify-center text-[#f5f0e8]/65 transition hover:bg-[#f5f0e8]/8"
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
                        className="flex h-full w-12 items-center justify-center text-[#f5f0e8]/65 transition hover:bg-[#f5f0e8]/8"
                        aria-label={t("catalog:product.increaseQuantity")}
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>

                  {cartMessage && (
                    <div className="border border-[#c7a852]/35 bg-[#c7a852]/10 px-4 py-3 text-sm text-[#f5f0e8]">
                      {cartMessage}
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <Button
                      className="w-full gap-2"
                      disabled={!isInStock}
                      onClick={handleAddToCart}
                    >
                      <ShoppingBag size={16} />
                      {isInStock
                        ? t("catalog:product.addToCart")
                        : t("catalog:product.outOfStock")}
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

      <section className="fashion-section bg-[#110f0e]">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div>
              <SectionLabel>{t("catalog:product.notes")}</SectionLabel>
              <h2 className="editorial-heading mt-4 text-5xl sm:text-7xl">
                {t("catalog:product.detailsTitle")}
              </h2>
            </div>

            <div className="border-t border-[#f5f0e8]/12">
              <p className="py-6 text-base leading-8 text-[#f5f0e8]/70">
                {productDescription}
              </p>

              {detailBullets.length > 0 && (
                <ul className="mb-2 grid gap-3 border-y border-[#f5f0e8]/12 py-5 text-sm text-[#f5f0e8]/62 sm:grid-cols-2">
                  {detailBullets.map((detail) => (
                    <li key={detail} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c7a852]" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              )}

              <ProductInfoAccordion
                title="Materials"
                isOpen={openInfoSection === "materials"}
                onToggle={() => toggleInfoSection("materials")}
              >
                {materialsText}
                {localizedProduct.fit ? ` Fit: ${localizedProduct.fit}` : ""}
              </ProductInfoAccordion>

              <ProductInfoAccordion
                title="Shipping & Returns"
                isOpen={openInfoSection === "shipping"}
                onToggle={() => toggleInfoSection("shipping")}
              >
                Delivery is available across Egypt. Cairo and Giza delivery is 70 EGP;
                other governorates are 120 EGP. Returns and exchanges are reviewed
                based on item condition and order details.
              </ProductInfoAccordion>

              <ProductInfoAccordion
                title="Care Instructions"
                isOpen={openInfoSection === "care"}
                onToggle={() => toggleInfoSection("care")}
              >
                {careText}
              </ProductInfoAccordion>

              <div className="flex flex-wrap items-center gap-3 border-b border-[#f5f0e8]/12 py-5">
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 text-[0.64rem] font-black uppercase tracking-[0.2em] text-[#c7a852] transition hover:text-[#f5f0e8]"
                >
                  <Share2 size={15} />
                  Share
                </button>
                {shareMessage && (
                  <span className="text-xs text-[#f5f0e8]/45">
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
                  <SectionLabel>You may also like</SectionLabel>
                  <h2 className="editorial-heading mt-3 text-5xl sm:text-6xl">
                    More from Davinto
                  </h2>
                </div>
                <Link
                  to="/shop"
                  className="hidden text-[0.62rem] font-black uppercase tracking-[0.2em] text-[#c7a852] transition hover:text-[#f5f0e8] sm:block"
                >
                  Shop all
                </Link>
              </div>

              <div className="product-grid">
                {relatedProducts.map((relatedProduct) => (
                  <ProductCard key={relatedProduct._id} product={relatedProduct} />
                ))}
              </div>
            </div>
          )}
        </Container>
      </section>
    </>
  );
};

export default ProductDetails;
