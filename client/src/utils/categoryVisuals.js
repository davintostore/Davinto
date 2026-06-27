import { getCategoryImage } from "./resolveLocalImages";

const fallbackCategoryVisuals = {
  blanks: {
    image: "/images/blanks/black/3.webp",
    subtitle: "Essential blanks in Davinto colors.",
  },
  "art-and-history": {
    image: "/images/art-and-history/1.webp",
    subtitle: "Art-led graphics from the current collection.",
  },
};

export const getCategoryVisual = (category = {}) => {
  const slug = String(category.slug || "").toLowerCase();
  const fallback = fallbackCategoryVisuals[slug] || {};

  return {
    image: getCategoryImage(category) || fallback.image || "",
    alt: category.image?.alt || category.name || "Davinto category",
    subtitle: category.description || fallback.subtitle || "Shop the collection.",
  };
};
