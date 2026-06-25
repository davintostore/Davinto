import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import ProductCard from "../../components/product/ProductCard";
import Button from "../../components/ui/Button";
import Container from "../../components/ui/Container";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";

import { getPublicProductsRequest } from "../../services/productService";
import api from "../../api/axios";
import { getLocalizedCategory } from "../../utils/localizedContent";

const getCategoryBySlugRequest = async (slug) => {
  const { data } = await api.get(`/categories/${slug}`);
  return data;
};

const Category = () => {
  const { t, i18n } = useTranslation(["catalog", "common"]);
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const { slug } = useParams();
  const [sort, setSort] = useState("newest");

  const {
    data: categoryData,
    isLoading: isLoadingCategory,
    isError: isCategoryError,
  } = useQuery({
    queryKey: ["public-category", slug],
    queryFn: () => getCategoryBySlugRequest(slug),
    enabled: Boolean(slug),
  });

  const {
    data: productsData,
    isLoading: isLoadingProducts,
    isError: isProductsError,
    error: productsError,
  } = useQuery({
    queryKey: ["public-products", "category", slug, sort],
    queryFn: () =>
      getPublicProductsRequest({
        category: slug,
        sort,
      }),
    enabled: Boolean(slug),
  });

  const category = useMemo(
    () => getLocalizedCategory(categoryData?.category, language),
    [categoryData, language]
  );
  // Arabic slugs and language-prefixed routes remain deferred to Phase 4C.
  const products = useMemo(
    () => productsData?.products || [],
    [productsData]
  );

  if (isLoadingCategory) {
    return (
      <PageHeader
        label={t("catalog:category.label")}
        title={t("catalog:category.loadingTitle")}
        description={t("catalog:category.loadingDescription")}
      />
    );
  }

  if (isCategoryError || !category) {
    return (
      <>
        <PageHeader
          label={t("catalog:category.label")}
          title={t("catalog:category.notFoundTitle")}
          description={t("catalog:category.notFoundDescription")}
        />

        <section className="fashion-section">
          <Container>
            <Link to="/shop">
              <Button>{t("catalog:category.backToShop")}</Button>
            </Link>
          </Container>
        </section>
      </>
    );
  }

  return (
    <>
      <PageHeader
        label={t("catalog:category.label")}
        title={category.name}
        description={
          category.description ||
          t("catalog:category.fallbackDescription")
        }
      />

      <section className="fashion-section">
        <Container>
          <div className="mb-12 flex flex-col gap-4 border-y border-[#f5f0e8]/12 py-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[0.64rem] font-black uppercase tracking-[0.3em] text-[#c7a852]">
                {t("common:pieceCount", { count: products.length })}
              </p>
              <p className="mt-2 text-sm text-[#f5f0e8]/45">
                {t("catalog:category.currentEdit", { name: category.name })}
              </p>
            </div>

            <div className="w-full sm:w-56">
              <Select
                label={t("catalog:shop.sort")}
                value={sort}
                onChange={(event) => setSort(event.target.value)}
              >
                <option value="newest">{t("catalog:shop.sortNewest")}</option>
                <option value="oldest">{t("catalog:shop.sortOldest")}</option>
                <option value="price_asc">{t("catalog:shop.sortPriceLow")}</option>
                <option value="price_desc">{t("catalog:shop.sortPriceHigh")}</option>
              </Select>
            </div>
          </div>

          {isLoadingProducts && (
            <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="catalog-skeleton h-[460px]" />
              ))}
            </div>
          )}

          {isProductsError && (
            <div className="border border-[#b8585d]/40 bg-[#882c30]/18 p-6 text-sm text-[#f5d7d8]">
              {productsError?.friendlyMessage ||
                productsError?.message ||
                t("catalog:shop.loadError")}
            </div>
          )}

          {!isLoadingProducts && !isProductsError && products.length === 0 && (
            <div className="fashion-panel p-10 text-center">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#c7a852]">
                {t("catalog:category.emptyLabel")}
              </p>
              <h2 className="editorial-heading mt-5 text-6xl">
                {t("catalog:category.emptyTitle")}
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-[#f5f0e8]/52">
                {t("catalog:category.emptyDescription")}
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

export default Category;
