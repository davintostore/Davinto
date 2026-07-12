import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

import EditorialCategoryCard from "../../components/category/EditorialCategoryCard";
import ProductCard from "../../components/product/ProductCard";
import RevealContent from "../../components/animation/RevealContent";
import SplitText from "../../components/animation/SplitText";
import SpinningDavintoLogo from "../../components/home/SpinningDavintoLogo";
import Container from "../../components/ui/Container";
import Button from "../../components/ui/Button";
import SectionLabel from "../../components/ui/SectionLabel";
import StickerLabel from "../../components/ui/StickerLabel";
import useScrollReveal from "../../hooks/useScrollReveal";
import useSeo from "../../hooks/useSeo";

import { socialLinks } from "../../constants/socialLinks";
import { getPublicCategoriesRequest } from "../../services/categoryService";
import { getPublicProductsRequest } from "../../services/productService";
import { getLocalizedCategory } from "../../utils/localizedContent";

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

const prefersStaticHeroMotion = () => {
  if (typeof window === "undefined") return false;

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const saveData = Boolean(window.navigator.connection?.saveData);

  return reduceMotion || saveData;
};

const HeroBackgroundVideo = () => {
  const videoRef = useRef(null);
  const [videoVariant, setVideoVariant] = useState(() => {
    if (typeof window === "undefined") return "desktop";
    return window.matchMedia("(max-width: 767px)").matches
      ? "mobile"
      : "desktop";
  });
  const [shouldRenderVideo, setShouldRenderVideo] = useState(() => {
    if (typeof window === "undefined") return true;
    return !prefersStaticHeroMotion();
  });
  const [isVideoAvailable, setIsVideoAvailable] = useState(true);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const connection = window.navigator.connection;

    const syncVideoState = () => {
      setVideoVariant(mobileQuery.matches ? "mobile" : "desktop");
      setShouldRenderVideo(!motionQuery.matches && !connection?.saveData);
      setIsVideoAvailable(true);
    };

    syncVideoState();
    mobileQuery.addEventListener("change", syncVideoState);
    motionQuery.addEventListener("change", syncVideoState);
    connection?.addEventListener?.("change", syncVideoState);

    return () => {
      mobileQuery.removeEventListener("change", syncVideoState);
      motionQuery.removeEventListener("change", syncVideoState);
      connection?.removeEventListener?.("change", syncVideoState);
    };
  }, []);

  useEffect(() => {
    if (!shouldRenderVideo || !isVideoAvailable) {
      return undefined;
    }

    const video = videoRef.current;

    if (!video) return undefined;

    let isCancelled = false;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const playHeroVideo = async () => {
      try {
        const playPromise = video.play();

        if (playPromise && typeof playPromise.then === "function") {
          await playPromise;
        }

        if (!isCancelled) {
          setIsVideoPlaying(true);
        }
      } catch {
        if (!isCancelled) {
          setIsVideoPlaying(false);
          setIsVideoAvailable(false);
        }
      }
    };

    playHeroVideo();

    return () => {
      isCancelled = true;
    };
  }, [isVideoAvailable, shouldRenderVideo, videoVariant]);

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
        ref={videoRef}
        key={videoVariant}
        className={`davinto-hero-video absolute inset-0 h-full w-full object-cover ${
          isVideoPlaying ? "davinto-hero-video--playing" : ""
        }`}
        autoPlay
        muted
        loop
        playsInline
        disablePictureInPicture
        preload="metadata"
        poster={source.poster}
        aria-hidden="true"
        tabIndex={-1}
        onLoadStart={() => setIsVideoPlaying(false)}
        onPlaying={() => setIsVideoPlaying(true)}
        onError={() => setIsVideoAvailable(false)}
      >
        <source src={source.webm} type="video/webm" />
        <source src={source.mp4} type="video/mp4" />
      </video>
    </>
  );
};

