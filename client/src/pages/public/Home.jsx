import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import ProductCard from "../../components/product/ProductCard";
import Container from "../../components/ui/Container";
import Button from "../../components/ui/Button";
import SectionLabel from "../../components/ui/SectionLabel";

import { getPublicCategoriesRequest } from "../../services/categoryService";
import { getPublicProductsRequest } from "../../services/productService";
import { getLocalizedCategory } from "../../utils/localizedContent";

const Home = () => {
  const { t, i18n } = useTranslation("home");
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const { data: productsData } = useQuery({
    queryKey: ["home-products"],
    queryFn: () => getPublicProductsRequest({ sort: "newest", limit: 4 }),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["home-categories"],
    queryFn: getPublicCategoriesRequest,
  });

  const products = useMemo(
    () => productsData?.products?.slice(0, 4) || [],
    [productsData]
  );

  const categories = useMemo(
    () =>
      (categoriesData?.categories?.slice(0, 4) || []).map((category) =>
        getLocalizedCategory(category, language)
      ),
    [categoriesData, language]
  );

  const visibleCategories =
    categories.length > 0
      ? categories
      : [{ _id: "t-shirts", name: t("categories.heading"), slug: "" }];
  const primaryCategoryPath = "/shop";

  return (
    <>
      <section className="relative overflow-hidden border-b border-[#c7a852]/25 bg-[#110f0e]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#110f0e_0%,#110f0e_50%,#882c30_50%,#4a181b_100%)]" />
        <div className="absolute inset-y-0 right-0 hidden w-1/2 border-l border-[#f5f0e8]/10 bg-[linear-gradient(145deg,rgba(199,168,82,.12),rgba(136,44,48,.72)_38%,rgba(17,15,14,.86))] lg:block">
          <p className="brand-wordmark absolute bottom-8 right-8 text-[12rem] leading-none text-[#f5f0e8]/8">
            D
          </p>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(17,15,14,.98)_0%,rgba(17,15,14,.82)_46%,rgba(17,15,14,.22)_100%)]" />

        <Container className="relative flex min-h-[clamp(36rem,74svh,46rem)] items-end pb-14 pt-32 sm:pb-16 sm:pt-36 lg:items-center lg:py-24">
          <div className="max-w-6xl">
            <SectionLabel>{t("hero.label")}</SectionLabel>

            <h1 className="editorial-heading display-heading hero-display-heading max-w-5xl text-[#f5f0e8]">
              {t("hero.title")}
            </h1>

            <div className="mt-8 grid max-w-4xl gap-7 border-t border-[#f5f0e8]/24 pt-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <p className="max-w-xl text-base leading-8 text-[#f5f0e8]/68">
                {t("hero.description")}
              </p>

              <div className="flex flex-wrap gap-3">
                <Link to={primaryCategoryPath}>
                  <Button>{t("hero.shop")}</Button>
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-[#f5f0e8]/10 bg-[#f5f0e8] text-[#1c1917]">
        <Container className="py-4 text-center sm:py-5">
          <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] sm:tracking-[0.22em]">
            {t("features.line")}
          </p>
        </Container>
      </section>

      <section className="border-b border-[#c7a852]/25 bg-[#882c30] py-14 sm:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <div>
              <SectionLabel>{t("categories.label")}</SectionLabel>
              <h2 className="editorial-heading section-display-title mt-4 text-[#f5f0e8]">
                {t("categories.heading")}
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-7 text-[#f5f0e8]/64">
                {t("categories.description")}
              </p>
            </div>

            <div className="grid border-t border-[#f5f0e8]/25">
              {visibleCategories.map((category) => {
                const content = (
                  <div className="group flex items-center justify-between border-b border-[#f5f0e8]/25 py-5 sm:py-6">
                    <span className="font-serif text-3xl text-[#f5f0e8] transition group-hover:text-[#c7a852] sm:text-5xl">
                      {category.name}
                    </span>
                    <ArrowUpRight
                      className="text-[#f5f0e8]/50 transition group-hover:text-[#c7a852]"
                      size={22}
                    />
                  </div>
                );

                return category.slug ? (
                  <Link key={category._id} to={`/category/${category.slug}`}>
                    {content}
                  </Link>
                ) : (
                  <Link key={category._id} to="/shop">
                    {content}
                  </Link>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      <section className="fashion-section">
        <Container>
          <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionLabel>{t("latest.label")}</SectionLabel>
              <h2 className="editorial-heading section-display-title">
                {t("latest.title")}
              </h2>
            </div>
          </div>

          {products.length > 0 ? (
            <>
              <div className="product-grid">
                {products.map((product) => (
                  <ProductCard key={product._id} product={product} />
                ))}
              </div>

              <div className="mt-10 flex justify-center">
                <Link to="/shop">
                  <Button>{t("latest.shopAll")}</Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="grid min-h-80 place-items-center border border-[#f5f0e8]/12 bg-[#28231f] p-8 text-center">
              <div>
                <p className="brand-wordmark text-7xl text-[#f5f0e8]/10">D</p>
                <p className="mt-5 text-[0.64rem] font-black uppercase tracking-[0.25em] text-[#c7a852]">
                  {t("latest.emptyTitle")}
                </p>
                <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[#f5f0e8]/52">
                  {t("latest.emptyDescription")}
                </p>
              </div>
            </div>
          )}
        </Container>
      </section>

      <section className="border-t border-[#c7a852]/25 bg-[#f5f0e8] py-12 text-[#1c1917] sm:py-16">
        <Container>
          <div>
            <div>
              <p className="text-[0.64rem] font-black uppercase tracking-[0.3em] text-[#882c30]">
                {t("cta.label")}
              </p>
              <h2 className="editorial-heading mt-5 max-w-4xl text-5xl sm:text-7xl lg:text-8xl">
                {t("cta.title")}
              </h2>
              <div className="mt-8">
                <Link to="/track-order">
                  <Button>{t("hero.track")}</Button>
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
};

export default Home;
