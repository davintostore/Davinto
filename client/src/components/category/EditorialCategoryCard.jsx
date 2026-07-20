import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import CategoryIcon from "./CategoryIcon";
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
  const { t, i18n } = useTranslation("catalog");
  const isArabicCarouselCard =
    isCarouselCard && i18n.resolvedLanguage === "ar";
  const visual = getCategoryVisual(category, {
    alt: t("category.fallbackAlt"),
    subtitle: t("category.fallbackSubtitle"),
  });
  const categoryPath = category.slug ? `/category/${category.slug}` : "/shop";

  return (
    <Link
      to={categoryPath}
      className={`owner-category-card group block min-w-0 rounded-2xl focus-visible:outline-offset-4 ${className}`}
      style={style}
      data-home-category-card={isCarouselCard ? "true" : undefined}
    >
      <div
        className={`relative overflow-hidden rounded-2xl bg-[#1c1917] shadow-[0_1rem_2.5rem_rgba(28,25,23,0.13)] ${cardClassName}`}
      >
        {visual.image ? (
          <img
            src={visual.image}
            alt={visual.alt}
            onError={hideBrokenImage}
            draggable={!isCarouselCard}
            onDragStart={
              isCarouselCard ? (event) => event.preventDefault() : undefined
            }
            className="owner-category-card__image pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 z-0 bg-[#8b8075]" />
        )}

        <div className="owner-category-card__overlay absolute inset-0 z-10 bg-black/45" />

        <div
          dir={isArabicCarouselCard ? "ltr" : undefined}
          className={`owner-category-card__content z-20 flex flex-col justify-between p-6 sm:p-7 ${
            isCarouselCard ? "absolute inset-0" : "relative min-h-[inherit]"
          } ${isArabicCarouselCard ? "items-end text-right" : ""}`}
        >
          <span
            className={`category-card-icon owner-category-card__icon flex h-11 w-11 items-center justify-center rounded-full border border-[#c7a852]/70 bg-[#1c1917]/55 backdrop-blur-sm ${
              isArabicCarouselCard ? "self-end" : "self-start"
            }`}
          >
            <CategoryIcon category={category} size={21} />
          </span>

          <div
            className={`owner-category-card__lower ${
              isArabicCarouselCard
                ? "flex flex-col items-end text-right"
                : "text-start"
            }`}
          >
            {label && !isCarouselCard && (
              <p className="category-card-eyebrow mb-3 text-[0.58rem] font-black uppercase tracking-[0.22em]">
                {label}
              </p>
            )}
            <h3
              dir={isArabicCarouselCard ? "rtl" : undefined}
              className={`category-card-title max-w-[90%] break-words font-serif text-3xl leading-[1.02] sm:text-4xl ${
                isArabicCarouselCard
                  ? "owner-category-card__title--arabic-mobile"
                  : "me-auto"
              }`}
            >
              {category.name}
            </h3>
            <span
              dir={isArabicCarouselCard ? "rtl" : undefined}
              className="category-card-cta mt-4 inline-flex items-center gap-2 text-[0.62rem] font-black uppercase tracking-[0.16em]"
            >
              {cta}
              {!isCarouselCard && (
                <ArrowRight
                  size={15}
                  className="category-card-arrow owner-category-card__arrow"
                  aria-hidden="true"
                />
              )}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default EditorialCategoryCard;
