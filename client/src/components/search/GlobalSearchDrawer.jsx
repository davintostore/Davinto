import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import useFocusTrap from "../../hooks/useFocusTrap";
import { getPublicCategoriesRequest } from "../../services/categoryService";
import { getPublicProductsRequest } from "../../services/productService";
import {
  getLocalizedCategory,
  getLocalizedProduct,
} from "../../utils/localizedContent";
import { hideBrokenImage } from "../../utils/imageFallback";
import { getProductGalleryImages } from "../../utils/resolveLocalImages";

const PRODUCT_LIMIT = 6;

const normalizeSearch = (value = "") =>
  String(value || "").trim().toLowerCase();

const getSearchTerms = (t) => {
  const terms = t("search.trendingTerms", {
    ns: "common",
    returnObjects: true,
  });

  return Array.isArray(terms) ? terms : [];
};

const GlobalSearchDrawer = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation(["common", "catalog"]);
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const trimmedQuery = query.trim();
  const normalizedQuery = normalizeSearch(query);
  const hasQuery = normalizedQuery.length >= 2;

  const drawerRef = useFocusTrap({
    isActive: isOpen,
    onEscape: onClose,
    lockScroll: true,
    lockHtmlScroll: true,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["global-search-categories"],
    queryFn: getPublicCategoriesRequest,
    enabled: isOpen,
    staleTime: 60 * 1000,
  });

  const {
    data: productsData,
    isFetching: isSearchingProducts,
  } = useQuery({
    queryKey: ["global-search-products", normalizedQuery],
    queryFn: () =>
      getPublicProductsRequest({
        search: trimmedQuery,
        limit: PRODUCT_LIMIT,
      }),
    enabled: isOpen && hasQuery,
    staleTime: 30 * 1000,
  });

  const productResults = useMemo(
    () =>
      (productsData?.products || [])
        .slice(0, PRODUCT_LIMIT)
        .map((product) => getLocalizedProduct(product, language)),
    [language, productsData]
  );

  const categoryResults = useMemo(() => {
    const categories = (categoriesData?.categories || []).map((category) =>
      getLocalizedCategory(category, language)
    );

    if (!hasQuery) return categories.slice(0, 4);

    return categories
      .filter((category) => {
        const haystack = normalizeSearch(
          `${category.name} ${category.description || ""} ${category.slug || ""}`
        );

        return haystack.includes(normalizedQuery);
      })
      .slice(0, 5);
  }, [categoriesData, hasQuery, language, normalizedQuery]);

  const trendingTerms = useMemo(() => getSearchTerms(t), [t]);

  const closeAndNavigate = (path) => {
    onClose();
    navigate(path);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!trimmedQuery) return;

    closeAndNavigate(`/shop?search=${encodeURIComponent(trimmedQuery)}`);
  };

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={drawerRef}
      className="fixed inset-0 z-[140]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="global-search-title"
      tabIndex={-1}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#050505]/62"
        aria-label={t("close")}
        tabIndex={-1}
        onClick={onClose}
      />

      <aside className="cart-drawer-panel absolute inset-y-0 right-0 flex w-[min(88vw,32rem)] max-w-[32rem] flex-col border-l border-[#c7a852]/24 bg-[#0b0a09] shadow-2xl sm:w-[30rem]">
        <div className="flex h-20 shrink-0 items-center justify-between gap-4 border-b border-[#f5f0e8]/10 px-5 sm:px-6">
          <div>
            <p className="text-[0.58rem] font-black uppercase tracking-[0.22em] text-[#c7a852]">
              {t("search.label")}
            </p>
            <h2
              id="global-search-title"
              className="mt-1 font-serif text-3xl font-semibold text-[#f5f0e8]"
            >
              {t("search.title")}
            </h2>
          </div>

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center text-[#f5f0e8]/72 transition hover:text-[#c7a852]"
            aria-label={t("close")}
            onClick={onClose}
          >
            <X size={24} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          <form onSubmit={handleSubmit} className="relative">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("search.placeholder")}
              aria-label={t("search.search")}
              className="h-14 w-full rounded-[0.2rem] border border-[#f5f0e8]/16 bg-[#f5f0e8]/6 ps-4 pe-12 text-base text-[#f5f0e8] outline-none transition placeholder:text-[#8b8075] hover:border-[#f5f0e8]/25 focus:border-[#c7a852]"
              data-autofocus
            />
            <button
              type="submit"
              className="absolute inset-y-0 end-3 flex items-center text-[#f5f0e8]/72 transition hover:text-[#c7a852]"
              aria-label={t("search.submit")}
            >
              <Search size={23} />
            </button>
          </form>

          {!hasQuery && trendingTerms.length > 0 && (
            <section className="mt-8">
              <p className="text-[0.66rem] font-black uppercase tracking-[0.22em] text-[#c7a852]">
                {t("search.trending")}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {trendingTerms.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setQuery(term)}
                    className="inline-flex min-h-11 items-center gap-2 border border-[#f5f0e8]/14 bg-[#f5f0e8]/4 px-4 text-sm text-[#f5f0e8]/78 transition hover:border-[#c7a852] hover:text-[#c7a852]"
                  >
                    <Search size={16} />
                    {term}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="mt-8">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[0.66rem] font-black uppercase tracking-[0.22em] text-[#c7a852]">
                {t("search.products")}
              </p>
              {isSearchingProducts && (
                <span className="text-xs text-[#f5f0e8]/42">
                  {t("loading")}
                </span>
              )}
            </div>

            {hasQuery && productResults.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {productResults.map((product) => {
                  const image = getProductGalleryImages(product)[0]?.url || "";

                  return (
                    <button
                      key={product._id}
                      type="button"
                      onClick={() => closeAndNavigate(`/product/${product.slug}`)}
                      className="grid grid-cols-[4rem_1fr] gap-3 border border-[#f5f0e8]/10 bg-[#f5f0e8]/4 p-2 text-left transition hover:border-[#c7a852]/55 hover:bg-[#c7a852]/8"
                    >
                      <div className="aspect-[3/4] overflow-hidden bg-[#28231f]">
                        {image ? (
                          <img
                            src={image}
                            alt={product.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                            onError={hideBrokenImage}
                          />
                        ) : (
                          <div className="grid h-full place-items-center text-[0.54rem] font-black uppercase tracking-[0.16em] text-[#8b8075]">
                            {t("imagePending")}
                          </div>
                        )}
                      </div>
                      <span className="min-w-0 self-center">
                        <span className="block truncate font-serif text-xl font-semibold text-[#f5f0e8]">
                          {product.name}
                        </span>
                        <span className="mt-1 block text-xs text-[#f5f0e8]/44">
                          {t("catalog:product.archive")}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 border border-[#f5f0e8]/10 bg-[#f5f0e8]/3 p-4 text-sm leading-6 text-[#f5f0e8]/48">
                {hasQuery ? t("search.noProducts") : t("search.typeToSearch")}
              </p>
            )}
          </section>

          <section className="mt-8">
            <p className="text-[0.66rem] font-black uppercase tracking-[0.22em] text-[#c7a852]">
              {t("search.categories")}
            </p>

            {categoryResults.length > 0 ? (
              <div className="mt-4 grid gap-2">
                {categoryResults.map((category) => (
                  <Link
                    key={category._id || category.slug}
                    to={category.slug ? `/category/${category.slug}` : "/shop"}
                    onClick={onClose}
                    className="flex items-center justify-between gap-4 border border-[#f5f0e8]/10 bg-[#f5f0e8]/4 px-4 py-3 text-sm font-bold text-[#f5f0e8]/76 transition hover:border-[#c7a852]/55 hover:text-[#c7a852]"
                  >
                    <span>{category.name}</span>
                    <Search size={15} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-4 border border-[#f5f0e8]/10 bg-[#f5f0e8]/3 p-4 text-sm leading-6 text-[#f5f0e8]/48">
                {t("search.noCategories")}
              </p>
            )}
          </section>
        </div>
      </aside>
    </div>,
    document.body
  );
};

export default GlobalSearchDrawer;
