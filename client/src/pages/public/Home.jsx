import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import ProductCard from "../../components/product/ProductCard";
import SpinningDavintoLogo from "../../components/home/SpinningDavintoLogo";
import Container from "../../components/ui/Container";
import Button from "../../components/ui/Button";
import SectionLabel from "../../components/ui/SectionLabel";
import useSeo from "../../hooks/useSeo";

import { socialLinks } from "../../constants/socialLinks";
import { getPublicCategoriesRequest } from "../../services/categoryService";
import { getPublicProductsRequest } from "../../services/productService";
import { getCategoryVisual } from "../../utils/categoryVisuals";
import { getLocalizedCategory } from "../../utils/localizedContent";
import { hideBrokenImage } from "../../utils/imageFallback";

const HERO_VIDEO_SOURCES = {
  desktop: {
    poster: "/videos/hero-desktop-poster.webp",
    webm: "/videos/hero-desktop.webm",
    mp4: "/videos/hero-desktop.mp4",
  },
  mobile: {
    poster: "/videos/hero-mobile-poster.webp",
    webm: "/videos/hero-mobile.webm",
    mp4: "/videos/hero-mobile.mp4",
  },
};

const HeroBackgroundVideo = () => {
  const [videoVariant, setVideoVariant] = useState(() => {
    if (typeof window === "undefined") return "desktop";
    return window.matchMedia("(max-width: 767px)").matches
      ? "mobile"
      : "desktop";
  });
  const [shouldRenderVideo, setShouldRenderVideo] = useState(() => {
    if (typeof window === "undefined") return true;
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  const [isVideoAvailable, setIsVideoAvailable] = useState(true);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncVideoState = () => {
      setVideoVariant(mobileQuery.matches ? "mobile" : "desktop");
      setShouldRenderVideo(!motionQuery.matches);
      setIsVideoAvailable(true);
    };

    syncVideoState();
    mobileQuery.addEventListener("change", syncVideoState);
    motionQuery.addEventListener("change", syncVideoState);

    return () => {
      mobileQuery.removeEventListener("change", syncVideoState);
      motionQuery.removeEventListener("change", syncVideoState);
    };
  }, []);

  if (!shouldRenderVideo || !isVideoAvailable) {
    const posterOnlySource = HERO_VIDEO_SOURCES[videoVariant];

    return (
      <div
        className="davinto-hero-poster absolute inset-0"
        style={{ backgroundImage: `url("${posterOnlySource.poster}")` }}
      />
    );
  }

  const source = HERO_VIDEO_SOURCES[videoVariant];

  return (
    <>
      <div
        className="davinto-hero-poster absolute inset-0"
        style={{ backgroundImage: `url("${source.poster}")` }}
      />
      <video
        key={videoVariant}
        className="davinto-hero-video absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={source.poster}
        aria-hidden="true"
        tabIndex={-1}
        onError={() => setIsVideoAvailable(false)}
      >
        <source src={source.webm} type="video/webm" />
        <source src={source.mp4} type="video/mp4" />
      </video>
    </>
  );
};

const Home = () => {
  const { t, i18n } = useTranslation("home");
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";

  // SEO
  useSeo({
    title: t("seo.title"),
    description: t("seo.description"),
    robots: "index,follow",
    og: {
      title: t("seo.title"),
      description: t("seo.ogDescription"),
      type: "website",
      url: window.location.origin,
    },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Store",
      name: "Davinto Store",
      url: window.location.origin,
      sameAs: socialLinks.map((link) => link.href),
      description: t("seo.jsonLdDescription"),
      address: {
        "@type": "PostalAddress",
        addressCountry: "EG",
      },
    },
  });
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
        <HeroBackgroundVideo />
        <div className="absolute inset-0 bg-black/45" />

        <Container className="relative flex min-h-[clamp(36rem,74svh,46rem)] items-end justify-center pb-14 pt-32 text-center sm:pb-16 sm:pt-36 lg:items-center lg:py-24">
          <div className="mx-auto flex max-w-6xl flex-col items-center">
            <SpinningDavintoLogo />

            <SectionLabel className="justify-center pt-5">
              {t("hero.label")}
            </SectionLabel>

            <h1 className="editorial-heading display-heading hero-display-heading mx-auto max-w-5xl text-[#f5f0e8]">
              {t("hero.title")}
            </h1>

            <div className="mt-8 flex w-full max-w-4xl justify-center border-t border-[#f5f0e8]/24 pt-6">

              <div className="flex flex-wrap justify-center gap-3">
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

            <div className="grid gap-4 sm:grid-cols-2">
              {visibleCategories.map((category) => {
                const visual = getCategoryVisual(category);
                const categoryPath = category.slug
                  ? `/category/${category.slug}`
                  : "/shop";
                const content = (
                  <div className="relative min-h-[22rem] overflow-hidden border border-[#f5f0e8]/16 bg-[#110f0e] transition duration-300 group-hover:-translate-y-1 group-hover:border-[#c7a852]/70 group-focus-visible:border-[#c7a852]">
                    {visual.image ? (
                      <img
                        src={visual.image}
                        alt={visual.alt}
                        onError={hideBrokenImage}
                        className="absolute inset-0 h-full w-full object-cover opacity-82 transition duration-700 group-hover:scale-[1.035]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[#28231f]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/44 to-transparent" />
                    <div className="relative flex min-h-[22rem] flex-col justify-end p-5 sm:p-6">
                      <p className="text-[0.58rem] font-black uppercase tracking-[0.24em] text-[#c7a852]">
                        {t("categories.cardLabel")}
                      </p>
                      <h3 className="mt-3 font-serif text-4xl text-[#f5f0e8] transition group-hover:text-[#c7a852] sm:text-5xl">
                        {category.name}
                      </h3>
                      <p className="mt-3 max-w-xs text-sm leading-6 text-[#f5f0e8]/68">
                        {visual.subtitle}
                      </p>
                      <span className="mt-6 inline-flex w-fit items-center gap-2 border border-[#f5f0e8]/18 px-4 py-3 text-[0.62rem] font-black uppercase tracking-[0.18em] text-[#f5f0e8] transition group-hover:border-[#c7a852] group-hover:text-[#c7a852]">
                        {t("categories.cardCta")}
                        <ArrowUpRight size={15} />
                      </span>
                    </div>
                  </div>
                );

                return (
                  <Link
                    key={category._id}
                    to={categoryPath}
                    className="group block focus-visible:outline-offset-4"
                  >
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
