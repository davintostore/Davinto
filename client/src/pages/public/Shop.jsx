import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import CatalogFilters from "../../components/product/CatalogFilters";
import ProductCard from "../../components/product/ProductCard";
import Button from "../../components/ui/Button";
import Container from "../../components/ui/Container";
import useSeo from "../../hooks/useSeo";

import { getPublicCategoriesRequest } from "../../services/categoryService";
import { getPublicProductsRequest } from "../../services/productService";
import { trackSearch } from "../../utils/metaPixel";

const PRODUCTS_PER_PAGE = 10;

const Shop = () => {
  const { t, i18n } = useTranslation(["catalog", "common"]);
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const lastTrackedSearchRef = useRef("");
  const resultsRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // SEO
  useSeo({
    title: language === "ar"
      ? "تصفح متجر دافينتو | ملابس وتصاميم فنية عالية الجودة"
      : "Shop Davinto | Premium T-Shirts & Artwear",
    description: language === "ar"
      ? "تصفح مجموعة دافينتو من الملابس والتصاميم الفنية مع خيارات شحن بسيطة عبر جميع أنحاء مصر."
      : "Shop Davinto clothing, blanks, and art-inspired pieces with simple checkout and delivery across Egypt.",
    robots: "index,follow",
    canonical: `${window.location.origin}/shop`,
  });

  const filters = useMemo(() => {
    const availability = searchParams.get("availability") || "all";
    const parsedPage = Number.parseInt(searchParams.get("page") || "1", 10);

    return {
      search: searchParams.get("search") || "",
      sort: searchParams.get("sort") || "newest",
      category: searchParams.get("category") || "",
      color: searchParams.get("color") || "",
      minPrice: searchParams.get("minPrice") || "",
      maxPrice: searchParams.get("maxPrice") || "",
      availability: ["all", "inStock", "outOfStock"].includes(availability)
        ? availability
        : "all",
      page: Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1,
    };
  }, [searchParams]);

  const {
    data: categoriesData,
  } = useQuery({
    queryKey: ["catalog-categories"],
    queryFn: getPublicCategoriesRequest,
  });

  const {
    data: productsData,
    isLoading: isLoadingProducts,
    isError: isProductsError,
    error: productsError,
  } = useQuery({
    queryKey: ["public-products", filters],
    queryFn: () =>
      getPublicProductsRequest({
        search: filters.search || undefined,
        category: filters.category || undefined,
        page: filters.page,
        limit: PRODUCTS_PER_PAGE,
        sort: filters.sort,
        color: filters.color || undefined,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
        availability:
          filters.availability === "all" ? undefined : filters.availability,
      }),
  });

  const products = useMemo(
    () => productsData?.products || [],
    [productsData]
  );
  const filterMetadata = productsData?.filters;
  const categories = useMemo(
    () => categoriesData?.categories || [],
    [categoriesData]
  );
  const totalProducts = productsData?.total ?? products.length;
  const totalPages = Math.max(Number(productsData?.pages || 0), 0);
  const currentPage = Number(productsData?.page || filters.page);

  useEffect(() => {
    const searchString = filters.search.trim();

    if (!searchString || isLoadingProducts || isProductsError) return;

    const trackingKey = `${searchString}__${products.length}`;

    if (lastTrackedSearchRef.current === trackingKey) return;

    lastTrackedSearchRef.current = trackingKey;

    trackSearch({
      searchString,
      resultsCount: products.length,
    });
  }, [filters.search, products.length, isLoadingProducts, isProductsError]);

  const updateQueryParams = (updates, options = {}) => {
    const { resetPage = true, scrollToResults = false } = options;
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (
        value === undefined ||
        value === null ||
        value === "" ||
        (key === "sort" && value === "newest") ||
        (key === "availability" && value === "all")
      ) {
        nextParams.delete(key);
        return;
      }

      nextParams.set(key, value);
    });

    if (resetPage && !Object.prototype.hasOwnProperty.call(updates, "page")) {
      nextParams.delete("page");
    }

    setSearchParams(nextParams);

    if (scrollToResults) {
      window.setTimeout(() => {
        resultsRef.current?.scrollIntoView({
          behavior: "auto",
          block: "start",
        });
      }, 0);
    }
  };

  const goToPage = (page) => {
    updateQueryParams(
      {
        page: page <= 1 ? "" : String(page),
      },
      {
        resetPage: false,
        scrollToResults: true,
      }
    );
  };

  const toggleColorFilter = (slug) => {
    const selectedColors = filters.color
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const nextColors = selectedColors.includes(slug)
      ? selectedColors.filter((value) => value !== slug)
      : [...selectedColors, slug];

    updateQueryParams({
      color: nextColors.join(","),
    });
  };

  const applyPriceFilters = (nextPriceDraft) => {
    updateQueryParams({
      minPrice: nextPriceDraft.minPrice,
      maxPrice: nextPriceDraft.maxPrice,
    });
  };

  const clearFilters = () => {
    updateQueryParams({
      search: "",
      sort: "newest",
      category: "",
      color: "",
      minPrice: "",
      maxPrice: "",
      availability: "all",
    });
  };

  const hasActiveFilters = Boolean(
      filters.search ||
      filters.category ||
      filters.color ||
      filters.minPrice ||
      filters.maxPrice ||
      filters.availability !== "all" ||
      filters.sort !== "newest"
  );

  return (
    <section className="catalog-section bg-[#050505]" ref={resultsRef}>
      <Container>
        <h1 className="sr-only">{t("catalog:shop.title")}</h1>

          <CatalogFilters
            key={`${filters.minPrice}:${filters.maxPrice}:${language}`}
            filters={filters}
            metadata={filterMetadata}
            categories={categories}
            productCount={totalProducts}
            language={language}
            t={t}
            onSearchChange={(value) => updateQueryParams({ search: value })}
            onSortChange={(value) => updateQueryParams({ sort: value })}
            onCategoryChange={(value) => updateQueryParams({ category: value })}
            onToggleColor={toggleColorFilter}
            onAvailabilityChange={(value) =>
              updateQueryParams({ availability: value })
            }
            onApplyPrice={applyPriceFilters}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />

          {isLoadingProducts && (
            <div className="product-grid">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="catalog-skeleton h-[460px]" />
              ))}
            </div>
          )}

          {isProductsError && (
            <div className="border border-[#b8585d]/40 bg-[#882c30]/18 p-6 text-sm text-[#f5d7d8]">
              {productsError?.friendlyMessage ||
                productsError?.message ||
                t("shop.loadError")}
            </div>
          )}

          {!isLoadingProducts && !isProductsError && products.length === 0 && (
            <div className="fashion-panel p-10 text-center">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#c7a852]">
                {t("shop.emptyLabel")}
              </p>

              <h2 className="editorial-heading mt-5 text-6xl">
                {hasActiveFilters
                  ? t("filters.noMatchesTitle")
                  : t("shop.emptyTitle")}
              </h2>

              <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-[#f5f0e8]/52">
                {hasActiveFilters
                  ? t("filters.noMatchesDescription")
                  : t("shop.emptyDescription")}
              </p>
            </div>
          )}

          {!isLoadingProducts && !isProductsError && products.length > 0 && (
            <>
              <div className="product-grid">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[#f5f0e8]/12 pt-6 sm:flex-row">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={currentPage <= 1}
                    onClick={() => goToPage(currentPage - 1)}
                  >
                    {t("common:previous")}
                  </Button>

                  <div className="flex flex-wrap justify-center gap-2">
                    {Array.from({ length: totalPages }).map((_, index) => {
                      const page = index + 1;
                      const isActive = page === currentPage;

                      return (
                        <button
                          key={page}
                          type="button"
                          className={`flex h-10 min-w-10 items-center justify-center border px-3 text-xs font-black transition ${
                            isActive
                              ? "border-[#c7a852] bg-[#c7a852] text-[#1c1917]"
                              : "border-[#f5f0e8]/16 text-[#f5f0e8]/68 hover:border-[#c7a852] hover:text-[#f5f0e8]"
                          }`}
                          aria-current={isActive ? "page" : undefined}
                          onClick={() => goToPage(page)}
                        >
                          {page}
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    disabled={currentPage >= totalPages}
                    onClick={() => goToPage(currentPage + 1)}
                  >
                    {t("common:next")}
                  </Button>
                </div>
              )}
            </>
          )}
      </Container>
    </section>
  );
};

export default Shop;