const Home = () => {
  const { t, i18n } = useTranslation(["home", "common"]);
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";
  const [statementRevealRef, statementRevealClass] = useScrollReveal();

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
  const bestSellerQuery = useQuery({
    queryKey: ["home-products", "best-seller"],
    queryFn: () =>
      getPublicProductsRequest({
        bestSeller: "true",
        sort: "newest",
        limit: 4,
      }),
  });
  const shouldLoadFallbackProducts =
    bestSellerQuery.isError ||
    (!bestSellerQuery.isLoading &&
      !bestSellerQuery.isFetching &&
      (bestSellerQuery.data?.products?.length || 0) === 0);
  const fallbackProductsQuery = useQuery({
    queryKey: ["home-products", "fallback-latest"],
    queryFn: () => getPublicProductsRequest({ sort: "newest", limit: 4 }),
    enabled: shouldLoadFallbackProducts,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["home-categories"],
    queryFn: getPublicCategoriesRequest,
  });

  const products = useMemo(
    () =>
      (bestSellerQuery.data?.products?.length
        ? bestSellerQuery.data.products
        : fallbackProductsQuery.data?.products || []
      ).slice(0, 4),
    [bestSellerQuery.data, fallbackProductsQuery.data]
  );

  const categories = useMemo(
    () =>
      (categoriesData?.categories?.slice(0, 6) || []).map((category) =>
        getLocalizedCategory(category, language)
      ),
    [categoriesData, language]
  );

  const visibleCategories = useMemo(
    () =>
      categories.length > 0
        ? categories
        : [{ _id: "t-shirts", name: t("categories.heading"), slug: "" }],
    [categories, t]
  );
  const [isMobileCategoryCarousel, setIsMobileCategoryCarousel] = useState(
    () =>
      typeof window === "undefined" ||
      window.matchMedia("(max-width: 1023px)").matches
  );
  const categoryAutoplay = useMemo(
    () =>
      Autoplay({
        delay: 5000,
        stopOnFocusIn: false,
        stopOnInteraction: false,
      }),
    []
  );
  const [categoryViewportRef, categoryEmblaApi] = useEmblaCarousel(
    {
      active: isMobileCategoryCarousel,
      align: "start",
      axis: "x",
      direction: "ltr",
      dragFree: false,
      loop: true,
      skipSnaps: false,
      slidesToScroll: 1,
    },
    [categoryAutoplay]
  );
  const [activeCategoryIndex, setActiveCategoryIndex] = useState(0);
  const primaryCategoryPath = "/shop";

  useEffect(() => {
    const mobileCategoryQuery = window.matchMedia("(max-width: 1023px)");
    const syncMobileCategoryCarousel = () =>
      setIsMobileCategoryCarousel(mobileCategoryQuery.matches);

    syncMobileCategoryCarousel();
    mobileCategoryQuery.addEventListener("change", syncMobileCategoryCarousel);

    return () => {
      mobileCategoryQuery.removeEventListener(
        "change",
        syncMobileCategoryCarousel
      );
    };
  }, []);

  const syncSelectedCategory = useCallback((emblaApi) => {
    setActiveCategoryIndex(emblaApi.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!categoryEmblaApi) return undefined;

    categoryEmblaApi.on("init", syncSelectedCategory);
    categoryEmblaApi.on("select", syncSelectedCategory);
    categoryEmblaApi.on("reInit", syncSelectedCategory);

    return () => {
      categoryEmblaApi.off("init", syncSelectedCategory);
      categoryEmblaApi.off("select", syncSelectedCategory);
      categoryEmblaApi.off("reInit", syncSelectedCategory);
    };
  }, [categoryEmblaApi, syncSelectedCategory]);

  const resetCategoryAutoplay = useCallback(() => {
    categoryAutoplay.reset();
  }, [categoryAutoplay]);

  const scrollToPreviousCategory = useCallback(() => {
    categoryEmblaApi?.scrollPrev();
    resetCategoryAutoplay();
  }, [categoryEmblaApi, resetCategoryAutoplay]);

  const scrollToNextCategory = useCallback(() => {
    categoryEmblaApi?.scrollNext();
    resetCategoryAutoplay();
  }, [categoryEmblaApi, resetCategoryAutoplay]);

  const handleCategoryViewportKeyDown = (event) => {
    if (visibleCategories.length <= 1) return;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollToNextCategory();
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollToPreviousCategory();
    }
  };

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

            <SplitText
              as="h1"
              text={t("hero.title")}
              splitType="chars"
              className="editorial-heading display-heading hero-display-heading mx-auto max-w-5xl text-[#d6b35d]"
              from={{ opacity: 0, y: 32 }}
              duration={0.92}
            />

            <div className="mt-8 flex w-full max-w-4xl justify-center pt-6">

              <div className="flex flex-wrap justify-center gap-3">
                <Link to={primaryCategoryPath}>
                  <Button>{t("hero.shop")}</Button>
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="border-b border-[#f5f0e8]/10 bg-[#050505] text-[#d6b35d]">
        <Container className="py-4 text-center sm:py-5">
          <p
            ref={statementRevealRef}
            className={`font-serif text-3xl italic leading-none text-[#d6b35d] sm:text-5xl ${statementRevealClass}`}
          >
            {t("features.line")}
          </p>
        </Container>
      </section>

      <section className="border-b border-[#c7a852]/25 bg-[#882c30] py-14 sm:py-20">
        <Container>
          <div className="grid gap-10 lg:grid-cols-[minmax(13rem,0.65fr)_minmax(0,1.75fr)] lg:items-center">
            <div className="max-w-xl">
              <StickerLabel>{t("categories.label")}</StickerLabel>
              <SplitText
                as="h2"
                text={t("categories.heading")}
                splitType="words"
                className="editorial-heading section-display-title mt-4 text-[#f5f0e8]"
              />
              <p className="mt-5 max-w-sm text-sm leading-7 text-[#f5f0e8]/64">
                {t("categories.description")}
              </p>
            </div>

            <div className="max-lg:min-w-0">
              <div className="hidden gap-4 lg:grid lg:grid-cols-3">
                {visibleCategories.map((category, index) => (
                  <RevealContent
                    key={category._id || category.slug}
                    delay={Math.min(index, 5) * 0.08}
                    duration={0.74}
                    distance={24}
                  >
                    <EditorialCategoryCard
                      category={category}
                      label={t("categories.cardLabel")}
                      cta={t("categories.cardCta")}
                      isHomeDesktopCard
                      cardClassName="min-h-[20rem]"
                    />
                  </RevealContent>
                ))}
              </div>

              <div className="w-full min-w-0 max-w-[calc(100vw-2.5rem)] sm:max-w-[calc(100vw-3rem)] lg:hidden">
                <div
                  ref={categoryViewportRef}
                  className="davinto-category-carousel relative w-full max-w-full overflow-hidden touch-pan-y"
                  dir="ltr"
                  aria-label={t("categories.heading")}
                  style={{ touchAction: "pan-y" }}
                  onKeyDown={handleCategoryViewportKeyDown}
                >
                  <div className="flex touch-pan-y gap-4">
                    {visibleCategories.map((category) => (
                      <div
                        key={category._id || category.slug}
                        className="w-[82vw] flex-none shrink-0 sm:w-[76vw]"
                        data-home-category-slide="true"
                      >
                        <EditorialCategoryCard
                          category={category}
                          label={t("categories.cardLabel")}
                          cta={t("categories.cardCta")}
                          isCarouselCard
                          className="w-full"
                          cardClassName="aspect-[4/5] min-h-0"
                          style={{
                            direction: language === "ar" ? "rtl" : "ltr",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {visibleCategories.length > 1 && (
                  <div
                    className="mx-auto mt-5 flex max-w-xs items-center justify-between gap-8"
                    dir="ltr"
                    aria-label={t("categories.heading")}
                  >
                    <button
                      type="button"
                      onClick={scrollToPreviousCategory}
                      className="davinto-press-icon flex h-10 w-10 items-center justify-center rounded-full border border-[#f5f0e8]/24 bg-[#050505]/12 text-[#f5f0e8] transition hover:border-[#c7a852] hover:bg-[#050505] hover:text-[#c7a852]"
                      aria-label={t("common:previous")}
                    >
                      <ChevronLeft size={19} aria-hidden="true" />
                    </button>

                    <span
                      className="min-w-14 text-center text-sm font-black tabular-nums tracking-[0.12em] text-[#f5f0e8]"
                      aria-live="polite"
                    >
                      {activeCategoryIndex + 1}/{visibleCategories.length}
                    </span>

                    <button
                      type="button"
                      onClick={scrollToNextCategory}
                      className="davinto-press-icon flex h-10 w-10 items-center justify-center rounded-full border border-[#f5f0e8]/24 bg-[#050505]/12 text-[#f5f0e8] transition hover:border-[#c7a852] hover:bg-[#050505] hover:text-[#c7a852]"
                      aria-label={t("common:next")}
                    >
                      <ChevronRight size={19} aria-hidden="true" />
                    </button>
                  </div>
                )}

                <div className="relative z-10 mt-7 flex justify-center">
                  <Link to="/categories">
                    <Button className="border-[#050505] bg-[#050505] text-[#f5f0e8] hover:border-[#c7a852] hover:bg-[#c7a852] hover:text-[#110f0e]">
                      {t("categories.viewAll")}
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="mt-7 hidden justify-center lg:flex">
                <Link to="/categories">
                  <Button className="border-[#050505] bg-[#050505] text-[#f5f0e8] hover:border-[#c7a852] hover:bg-[#c7a852] hover:text-[#110f0e]">
                    {t("categories.viewAll")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <section className="fashion-section bg-[#050505]">
        <Container>
          <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <StickerLabel>{t("bestSeller.label")}</StickerLabel>
              <SplitText
                as="h2"
                text={t("bestSeller.title")}
                splitType="words"
                className="editorial-heading section-display-title mt-4"
              />
            </div>
          </div>

          {products.length > 0 ? (
            <>
              <div className="product-grid">
                {products.map((product, index) => (
                  <ProductCard
                    key={product._id}
                    product={product}
                    revealDelay={Math.min(index, 3) * 0.08}
                  />
                ))}
              </div>

              <div className="mt-10 flex justify-center">
                <Link to="/shop">
                  <Button>{t("bestSeller.shopAll")}</Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="grid min-h-80 place-items-center border border-[#f5f0e8]/12 bg-[#28231f] p-8 text-center">
              <div>
                <p className="brand-wordmark text-7xl text-[#f5f0e8]/10">D</p>
                <p className="mt-5 text-[0.64rem] font-black uppercase tracking-[0.25em] text-[#c7a852]">
                  {t("bestSeller.emptyTitle")}
                </p>
                <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-[#f5f0e8]/52">
                  {t("bestSeller.emptyDescription")}
                </p>
              </div>
            </div>
          )}
        </Container>
      </section>

      <section className="border-t border-[#c7a852]/25 bg-[#f5f0e8] py-12 text-[#1c1917] sm:py-16">
        <Container>
          <div>
            <div className="mx-auto max-w-5xl">
              <div className="mx-auto max-w-4xl text-left">
                <StickerLabel>{t("cta.label")}</StickerLabel>
                <SplitText
                  as="h2"
                  text={t("cta.title")}
                  splitType="words"
                  className="editorial-heading davinto-cta-heading mt-4 text-5xl sm:text-7xl lg:text-8xl"
                  from={{ opacity: 0, y: 30 }}
                />
              </div>
              <div className="mt-8 text-center">
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
