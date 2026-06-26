const EGYPT_GOVERNORATES = [
  { slug: "cairo", name: "Cairo", fee: 70 },
  { slug: "giza", name: "Giza", fee: 70 },
  { slug: "alexandria", name: "Alexandria", fee: 120 },
  { slug: "dakahlia", name: "Dakahlia", fee: 120 },
  { slug: "red_sea", name: "Red Sea", fee: 120 },
  { slug: "beheira", name: "Beheira", fee: 120 },
  { slug: "fayoum", name: "Fayoum", fee: 120 },
  { slug: "gharbia", name: "Gharbia", fee: 120 },
  { slug: "ismailia", name: "Ismailia", fee: 120 },
  { slug: "menofia", name: "Menofia", fee: 120 },
  { slug: "minya", name: "Minya", fee: 120 },
  { slug: "qaliubiya", name: "Qaliubiya", fee: 120 },
  { slug: "new_valley", name: "New Valley", fee: 120 },
  { slug: "suez", name: "Suez", fee: 120 },
  { slug: "aswan", name: "Aswan", fee: 120 },
  { slug: "assiut", name: "Assiut", fee: 120 },
  { slug: "beni_suef", name: "Beni Suef", fee: 120 },
  { slug: "port_said", name: "Port Said", fee: 120 },
  { slug: "damietta", name: "Damietta", fee: 120 },
  { slug: "sharkia", name: "Sharkia", fee: 120 },
  { slug: "south_sinai", name: "South Sinai", fee: 120 },
  { slug: "kafr_el_sheikh", name: "Kafr El Sheikh", fee: 120 },
  { slug: "matrouh", name: "Matrouh", fee: 120 },
  { slug: "luxor", name: "Luxor", fee: 120 },
  { slug: "qena", name: "Qena", fee: 120 },
  { slug: "north_sinai", name: "North Sinai", fee: 120 },
  { slug: "sohag", name: "Sohag", fee: 120 },
];

const normalizeKey = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const governorateAliases = new Map();

EGYPT_GOVERNORATES.forEach((governorate) => {
  governorateAliases.set(governorate.slug, governorate.slug);
  governorateAliases.set(normalizeKey(governorate.name), governorate.slug);
});

governorateAliases.set("other", "other");
governorateAliases.set("others", "other");
governorateAliases.set("other_governorates", "other");
governorateAliases.set("other_areas", "other");

const normalizeGovernorateSlug = (value = "") => {
  const key = normalizeKey(value);
  return governorateAliases.get(key) || "";
};

const getDefaultDeliveryZones = () =>
  ({
    ...Object.fromEntries(
      EGYPT_GOVERNORATES.map((governorate) => [
        governorate.slug,
        governorate.fee,
      ])
    ),
    other: 120,
  });

const getDeliveryZonesWithDefaults = (zones = {}) => {
  const defaults = getDefaultDeliveryZones();

  return Object.fromEntries(
    Object.entries(defaults).map(([slug, defaultFee]) => {
      const configuredFee = Number(zones?.[slug]);

      return [
        slug,
        Number.isFinite(configuredFee)
          ? Math.max(configuredFee, 0)
          : defaultFee,
      ];
    })
  );
};

const getDefaultDeliveryFeeForSlug = (slug = "") => {
  if (slug === "other") return 120;
  return EGYPT_GOVERNORATES.find((item) => item.slug === slug)?.fee ?? 120;
};

module.exports = {
  EGYPT_GOVERNORATES,
  normalizeGovernorateSlug,
  getDefaultDeliveryZones,
  getDeliveryZonesWithDefaults,
  getDefaultDeliveryFeeForSlug,
};
