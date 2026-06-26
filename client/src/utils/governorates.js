export const egyptGovernorates = [
  { slug: "cairo" },
  { slug: "giza" },
  { slug: "alexandria" },
  { slug: "dakahlia" },
  { slug: "red_sea" },
  { slug: "beheira" },
  { slug: "fayoum" },
  { slug: "gharbia" },
  { slug: "ismailia" },
  { slug: "menofia" },
  { slug: "minya" },
  { slug: "qaliubiya" },
  { slug: "new_valley" },
  { slug: "suez" },
  { slug: "aswan" },
  { slug: "assiut" },
  { slug: "beni_suef" },
  { slug: "port_said" },
  { slug: "damietta" },
  { slug: "sharkia" },
  { slug: "south_sinai" },
  { slug: "kafr_el_sheikh" },
  { slug: "matrouh" },
  { slug: "luxor" },
  { slug: "qena" },
  { slug: "north_sinai" },
  { slug: "sohag" },
];

const legacyLabels = {
  Cairo: "cairo",
  Giza: "giza",
  Other: "other",
};

export const getGovernorateLabel = (t, value = "") => {
  const rawValue = String(value || "").trim();
  const normalized =
    legacyLabels[rawValue] || rawValue.toLowerCase().replace(/[\s-]+/g, "_");

  if (!normalized) return rawValue;

  return t(`checkout:deliveryZones.${normalized}`, {
    defaultValue: rawValue || normalized.replaceAll("_", " "),
  });
};
