const CATEGORY_PRESENTATION = [
  {
    slug: "nature-botanical",
    aliases: ["nature-botanical", "nature-and-botanical", "Nature & Botanical"],
    image: "/images/categories/nature-category.webp",
    labels: { en: "Nature & Botanical", ar: "طبيعة ونباتات" },
    icon: "leaf",
    order: 1,
  },
  {
    slug: "music-culture",
    aliases: ["music-culture", "music-and-culture", "Music & Culture"],
    image: "/images/categories/music-category.webp",
    labels: { en: "Music & Culture", ar: "موسيقى وثقافة" },
    icon: "music",
    order: 2,
  },
  {
    slug: "words",
    aliases: ["words", "Words"],
    image: "/images/categories/words-category.webp",
    labels: { en: "Words", ar: "كلمات" },
    icon: "words",
    order: 3,
  },
  {
    slug: "graphic-design",
    aliases: ["graphic-design", "graphic", "Graphic Design"],
    image: "/images/categories/graphic-category.webp",
    labels: { en: "Graphic Design", ar: "تصميم جرافيك" },
    icon: "pen",
    order: 4,
  },
  {
    slug: "blanks",
    aliases: ["blanks", "blank", "Blanks"],
    image: "/images/categories/blank-category.webp",
    labels: { en: "Blanks", ar: "أساسيات سادة" },
    icon: "square",
    order: 5,
  },
  {
    slug: "art-history",
    aliases: [
      "art-history",
      "art-and-history",
      "Art & History",
      "Art and History",
    ],
    image: "/images/categories/art-category.webp",
    labels: { en: "Art and History", ar: "فن وتاريخ" },
    icon: "landmark",
    order: 6,
  },
];

const normalizeCategoryKey = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const presentationByAlias = new Map();

CATEGORY_PRESENTATION.forEach((entry) => {
  [entry.slug, ...entry.aliases].forEach((alias) => {
    presentationByAlias.set(normalizeCategoryKey(alias), entry);
  });
});

export const canonicalCategoryPresentation = CATEGORY_PRESENTATION;

export const getCategoryPresentation = (categoryOrSlug) => {
  const category =
    typeof categoryOrSlug === "object" && categoryOrSlug !== null
      ? categoryOrSlug
      : { slug: categoryOrSlug };

  return (
    presentationByAlias.get(normalizeCategoryKey(category.slug)) ||
    presentationByAlias.get(normalizeCategoryKey(category.name)) ||
    null
  );
};

export const getPresentedCategories = (categories = [], language = "en") => {
  const categoryByCanonicalSlug = new Map();

  categories.forEach((category) => {
    const presentation = getCategoryPresentation(category);
    if (presentation && !categoryByCanonicalSlug.has(presentation.slug)) {
      categoryByCanonicalSlug.set(presentation.slug, category);
    }
  });

  return CATEGORY_PRESENTATION.flatMap((presentation) => {
    const category = categoryByCanonicalSlug.get(presentation.slug);
    if (!category) return [];

    const translatedName = String(category.translations?.ar?.name || "").trim();
    const databaseName = String(category.name || "").trim();
    const name =
      language === "ar"
        ? translatedName || presentation.labels.ar
        : databaseName || presentation.labels.en;

    return [{
      ...category,
      name,
      image: {
        ...(category.image || {}),
        url: presentation.image,
        alt: name,
      },
      presentation,
    }];
  });
};

export const allCategoriesPresentation = {
  slug: "all-categories",
  labels: { en: "All Categories", ar: "كل الفئات" },
  icon: "grid",
  order: 0,
};
