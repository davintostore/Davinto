import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import EditorialCategoryCard from "../../components/category/EditorialCategoryCard";
import Container from "../../components/ui/Container";
import StickerLabel from "../../components/ui/StickerLabel";
import useScrollReveal from "../../hooks/useScrollReveal";
import useSeo from "../../hooks/useSeo";
import { getPublicCategoriesRequest } from "../../services/categoryService";
import { getLocalizedCategory } from "../../utils/localizedContent";

const Categories = () => {
  const { t, i18n } = useTranslation(["catalog", "common"]);
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const [headerRevealRef, headerRevealClassName] = useScrollReveal();
  const [gridRevealRef, gridRevealClassName] = useScrollReveal();

  useSeo({
    title: t("catalog:categoriesPage.seoTitle"),
    description: t("catalog:categoriesPage.seoDescription"),
    robots: "index,follow",
    canonical: `${window.location.origin}/categories`,
  });

  const {
    data: categoriesData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["all-public-categories"],
    queryFn: getPublicCategoriesRequest,
  });

  const categories = useMemo(
    () =>
      (categoriesData?.categories || []).map((category) =>
        getLocalizedCategory(category, language)
      ),
    [categoriesData, language]
  );

  return (
    <>
      <section className="categories-page-section bg-[#050505]">
        <Container>
          <div
            ref={headerRevealRef}
            className={`mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between ${headerRevealClassName}`}
          >
            <div>
              <StickerLabel>{t("catalog:category.label")}</StickerLabel>
              <h2 className="editorial-heading section-display-title mt-4">
                {t("catalog:categoriesPage.gridTitle")}
              </h2>
            </div>
          </div>

          {isLoading && (
            <div
              ref={gridRevealRef}
              className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${gridRevealClassName}`}
            >
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="catalog-skeleton min-h-[19rem]" />
              ))}
            </div>
          )}

          {isError && (
            <div className="border border-[#b8585d]/40 bg-[#882c30]/18 p-6 text-sm text-[#f5d7d8]">
              {error?.friendlyMessage ||
                error?.message ||
                t("catalog:categoriesPage.loadError")}
            </div>
          )}

          {!isLoading && !isError && categories.length === 0 && (
            <div className="fashion-panel p-10 text-center">
              <p className="text-xs font-black uppercase tracking-[0.3em] text-[#c7a852]">
                {t("catalog:categoriesPage.emptyLabel")}
              </p>
              <h2 className="editorial-heading mt-5 text-6xl">
                {t("catalog:categoriesPage.emptyTitle")}
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-sm leading-7 text-[#f5f0e8]/52">
                {t("catalog:categoriesPage.emptyDescription")}
              </p>
            </div>
          )}

          {!isLoading && !isError && categories.length > 0 && (
            <div
              ref={gridRevealRef}
              className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${gridRevealClassName}`}
            >
              {categories.map((category, index) => (
                <EditorialCategoryCard
                  key={category._id || category.slug}
                  category={category}
                  label={t("catalog:category.label")}
                  cta={t("catalog:categoriesPage.cardCta")}
                  className="davinto-reveal-item"
                  cardClassName="min-h-[20rem]"
                  style={{ "--reveal-delay": `${Math.min(index, 8) * 45}ms` }}
                />
              ))}
            </div>
          )}
        </Container>
      </section>
    </>
  );
};

export default Categories;
