import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import ProductCard from "../../components/product/ProductCard";
import Button from "../../components/ui/Button";
import Container from "../../components/ui/Container";
import Input from "../../components/ui/Input";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";

import { getPublicCategoriesRequest } from "../../services/categoryService";
import { getPublicProductsRequest } from "../../services/productService";
import { trackSearch } from "../../utils/metaPixel";
import { getLocalizedCategory } from "../../utils/localizedContent";

const Shop = () => {
  const { t, i18n } = useTranslation("catalog");
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const lastTrackedSearchRef = useRef("");

  const [filters, setFilters] = useState({
    search: "",
    sort: "newest",
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
        sort: filters.sort,
      }),
  });

  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["public-categories"],
    queryFn: getPublicCategoriesRequest,
  });

  const products = useMemo(
    () => productsData?.products || [],
    [productsData]
  );

  const categories = useMemo(
    () =>
      (categoriesData?.categories || []).map((category) =>
        getLocalizedCategory(category, language)
      ),
    [categoriesData, language]
  );

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

  const updateFilter = (event) => {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  };

  return (
    <>
      <PageHeader
        label={t("shop.label")}
        title={t("shop.title")}
        description={t("shop.description")}
      />

      <section className="fashion-section">
        <Container>
          <div className="mb-14 grid gap-8 border-y border-[#f5f0e8]/12 py-7 lg:grid-cols-[0.85fr_1.15fr] lg:items-end">
            <div>
              <p className="text-[0.64rem] font-black uppercase tracking-[0.3em] text-[#c7a852]">
                {t("shop.browse")}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {isLoadingCategories && (
                  <span className="text-sm text-[#f5f0e8]/45">
                    {t("shop.loadingCategories")}
                  </span>
                )}

                {!isLoadingCategories && categories.length === 0 && (
                  <span className="text-sm text-[#f5f0e8]/45">
                    {t("shop.emptyCategories")}
                  </span>
                )}

                {categories.map((category) => (
                  <Link key={category._id} to={`/category/${category.slug}`}>
                    <Button variant="secondary">{category.name}</Button>
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
              <Input
                label={t("shop.search")}
                name="search"
                value={filters.search}
                onChange={updateFilter}
                placeholder={t("shop.searchPlaceholder")}
              />

              <Select
                label={t("shop.sort")}
                name="sort"
                value={filters.sort}
                onChange={updateFilter}
              >
                <option value="newest">{t("shop.sortNewest")}</option>
                <option value="oldest">{t("shop.sortOldest")}</option>
                <option value="price_asc">{t("shop.sortPriceLow")}</option>
                <option value="price_desc">{t("shop.sortPriceHigh")}</option>
              </Select>
            </div>
          </div>

          {isLoadingProducts && (
            <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                {t("shop.emptyTitle")}
              </h2>

              <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-[#f5f0e8]/52">
                {t("shop.emptyDescription")}
              </p>
            </div>
          )}

          {!isLoadingProducts && !isProductsError && products.length > 0 && (
            <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}
        </Container>
      </section>
    </>
  );
};

export default Shop;
