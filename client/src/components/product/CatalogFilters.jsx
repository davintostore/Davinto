import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { SlidersHorizontal, X } from "lucide-react";

import Button from "../ui/Button";
import Input from "../ui/Input";
import useFocusTrap from "../../hooks/useFocusTrap";
import { getLocalizedCategory } from "../../utils/localizedContent";

const fallbackColors = [
  {
    slug: "black",
    name: "Black",
    hex: "#111111",
    translations: { ar: { name: "أسود" } },
  },
  {
    slug: "white",
    name: "White",
    hex: "#f7f3ea",
    translations: { ar: { name: "أبيض" } },
  },
  {
    slug: "beige",
    name: "Beige",
    hex: "#d7c7ad",
    translations: { ar: { name: "بيج" } },
  },
  {
    slug: "pink",
    name: "Pink",
    hex: "#f4a7b9",
    translations: { ar: { name: "وردي" } },
  },
];

const launchColorOrder = ["white", "black", "beige", "pink"];
const launchColorRank = new Map(
  launchColorOrder.map((slug, index) => [slug, index])
);

const sortOptions = [
  { value: "newest", key: "sortNewest" },
  { value: "price_asc", key: "sortPriceLow" },
  { value: "price_desc", key: "sortPriceHigh" },
  { value: "name_asc", key: "sortNameAsc" },
  { value: "name_desc", key: "sortNameDesc" },
];

const PRICE_RANGE_MIN = 0;
const PRICE_RANGE_MAX = 3000;

const hasArabicText = (value) => /[\u0600-\u06ff]/.test(String(value || ""));

const getColorLabel = (color, language, t) => {
  if (language === "ar" && hasArabicText(color.translations?.ar?.name)) {
    return color.translations.ar.name;
  }

  return color.name || t(`filters.colors.${color.slug}`, { defaultValue: color.slug });
};

const getActiveFilterCount = (filters = {}) => {
  return [
    filters.search,
    filters.category,
    filters.color,
    filters.minPrice,
    filters.maxPrice,
    filters.availability && filters.availability !== "all",
  ].filter(Boolean).length;
};

const sortColors = (colors) => {
  return [...colors].sort((a, b) => {
    const aSlug = String(a.slug || "").toLowerCase();
    const bSlug = String(b.slug || "").toLowerCase();
    const aRank = launchColorRank.has(aSlug)
      ? launchColorRank.get(aSlug)
      : Number.POSITIVE_INFINITY;
    const bRank = launchColorRank.has(bSlug)
      ? launchColorRank.get(bSlug)
      : Number.POSITIVE_INFINITY;

    if (aRank !== bRank) return aRank - bRank;
    return aSlug.localeCompare(bSlug, "en");
  });
};

const clampNumber = (value, min, max) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) return min;

  return Math.min(Math.max(numericValue, min), max);
};

