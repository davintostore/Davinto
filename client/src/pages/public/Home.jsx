import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

import EditorialCategoryCard from "../../components/category/EditorialCategoryCard";
import ProductCard from "../../components/product/ProductCard";
import SplitText from "../../components/animation/SplitText";
import SpinningDavintoLogo from "../../components/home/SpinningDavintoLogo";
import Container from "../../components/ui/Container";
import Button from "../../components/ui/Button";
import SectionLabel from "../../components/ui/SectionLabel";
import StickerLabel from "../../components/ui/StickerLabel";
import useSeo from "../../hooks/useSeo";

import { socialLinks } from "../../constants/socialLinks";
import { getPresentedCategories } from "../../data/categoryPresentation";
import { getPublicCategoriesRequest } from "../../services/categoryService";
import { getPublicProductsRequest } from "../../services/productService";

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
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    Boolean(window.navigator.connection?.saveData)
  );
};

const HeroBackgroundVideo = () => {
  const videoRef = useRef(null);
  const [videoVariant, setVideoVariant] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches
      ? "mobile"
      : "desktop"
  );
  const [shouldRenderVideo, setShouldRenderVideo] = useState(
    () => typeof window === "undefined" || !prefersStaticHeroMotion()
  );
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
    const video = videoRef.current;
    if (!shouldRenderVideo || !isVideoAvailable || !video) return undefined;

    let isCancelled = false;
    const playVideo = async () => {
      try {
        await video.play();
        if (!isCancelled) setIsVideoPlaying(true);
      } catch {
        if (!isCancelled) {
          setIsVideoPlaying(false);
          setIsVideoAvailable(false);
        }
      }
    };
    playVideo();
    return () => {
      isCancelled = true;
    };
  }, [isVideoAvailable, shouldRenderVideo, videoVariant]);

  const source = HERO_VIDEO_SOURCES[videoVariant];
  return (
    <>
      <div
        className="davinto-hero-poster absolute inset-0"
        style={{ backgroundImage: `url("${source.poster}")` }}
      />
      {shouldRenderVideo && isVideoAvailable && (
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
          onPlaying={() => setIsVideoPlaying(true)}
          onError={() => setIsVideoAvailable(false)}
        >
          <source src={source.webm} type="video/webm" />
          <source src={source.mp4} type="video/mp4" />
        </video>
      )}
    </>
  );
};

const HomeEditorialBanner = ({
  image,
  eyebrow,
  title,
  body,
  button,
  to,
  language,
  type,
}) => (
  <section
    className={`owner-home-banner owner-home-banner--${type} relative flex overflow-hidden bg-cover bg-no-repeat text-[#1c1917]`}
    style={{ backgroundImage: `url("${image}")` }}
    aria-label={title}
  >
    {type === "story" && (
      <div
        className={`owner-home-banner__overlay pointer-events-none absolute inset-0 ${
          language === "ar" ? "owner-home-banner__overlay--rtl" : ""
        }`}
        aria-hidden="true"
      />
    )}
    <Container className="owner-home-banner__container relative flex w-full items-center">
      <div
        dir={language === "ar" ? "rtl" : "ltr"}
        className={`owner-home-banner__copy flex w-full flex-col ${
          language === "ar"
            ? "owner-home-banner__copy--rtl ml-auto items-end text-right"
            : "owner-home-banner__copy--ltr mr-auto items-start"
        }`}
      >
          <StickerLabel className="owner-home-banner__sticker">
            {eyebrow}
          </StickerLabel>
          <SplitText
            as="h2"
            text={title}
            splitType={title.includes("\n") ? "lines" : "words"}
            className="owner-home-banner__title font-serif"
            textAlign={language === "ar" ? "right" : "left"}
          />
          <p className="owner-home-banner__body text-[#8b8075]">
            {body}
          </p>
          <Link
            to={to}
            className="owner-home-banner__action owner-home-banner__inline-cta inline-flex items-center"
          >
            {button}
            <ArrowRight
              className="owner-home-banner__cta-arrow ms-2"
              size={13}
              aria-hidden="true"
            />
          </Link>
      </div>
    </Container>
  </section>
);

