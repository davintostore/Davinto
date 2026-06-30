import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";

import EditorialCategoryCard from "../../components/category/EditorialCategoryCard";
import ProductCard from "../../components/product/ProductCard";
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
  const categoryCarouselRef = useRef(null);
  const [categoryCarouselState, setCategoryCarouselState] = useState({
    canScrollPrev: false,
    canScrollNext: false,
  });
  const [statementRevealRef, statementRevealClass] = useScrollReveal();
  const [categoriesTextRef, categoriesTextClass] = useScrollReveal();
  const [categoriesGridRef, categoriesGridClass] = useScrollReveal();
  const [bestSellerHeaderRef, bestSellerHeaderClass] = useScrollReveal();
  const [ctaRevealRef, ctaRevealClass] = useScrollReveal();

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

  const visibleCategories =
    categories.length > 0
      ? categories
      : [{ _id: "t-shirts", name: t("categories.heading"), slug: "" }];
  const primaryCategoryPath = "/shop";
  const getCarouselCards = useCallback(() => {
    const carousel = categoryCarouselRef.current;

    if (!carousel) {
      return {
        cards: [],
        activeIndex: 0,
      };
    }

    const cards = Array.from(
      carousel.querySelectorAll('[data-home-category-card="true"]')
    );

    if (cards.length === 0) {
      return {
        cards,
        activeIndex: 0,
      };
    }

    const carouselRect = carousel.getBoundingClientRect();
    const anchor = language === "ar" ? carouselRect.right : carouselRect.left;
    let activeIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const cardRect = card.getBoundingClientRect();
      const cardAnchor = language === "ar" ? cardRect.right : cardRect.left;
      const distance = Math.abs(cardAnchor - anchor);

      if (distance < closestDistance) {
        closestDistance = distance;
        activeIndex = index;
      }
    });

    return {
      cards,
      activeIndex,
    };
  }, [language]);
  const updateCategoryCarouselState = useCallback(() => {
    const { cards, activeIndex } = getCarouselCards();

    setCategoryCarouselState({
      canScrollPrev: activeIndex > 0,
      canScrollNext: activeIndex < cards.length - 1,
    });
  }, [getCarouselCards]);
  const scrollCategoryCarousel = (direction) => {
    const { cards, activeIndex } = getCarouselCards();
    const nextIndex = Math.min(
      Math.max(activeIndex + direction, 0),
      cards.length - 1
    );

    cards[nextIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });

    window.setTimeout(updateCategoryCarouselState, 360);
  };

  useEffect(() => {
    const carousel = categoryCarouselRef.current;

    if (!carousel) return undefined;

    updateCategoryCarouselState();
    carousel.addEventListener("scroll", updateCategoryCarouselState, {
      passive: true,
    });
    window.addEventListener("resize", updateCategoryCarouselState);

    return () => {
      carousel.removeEventListener("scroll", updateCategoryCarouselState);
      window.removeEventListener("resize", updateCategoryCarouselState);
    };
  }, [updateCategoryCarouselState, visibleCategories.length]);

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

            <h1 className="editorial-heading display-heading hero-display-heading mx-auto max-w-5xl text-[#d6b35d]">
              {t("hero.title")}
            </h1>

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
            <div
              ref={categoriesTextRef}
              className={`max-w-xl ${categoriesTextClass}`}
            >
              <StickerLabel>{t("categories.label")}</StickerLabel>
              <h2 className="editorial-heading section-display-title mt-4 text-[#f5f0e8]">
                {t("categories.heading")}
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-7 text-[#f5f0e8]/64">
                {t("categories.description")}
              </p>
            </div>

            <div
              ref={categoriesGridRef}
              className={categoriesGridClass}
            >
              <div className="hidden gap-4 lg:grid lg:grid-cols-3">
                {visibleCategories.map((category, index) => (
                  <EditorialCategoryCard
                    key={category._id || category.slug}
                    category={category}
                    label={t("categories.cardLabel")}
                    cta={t("categories.cardCta")}
                    className="davinto-reveal-item"
                    cardClassName="min-h-[20rem]"
                    style={{ "--reveal-delay": `${Math.min(index, 5) * 55}ms` }}
                  />
                ))}
              </div>

              <div className="mb-3 flex justify-end gap-2 lg:hidden">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center border border-[#050505] bg-[#050505] text-[#f5f0e8] transition hover:border-[#c7a852] hover:text-[#c7a852] disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label={t("common:previous")}
                  disabled={!categoryCarouselState.canScrollPrev}
                  onClick={() => scrollCategoryCarousel(-1)}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center border border-[#050505] bg-[#050505] text-[#f5f0e8] transition hover:border-[#c7a852] hover:text-[#c7a852] disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label={t("common:next")}
                  disabled={!categoryCarouselState.canScrollNext}
                  onClick={() => scrollCategoryCarousel(1)}
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div
                ref={categoryCarouselRef}
                className="davinto-category-carousel -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 lg:hidden"
              >
                {visibleCategories.map((category, index) => (
                  <EditorialCategoryCard
                    key={category._id || category.slug}
                    category={category}
                    label={t("categories.cardLabel")}
                    cta={t("categories.cardCta")}
                    isCarouselCard
                    className="davinto-reveal-item min-w-[78vw] max-w-[21rem] snap-start"
                    cardClassName="min-h-[19rem]"
                    style={{ "--reveal-delay": `${Math.min(index, 5) * 55}ms` }}
                  />
                ))}
              </div>

              <div className="mt-7 flex justify-center">
                <Link to="/categories">
                  <Button className="border-[#050505] bg-[#050505] text-[#f5f0e8] hover:border-[#1c1917] hover:bg-[#1c1917]">
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
          <div
            ref={bestSellerHeaderRef}
            className={`mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between ${bestSellerHeaderClass}`}
          >
            <div>
              <StickerLabel>{t("bestSeller.label")}</StickerLabel>
              <h2 className="editorial-heading section-display-title mt-4">
                {t("bestSeller.title")}
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
          <div ref={ctaRevealRef} className={ctaRevealClass}>
            <div className="mx-auto max-w-5xl">
              <div className="mx-auto max-w-4xl text-left">
                <StickerLabel>{t("cta.label")}</StickerLabel>
                <h2 className="editorial-heading mt-4 text-5xl sm:text-7xl lg:text-8xl">
                  {t("cta.title")}
                </h2>
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
