import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
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
    queryFn: () => getPublicProductsRequest({ sort: "newest" }),
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

  const campaignImages = products
    .map((product) => product.primaryImage)
    .filter(Boolean)
    .slice(0, 2);

  return (
    <>
      <section className="relative min-h-[calc(100svh-6.5rem)] overflow-hidden border-b border-[#c7a852]/25">
        <div className="absolute inset-0 bg-[#882c30]" />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(17,15,14,.95)_0%,rgba(17,15,14,.72)_45%,rgba(17,15,14,.16)_75%)]" />

        {campaignImages[0] ? (
          <div className="absolute inset-y-0 right-0 w-full opacity-55 sm:w-[58%] lg:opacity-85">
            <img
              src={campaignImages[0]}
              alt=""
              className="h-full w-full object-cover object-center"
            />
          </div>
        ) : (
          <div className="absolute inset-y-0 right-0 w-[56%] bg-[linear-gradient(145deg,#9e3b40,#4d1c20_46%,#1c1917)] opacity-70">
            <div className="absolute inset-8 border border-[#f5f0e8]/15" />
            <p className="brand-wordmark absolute bottom-10 right-8 text-[10rem] leading-none text-[#f5f0e8]/8">
              D
            </p>
          </div>
        )}

        <Container className="relative flex min-h-[calc(100svh-6.5rem)] items-end py-16 sm:py-20 lg:items-center">
          <div className="max-w-5xl">
            <SectionLabel>{t("hero.label")}</SectionLabel>

            <h1 className="editorial-heading max-w-4xl text-[4.7rem] text-[#f5f0e8] sm:text-[7.2rem] lg:text-[9.5rem]">
              {t("hero.title")}
            </h1>

            <div className="mt-8 grid max-w-3xl gap-7 border-t border-[#f5f0e8]/24 pt-6 sm:grid-cols-[1fr_auto] sm:items-end">
              <p className="max-w-xl text-base leading-8 text-[#f5f0e8]/68">
                {t("hero.description")}
              </p>

              <div className="flex flex-wrap gap-3">
                <Link to="/shop">
                  <Button>{t("hero.shop")}</Button>
                </Link>
                <Link to="/track-order">
                  <Button variant="secondary">{t("hero.track")}</Button>
                </Link>
              </div>
            </div>
          </div>
        </Container>

        <div className="absolute bottom-5 right-5 hidden items-center gap-3 text-[0.58rem] font-black uppercase tracking-[0.25em] text-[#f5f0e8]/55 sm:flex">
          {t("hero.scroll")} <ArrowDownRight size={15} />
        </div>
      </section>

      <section className="border-b border-[#f5f0e8]/10 bg-[#f5f0e8] text-[#1c1917]">
        <Container className="grid divide-y divide-[#1c1917]/15 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            ["01", t("features.daily")],
            ["02", t("features.variants")],
            ["03", t("features.delivery")],
          ].map(([number, text]) => (
            <div key={number} className="flex items-center gap-5 py-6 sm:px-6">
              <span className="font-serif text-3xl text-[#882c30]">{number}</span>
              <span className="text-[0.64rem] font-black uppercase tracking-[0.22em]">
                {text}
              </span>
            </div>
          ))}
        </Container>
      </section>

      <section className="fashion-section">
        <Container>
          <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <SectionLabel>{t("latest.label")}</SectionLabel>
              <h2 className="editorial-heading text-6xl sm:text-8xl">
                {t("latest.title")}
              </h2>
            </div>

            <Link
              to="/shop"
              className="flex w-fit items-center gap-3 border-b border-[#c7a852] pb-2 text-[0.64rem] font-black uppercase tracking-[0.24em] text-[#f5f0e8]"
            >
              {t("latest.viewAll")} <ArrowUpRight size={16} />
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
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

      <section className="border-y border-[#c7a852]/25 bg-[#882c30] py-16 sm:py-24">
        <Container>
          <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <div>
              <SectionLabel>{t("categories.label")}</SectionLabel>
              <p className="max-w-sm text-sm leading-7 text-[#f5f0e8]/62">
                {t("categories.description")}
              </p>
            </div>

            <div className="grid border-t border-[#f5f0e8]/25">
              {(categories.length > 0
                ? categories
                : [
                    { _id: "01", name: t("categories.fallbackTops"), slug: "" },
                    {
                      _id: "02",
                      name: t("categories.fallbackBottoms"),
                      slug: "",
                    },
                    {
                      _id: "03",
                      name: t("categories.fallbackOuterwear"),
                      slug: "",
                    },
                  ]
              ).map((category, index) => {
                const content = (
                  <div className="group flex items-center justify-between border-b border-[#f5f0e8]/25 py-5 sm:py-7">
                    <div className="flex items-baseline gap-5">
                      <span className="text-[0.58rem] font-black tracking-[0.2em] text-[#c7a852]">
                        0{index + 1}
                      </span>
                      <span className="font-serif text-3xl text-[#f5f0e8] transition group-hover:translate-x-2 sm:text-5xl">
                        {category.name}
                      </span>
                    </div>
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
                  <div key={category._id}>{content}</div>
                );
              })}
            </div>
          </div>
        </Container>
      </section>

      <section className="fashion-section">
        <Container>
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="relative min-h-[34rem] overflow-hidden border border-[#f5f0e8]/12 bg-[#28231f]">
              {campaignImages[1] ? (
                <img
                  src={campaignImages[1]}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(155deg,#8b8075,#3b322c_54%,#1c1917)]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#110f0e]/80 via-transparent to-transparent" />
              <p className="brand-wordmark absolute bottom-7 left-7 text-6xl text-[#f5f0e8]">
                D/01
              </p>
            </div>

            <div className="flex min-h-[34rem] flex-col justify-between border border-[#c7a852]/25 bg-[#110f0e] p-7 sm:p-12">
              <div>
                <SectionLabel>{t("manifesto.label")}</SectionLabel>
                <h2 className="editorial-heading text-6xl sm:text-8xl">
                  {t("manifesto.title")}
                </h2>
              </div>

              <div className="mt-12">
                <div className="fashion-rule" />
                <p className="mt-7 max-w-xl text-base leading-8 text-[#f5f0e8]/62">
                  {t("manifesto.description")}
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-t border-[#c7a852]/25 bg-[#f5f0e8] py-20 text-[#1c1917] sm:py-28">
        <Container>
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[0.64rem] font-black uppercase tracking-[0.3em] text-[#882c30]">
                {t("cta.label")}
              </p>
              <h2 className="editorial-heading mt-5 max-w-5xl text-6xl sm:text-8xl lg:text-9xl">
                {t("cta.title")}
              </h2>
            </div>

            <Link to="/shop" className="shrink-0">
              <Button>{t("cta.button")}</Button>
            </Link>
          </div>
        </Container>
      </section>
    </>
  );
};

export default Home;
