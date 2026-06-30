import { getCategoryImage } from "./resolveLocalImages";

const fallbackCategoryVisuals = {
  blanks: {
    image: "/images/blanks/black/3.webp",
  },
  "art-and-history": {
    image: "/images/art-and-history/1.webp",
  },
};

export const getCategoryVisual = (category = {}, fallbackText = {}) => {
  const slug = String(category.slug || "").toLowerCase();
  const fallback = fallbackCategoryVisuals[slug] || {};
  const slugSubtitle = fallbackText.subtitleBySlug?.[slug];

  return {
    image: getCategoryImage(category) || fallback.image || "",
    alt: category.image?.alt || category.name || fallbackText.alt || "",
    subtitle: category.description || slugSubtitle || fallbackText.subtitle || "",
  };
};
