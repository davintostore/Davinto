import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getCategoryVisual } from "../../utils/categoryVisuals";
import { hideBrokenImage } from "../../utils/imageFallback";

const EditorialCategoryCard = ({
  category,
  label,
  cta,
  className = "",
  cardClassName = "min-h-[21rem]",
  isCarouselCard = false,
  isHomeDesktopCard = false,
  style,
}) => {
  const { t } = useTranslation("catalog");
  const visual = getCategoryVisual(category, {
    alt: t("category.fallbackAlt"),
    subtitle: t("category.fallbackSubtitle"),
    subtitleBySlug: {
      blanks: t("category.fallbackSubtitleBlanks"),
      "art-and-history": t("category.fallbackSubtitleArt"),
    },
  });
  const categoryPath = category.slug ? `/category/${category.slug}` : "/shop";

  if (isCarouselCard) {
    return (
      <Link
        to={categoryPath}
        className={`group block min-w-0 focus-visible:outline-offset-4 ${className}`}
        style={style}
        data-home-category-card="true"
      >
        <div
          className={`relative overflow-hidden border border-[#f5f0e8]/16 bg-[#110f0e] transition duration-300 group-hover:-translate-y-1 group-hover:border-[#c7a852]/70 group-focus-visible:border-[#c7a852] ${cardClassName}`}
        >
          {visual.image ? (
            <img
              src={visual.image}
              alt={visual.alt}
              onError={hideBrokenImage}
              draggable={false}
              onDragStart={(event) => event.preventDefault()}
              className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover opacity-90"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 bg-[#28231f]" />
          )}
          <span
            className="absolute bottom-5 left-1/2 inline-flex min-h-11 min-w-[9.5rem] -translate-x-1/2 items-center justify-center gap-2 whitespace-nowrap border border-[#c7a852]/55 bg-[#0b0a09]/88 px-5 py-3 text-[0.64rem] font-black uppercase tracking-[0.1em] text-[#f5f0e8] shadow-xl backdrop-blur-sm transition group-hover:border-[#c7a852]/85 group-hover:bg-[#110f0e]/96 group-focus-visible:border-[#c7a852]/85 group-focus-visible:bg-[#110f0e]/96 group-active:border-[#c7a852] group-active:bg-[#c7a852] group-active:text-[#15120f]"
            aria-hidden="true"
          >
            {cta}
            <ArrowUpRight size={15} aria-hidden="true" />
          </span>
        </div>

        <h3 className="mt-4 break-words font-serif text-2xl leading-tight text-[#f5f0e8] transition group-hover:text-[#c7a852] group-focus-visible:text-[#c7a852] sm:text-3xl">
          {category.name}
        </h3>
      </Link>
    );
  }

  return (
    <Link
      to={categoryPath}
      className={`group block focus-visible:outline-offset-4 ${className}`}
      style={style}
      data-home-category-card={isCarouselCard ? "true" : undefined}
    >
      <div
        className={`relative overflow-hidden border border-[#f5f0e8]/16 bg-[#110f0e] transition duration-300 group-hover:-translate-y-1 group-hover:border-[#c7a852]/70 group-focus-visible:border-[#c7a852] ${cardClassName}`}
      >
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

        <div
          className={`relative flex min-h-[inherit] flex-col justify-end p-5 sm:p-6 ${
            isHomeDesktopCard ? "pb-24 sm:pb-24" : ""
          }`}
        >
          <p className="text-[0.58rem] font-black uppercase tracking-[0.22em] text-[#c7a852]">
            {label}
          </p>
          <h3 className="mt-3 break-words font-serif text-4xl leading-[0.95] text-[#f5f0e8] transition group-hover:text-[#c7a852] sm:text-5xl">
            {category.name}
          </h3>
          {!isHomeDesktopCard && (
            <span className="mt-6 inline-flex w-fit items-center gap-2 border border-[#f5f0e8]/18 px-4 py-3 text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#f5f0e8] transition group-hover:border-[#c7a852] group-hover:text-[#c7a852] group-active:border-[#c7a852] group-active:bg-[#c7a852] group-active:text-[#15120f]">
              {cta}
              <ArrowUpRight size={15} />
            </span>
          )}
        </div>

        {isHomeDesktopCard && (
          <span className="absolute bottom-5 left-1/2 inline-flex min-h-11 -translate-x-1/2 translate-y-2 items-center gap-2 whitespace-nowrap border border-[#c7a852]/65 bg-[#0b0a09]/90 px-4 py-3 text-[0.58rem] font-black uppercase tracking-[0.12em] text-[#f5f0e8] opacity-0 shadow-xl backdrop-blur-sm transition duration-300 group-hover:translate-y-0 group-hover:border-[#c7a852] group-hover:bg-[#c7a852] group-hover:text-[#15120f] group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:border-[#c7a852] group-focus-visible:bg-[#c7a852] group-focus-visible:text-[#15120f] group-focus-visible:opacity-100 group-active:translate-y-0 group-active:border-[#c7a852] group-active:bg-[#c7a852] group-active:text-[#15120f] group-active:opacity-100">
            {cta}
            <ArrowUpRight size={15} aria-hidden="true" />
          </span>
        )}
      </div>
    </Link>
  );
};

export default EditorialCategoryCard;