const AccordionSection = ({ title, children, isOpen, onToggle }) => {
  return (
    <section className="border-b border-[#f5f0e8]/12 py-4">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-4 text-left text-[0.7rem] font-black uppercase tracking-[0.18em] text-[#c7a852]"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span>{title}</span>
        <span className="text-lg leading-none text-[#f5f0e8]/60" aria-hidden="true">
          {isOpen ? "-" : "+"}
        </span>
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="pt-4">{children}</div>
        </div>
      </div>
    </section>
  );
};

const CatalogFilters = ({
  filters,
  metadata,
  categories = [],
  currentCategory = null,
  productCount = 0,
  language,
  t,
  onSearchChange,
  onSortChange,
  onCategoryChange,
  onToggleColor,
  onAvailabilityChange,
  onApplyPrice,
  onClearFilters,
  hasActiveFilters,
}) => {
  const location = useLocation();
  const currentRouteKey = `${location.pathname}?${location.search}`;
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [sortRouteKey, setSortRouteKey] = useState("");
  const [openFilterSections, setOpenFilterSections] = useState({
    availability: false,
    price: false,
    productType: false,
    color: false,
  });
  const sortRef = useRef(null);
  const [priceDraft, setPriceDraft] = useState({
    minPrice: filters.minPrice || "",
    maxPrice: filters.maxPrice || "",
  });
  const activeFilterCount = getActiveFilterCount(filters);
  const selectedColors = useMemo(
    () =>
      String(filters.color || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    [filters.color]
  );
  const colors = useMemo(() => {
    const metadataColors = Array.isArray(metadata?.colors) ? metadata.colors : [];
    const sourceColors = metadataColors.length > 0 ? metadataColors : fallbackColors;
    const colorsBySlug = new Map();

    sourceColors.forEach((color) => {
      const slug = String(color?.slug || "").trim();
      if (!slug) return;

      const normalizedColor = {
        ...color,
        slug,
        count: Number(color?.count ?? 0),
      };

      colorsBySlug.set(slug, normalizedColor);
    });

    selectedColors.forEach((slug) => {
      if (colorsBySlug.has(slug)) return;

      const fallbackColor = fallbackColors.find((color) => color.slug === slug);
      colorsBySlug.set(slug, fallbackColor || { slug, name: slug, hex: "#777" });
    });

    return sortColors(Array.from(colorsBySlug.values()));
  }, [metadata, selectedColors]);

  const localizedCategories = useMemo(() => {
    const categoriesByKey = new Map();

    categories.forEach((category) => {
      const localizedCategory = getLocalizedCategory(category, language);
      const key = String(
        localizedCategory.slug ||
          localizedCategory._id ||
          localizedCategory.name ||
          ""
      )
        .trim()
        .toLowerCase();

      if (!key || categoriesByKey.has(key)) return;

      categoriesByKey.set(key, localizedCategory);
    });

    return Array.from(categoriesByKey.values());
  }, [categories, language]);
  const selectedSort =
    sortOptions.find((option) => option.value === filters.sort) ||
    sortOptions[0];
  const isSortMenuOpen = isSortOpen && sortRouteKey === currentRouteKey;
  const sliderMinPrice = PRICE_RANGE_MIN;
  const sliderMaxPrice = PRICE_RANGE_MAX;
  const normalizedPriceDraft = useMemo(() => {
    const minValue = clampNumber(
      priceDraft.minPrice === "" ? sliderMinPrice : priceDraft.minPrice,
      sliderMinPrice,
      sliderMaxPrice
    );
    const maxValue = clampNumber(
      priceDraft.maxPrice === "" ? sliderMaxPrice : priceDraft.maxPrice,
      sliderMinPrice,
      sliderMaxPrice
    );

    return {
      minValue: Math.min(minValue, maxValue),
      maxValue: Math.max(minValue, maxValue),
    };
  }, [priceDraft, sliderMinPrice, sliderMaxPrice]);
  const rangeSize = Math.max(sliderMaxPrice - sliderMinPrice, 1);
  const rangeMinPercent =
    ((normalizedPriceDraft.minValue - sliderMinPrice) / rangeSize) * 100;
  const rangeMaxPercent =
    ((normalizedPriceDraft.maxValue - sliderMinPrice) / rangeSize) * 100;
  const hasPriceDraft = Boolean(priceDraft.minPrice || priceDraft.maxPrice);
  const priceInputValues = {
    minPrice:
      priceDraft.minPrice === ""
        ? String(sliderMinPrice)
        : String(normalizedPriceDraft.minValue),
    maxPrice:
      priceDraft.maxPrice === ""
        ? String(sliderMaxPrice)
        : String(normalizedPriceDraft.maxValue),
  };

  const buildPricePayload = () => ({
    minPrice:
      normalizedPriceDraft.minValue > sliderMinPrice
        ? String(Math.round(normalizedPriceDraft.minValue))
        : "",
    maxPrice:
      normalizedPriceDraft.maxValue < sliderMaxPrice
        ? String(Math.round(normalizedPriceDraft.maxValue))
        : "",
  });

  useEffect(() => {
    if (!isSortMenuOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!sortRef.current?.contains(event.target)) {
        setIsSortOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsSortOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSortMenuOpen]);

  const toggleSortMenu = () => {
    if (isSortMenuOpen) {
      setIsSortOpen(false);
      return;
    }

    setSortRouteKey(currentRouteKey);
    setIsSortOpen(true);
  };

  const openFilterDrawer = () => {
    setOpenFilterSections({
      availability: false,
      price: false,
      productType: false,
      color: false,
    });
    setPriceDraft({
      minPrice: filters.minPrice || "",
      maxPrice: filters.maxPrice || "",
    });
    setIsFilterOpen(true);
  };

  const closeFilterDrawer = () => {
    setIsFilterOpen(false);
  };

  const filterDrawerRef = useFocusTrap({
    isActive: isFilterOpen,
    onEscape: closeFilterDrawer,
    lockScroll: true,
    lockHtmlScroll: true,
  });

  const toggleFilterSection = (section) => {
    setOpenFilterSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  };

  const applyPriceDraft = () => {
    onApplyPrice(buildPricePayload());
  };

  const applyDrawer = () => {
    onApplyPrice(buildPricePayload());
    closeFilterDrawer();
  };

  const handleClearFilters = () => {
    setPriceDraft({
      minPrice: "",
      maxPrice: "",
    });
    onClearFilters();
  };

  const updatePriceDraft = (field, value) => {
    if (value === "") {
      setPriceDraft((current) => ({
        ...current,
        [field]: "",
      }));
      return;
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) return;

    if (field === "minPrice") {
      setPriceDraft((current) => ({
        ...current,
        minPrice: String(
          clampNumber(numericValue, sliderMinPrice, normalizedPriceDraft.maxValue)
        ),
      }));
      return;
    }

    setPriceDraft((current) => ({
      ...current,
      maxPrice: String(
        clampNumber(numericValue, normalizedPriceDraft.minValue, sliderMaxPrice)
      ),
    }));
  };

  const filterDrawer =
    isFilterOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={filterDrawerRef}
            id="catalog-filter-drawer"
            className="fixed inset-0 z-[150]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="catalog-filter-title"
            tabIndex={-1}
          >
            <button
              type="button"
              className="fixed inset-0 bg-[#050505]/58"
              aria-label={t("filters.close")}
              tabIndex={-1}
              onClick={closeFilterDrawer}
            />

            <aside className="cart-drawer-panel fixed bottom-0 right-0 top-0 flex w-[min(88vw,28rem)] max-w-[28rem] flex-col overflow-hidden border-l border-[#c7a852]/30 bg-[#110f0e] shadow-2xl sm:w-[26rem] lg:w-[28rem]">
              <div className="flex shrink-0 items-center justify-between border-b border-[#f5f0e8]/12 p-5">
                <div>
                  <p
                    id="catalog-filter-title"
                    className="text-[0.74rem] font-black uppercase tracking-[0.18em] text-[#c7a852]"
                  >
                    {t("filters.title")}
                  </p>
                  <p className="mt-1 text-xs text-[#f5f0e8]/45">
                    {activeFilterCount > 0
                      ? t("filters.activeCount", { count: activeFilterCount })
                      : t("filters.description")}
                  </p>
                </div>

                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center text-[#f5f0e8]/72 transition hover:text-[#c7a852]"
                  aria-label={t("filters.close")}
                  onClick={closeFilterDrawer}
                  data-autofocus
                >
                  <X size={17} />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5">
                <AccordionSection
                  title={t("filters.availability")}
                  isOpen={openFilterSections.availability}
                  onToggle={() => toggleFilterSection("availability")}
                >
                  <div className="grid gap-2">
                    {["all", "inStock", "outOfStock"].map((value) => (
                      <label
                        key={value}
                        className="flex cursor-pointer items-center justify-between gap-3 text-sm text-[#f5f0e8]/72"
                      >
                        <span className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="availability"
                            value={value}
                            checked={filters.availability === value}
                            onChange={() => onAvailabilityChange(value)}
                          />
                          <span>{t(`filters.${value}`)}</span>
                        </span>
                        {value === "all" && (
                          <span className="text-[#f5f0e8]/38">
                            {productCount}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                </AccordionSection>

                <AccordionSection
                  title={t("filters.priceRange")}
                  isOpen={openFilterSections.price}
                  onToggle={() => toggleFilterSection("price")}
                >
                  <div className="pb-4">
                    <div
                      className="relative h-9"
                      style={{
                        "--range-min": `${rangeMinPercent}%`,
                        "--range-max": `${rangeMaxPercent}%`,
                      }}
                    >
                      <span
                        className="davinto-range-track"
                        aria-hidden="true"
                      />
                      <input
                        type="range"
                        dir="ltr"
                        min={sliderMinPrice}
                        max={sliderMaxPrice}
                        value={normalizedPriceDraft.minValue}
                        onChange={(event) =>
                          updatePriceDraft("minPrice", event.target.value)
                        }
                        className="davinto-range-input davinto-range-input--min"
                        style={{
                          zIndex:
                            normalizedPriceDraft.minValue >=
                            normalizedPriceDraft.maxValue - 1
                              ? 5
                              : undefined,
                        }}
                        aria-label={t("filters.minPrice")}
                      />
                      <input
                        type="range"
                        dir="ltr"
                        min={sliderMinPrice}
                        max={sliderMaxPrice}
                        value={normalizedPriceDraft.maxValue}
                        onChange={(event) =>
                          updatePriceDraft("maxPrice", event.target.value)
                        }
                        className="davinto-range-input davinto-range-input--max"
                        aria-label={t("filters.maxPrice")}
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Input
                      label={t("filters.minPrice")}
                      type="number"
                      min={sliderMinPrice}
                      max={sliderMaxPrice}
                      inputMode="numeric"
                      value={priceInputValues.minPrice}
                      onChange={(event) =>
                        updatePriceDraft("minPrice", event.target.value)
                      }
                      placeholder={String(sliderMinPrice)}
                    />
                    <Input
                      label={t("filters.maxPrice")}
                      type="number"
                      min={sliderMinPrice}
                      max={sliderMaxPrice}
                      inputMode="numeric"
                      value={priceInputValues.maxPrice}
                      onChange={(event) =>
                        updatePriceDraft("maxPrice", event.target.value)
                      }
                      placeholder={String(sliderMaxPrice)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-3 w-full tracking-[0.14em]"
                    onClick={applyPriceDraft}
                  >
                    {t("filters.apply")}
                  </Button>
                </AccordionSection>

                <AccordionSection
                  title={t("filters.productType")}
                  isOpen={openFilterSections.productType}
                  onToggle={() => toggleFilterSection("productType")}
                >
                  {currentCategory ? (
                    <p className="text-sm text-[#f5f0e8]/62">
                      {currentCategory.name}
                    </p>
                  ) : (
                    <div className="grid gap-2">
                      <label className="flex cursor-pointer items-center justify-between gap-3 text-sm text-[#f5f0e8]/72">
                        <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="category"
                          value=""
                          checked={!filters.category}
                          onChange={() => onCategoryChange?.("")}
                        />
                        <span>{t("filters.all")}</span>
                        </span>
                        <span className="text-[#f5f0e8]/38">
                          {productCount}
                        </span>
                      </label>

                      {localizedCategories.map((category) => (
                        <label
                          key={category._id || category.slug}
                          className="flex cursor-pointer items-center gap-3 text-sm text-[#f5f0e8]/72"
                        >
                          <input
                            type="radio"
                            name="category"
                            value={category.slug}
                            checked={filters.category === category.slug}
                            onChange={() => onCategoryChange?.(category.slug)}
                          />
                          <span>{category.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </AccordionSection>

                <AccordionSection
                  title={t("filters.color")}
                  isOpen={openFilterSections.color}
                  onToggle={() => toggleFilterSection("color")}
                >
                  <div className="flex flex-wrap gap-2">
                    {colors.map((color) => {
                      const label = getColorLabel(color, language, t);
                      const isSelected = selectedColors.includes(color.slug);

                      return (
                        <label
                          key={color.slug}
                          className={`inline-flex cursor-pointer items-center gap-2 border px-3 py-2 text-xs transition focus-within:border-[#c7a852] ${
                            isSelected
                              ? "border-[#c7a852] bg-[#c7a852]/14 text-[#f5f0e8]"
                              : "border-[#f5f0e8]/14 bg-[#f5f0e8]/5 text-[#f5f0e8]/70 hover:border-[#f5f0e8]/28"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={isSelected}
                            onChange={() => onToggleColor(color.slug)}
                            aria-label={t("filters.colorFilterLabel", {
                              color: label,
                            })}
                          />
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-[#f5f0e8]/40 ring-1 ring-[#1c1917]"
                            style={{ backgroundColor: color.hex || "#777" }}
                            aria-hidden="true"
                          />
                          <span>{label}</span>
                          <span className="text-[#f5f0e8]/38">
                            {Number(color.count || 0)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </AccordionSection>
              </div>

              <div className="grid shrink-0 gap-3 border-t border-[#f5f0e8]/12 p-5 sm:grid-cols-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClearFilters}
                  disabled={!hasActiveFilters && !hasPriceDraft}
                >
                  {t("filters.clearAll")}
                </Button>
                <Button type="button" onClick={applyDrawer}>
                  {t("filters.viewResults")}
                </Button>
              </div>
            </aside>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="mb-7">
      <div className="flex flex-col gap-3 border-y border-[#f5f0e8]/12 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[0.64rem] font-black uppercase tracking-[0.18em] text-[#c7a852]">
          {t("common:pieceCount", { count: productCount })}
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {onSearchChange && (
            <div className="sm:w-64">
              <Input
                aria-label={t("shop.search")}
                name="search"
                value={filters.search || ""}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={t("shop.searchPlaceholder")}
                className="h-11 rounded-none border-[#f5f0e8]/18 py-0 text-[0.82rem]"
              />
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex h-11 items-center gap-2 border border-[#f5f0e8]/18 px-4 text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#f5f0e8] transition hover:border-[#c7a852]"
              onClick={openFilterDrawer}
              aria-expanded={isFilterOpen}
              aria-controls="catalog-filter-drawer"
            >
              <SlidersHorizontal size={16} />
              {t("filters.title")}
              {activeFilterCount > 0 && (
                <span className="text-[#c7a852]">({activeFilterCount})</span>
              )}
            </button>

            <div className="relative" ref={sortRef}>
              <button
                type="button"
                aria-expanded={isSortMenuOpen}
                aria-haspopup="menu"
                aria-controls="catalog-sort-menu"
                className="inline-flex h-11 items-center border border-[#f5f0e8]/18 px-4 text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#f5f0e8] transition hover:border-[#c7a852]"
                onClick={toggleSortMenu}
              >
                {t("shop.sort")}
              </button>

              {isSortMenuOpen && (
                <div
                  id="catalog-sort-menu"
                  className="absolute right-0 z-30 mt-2 w-56 border border-[#c7a852]/30 bg-[#110f0e] p-2 shadow-2xl"
                >
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`block w-full px-3 py-3 text-left text-xs font-bold uppercase tracking-[0.12em] transition ${
                        selectedSort.value === option.value
                          ? "bg-[#c7a852] text-[#1c1917]"
                          : "text-[#f5f0e8]/70 hover:bg-[#f5f0e8]/8 hover:text-[#f5f0e8]"
                      }`}
                      onClick={() => {
                        onSortChange(option.value);
                        setIsSortOpen(false);
                      }}
                    >
                      {t(`shop.${option.key}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {filterDrawer}
    </div>
  );
};

export default CatalogFilters;
