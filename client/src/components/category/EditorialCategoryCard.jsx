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

        <div className="relative flex min-h-[inherit] flex-col justify-end p-5 sm:p-6">
          <p className="text-[0.58rem] font-black uppercase tracking-[0.22em] text-[#c7a852]">
            {label}
          </p>
          <h3 className="mt-3 break-words font-serif text-4xl leading-[0.95] text-[#f5f0e8] transition group-hover:text-[#c7a852] sm:text-5xl">
            {category.name}
          </h3>
          <p className="mt-3 line-clamp-2 max-w-xs text-sm leading-6 text-[#f5f0e8]/68">
            {visual.subtitle}
          </p>
          <span className="mt-6 inline-flex w-fit items-center gap-2 border border-[#f5f0e8]/18 px-4 py-3 text-[0.62rem] font-black uppercase tracking-[0.16em] text-[#f5f0e8] transition group-hover:border-[#c7a852] group-hover:text-[#c7a852]">
            {cta}
            <ArrowUpRight size={15} />
          </span>
        </div>
      </div>
    </Link>
  );
};

export default EditorialCategoryCard;