const Home = () => {
  const { t, i18n } = useTranslation(["home", "common"]);
  const language = i18n.resolvedLanguage === "ar" ? "ar" : "en";

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
      address: { "@type": "PostalAddress", addressCountry: "EG" },
    },
  });

  const bestSellerQuery = useQuery({
    queryKey: ["home-products", "best-seller"],
    queryFn: () =>
      getPublicProductsRequest({ bestSeller: "true", sort: "newest", limit: 4 }),
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
    () => getPresentedCategories(categoriesData?.categories || [], language),
    [categoriesData, language]
  );

  const categoryAutoplay = useMemo(
    () => Autoplay({ delay: 5000, stopOnFocusIn: false, stopOnInteraction: false }),
    []
  );
  const [isMobileCategoryCarousel, setIsMobileCategoryCarousel] = useState(
    () =>
      typeof window === "undefined" ||
      window.matchMedia("(max-width: 1023px)").matches
  );
  const [categoryViewportRef] = useEmblaCarousel(
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
  useEffect(() => {
    const mobileCategoryQuery = window.matchMedia("(max-width: 1023px)");
    const syncMobileCategoryCarousel = () =>
      setIsMobileCategoryCarousel(mobileCategoryQuery.matches);

    syncMobileCategoryCarousel();
    mobileCategoryQuery.addEventListener("change", syncMobileCategoryCarousel);
    return () =>
      mobileCategoryQuery.removeEventListener(
        "change",
        syncMobileCategoryCarousel
      );
  }, []);

  return (
    <>
      <section className="davinto-dark-section relative overflow-hidden border-b border-[#c7a852]/25 bg-[#1c1917]">
        <HeroBackgroundVideo />
        <div className="absolute inset-0 bg-black/45" />
        <Container className="relative flex min-h-[clamp(36rem,74svh,46rem)] items-end justify-center pb-14 pt-32 text-center sm:pb-16 sm:pt-36 lg:items-center lg:py-24">
          <div className="mx-auto flex max-w-6xl flex-col items-center">
            <SpinningDavintoLogo />
            <SectionLabel className="justify-center pt-5">{t("hero.label")}</SectionLabel>
            <SplitText
              as="h1"
              text={t("hero.title")}
              splitType="chars"
              className="editorial-heading display-heading hero-display-heading mx-auto max-w-5xl text-[#c7a852]"
              from={{ opacity: 0, y: 32 }}
              duration={0.92}
            />
            <Link to="/shop" className="mt-8">
              <Button>{t("hero.shop")}</Button>
            </Link>
          </div>
        </Container>
      </section>

      <section className="bg-[#f5f0e8] py-14 text-[#1c1917] sm:py-20 lg:py-24">
        <Container>
          <div className="mb-9 flex items-end justify-between gap-5">
            <div>
              <StickerLabel>{t("categories.label")}</StickerLabel>
              <SplitText
                as="h2"
                text={t("categories.heading")}
                splitType="words"
                className="editorial-heading mt-4 text-4xl sm:text-6xl"
              />
            </div>
            <Link
              to="/categories"
              className="group hidden items-center gap-2 text-sm font-bold text-[#1c1917] sm:inline-flex"
            >
              {t("categories.viewAll")}
              <ArrowRight className="transition-transform group-hover:translate-x-1" size={17} />
            </Link>
          </div>

          {categories.length === 0 && (
            <div className="rounded-xl border border-[#8b8075]/30 p-8 text-center text-[#8b8075]">
              {t("categories.empty")}
            </div>
          )}

          <div className={`grid-cols-3 gap-5 ${categories.length > 0 ? "hidden lg:grid" : "hidden"}`}>
            {categories.map((category) => (
              <EditorialCategoryCard
                key={category.slug}
                category={category}
                cta={t("categories.cardCta")}
                cardClassName="aspect-[1.45/1] min-h-[17rem]"
              />
            ))}
          </div>

          <div className={`${categories.length > 0 ? "min-w-0 lg:hidden" : "hidden"}`}>
            <div
              ref={categoryViewportRef}
              className="davinto-category-carousel overflow-hidden touch-pan-y"
              dir="ltr"
              style={{ touchAction: "pan-y" }}
              aria-label={t("categories.heading")}
            >
              <div className="davinto-category-carousel__track flex touch-pan-y">
                {categories.map((category) => (
                  <div
                    key={category.slug}
                    className="davinto-category-carousel__slide w-[82vw] flex-none sm:w-[62vw]"
                  >
                    <EditorialCategoryCard
                      category={category}
                      label={t("categories.cardLabel")}
                      cta={t("categories.cardCta")}
                      isCarouselCard
                      cardClassName="aspect-[4/5] min-h-0"
                      style={{ direction: language === "ar" ? "rtl" : "ltr" }}
                    />
                  </div>
                ))}
              </div>
            </div>
            <Link to="/categories" className="mt-7 flex justify-center">
              <Button variant="secondary">{t("categories.viewAll")}</Button>
            </Link>
          </div>
        </Container>
      </section>

      <HomeEditorialBanner
        image={`/images/bg/our-story-${language}.webp`}
        eyebrow={t("ourStory.eyebrow")}
        title={t("ourStory.title")}
        body={t("ourStory.body")}
        button={t("ourStory.button")}
        to="/shop"
        language={language}
        type="story"
      />

      <section className="davinto-dark-section fashion-section bg-[#1c1917] text-[#f5f0e8]">
        <Container>
          <div className="mb-10">
            <StickerLabel>{t("bestSeller.label")}</StickerLabel>
            <SplitText
              as="h2"
              text={t("bestSeller.title")}
              splitType="words"
              className="editorial-heading section-display-title mt-4 text-[#f5f0e8]"
            />
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
                <Link to="/shop"><Button>{t("bestSeller.shopAll")}</Button></Link>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-[#f5f0e8]/12 p-10 text-center text-[#8b8075]">
              {t("bestSeller.emptyDescription")}
            </div>
          )}
        </Container>
      </section>

      <HomeEditorialBanner
        image={`/images/bg/home-track-order-${language}.webp`}
        eyebrow={t("trackOrder.eyebrow")}
        title={t("trackOrder.title")}
        body={t("trackOrder.body")}
        button={t("trackOrder.button")}
        to="/track-order"
        language={language}
        type="track"
      />
    </>
  );
};

export default Home;
