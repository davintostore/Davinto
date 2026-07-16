import { getCategoryPresentation } from "../data/categoryPresentation";

export const getCategoryVisual = (category = {}, fallbackText = {}) => {
  const slug = String(category.slug || "").toLowerCase();
  const presentation = getCategoryPresentation(category);
  const slugSubtitle = fallbackText.subtitleBySlug?.[slug];

  return {
    image: presentation?.image || "",
    alt: category.name || presentation?.labels?.en || fallbackText.alt || "",
    subtitle: category.description || slugSubtitle || fallbackText.subtitle || "",
  };
};
