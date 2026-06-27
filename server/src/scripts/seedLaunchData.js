require("dotenv").config();

const mongoose = require("mongoose");

const Category = require("../models/Category");
const Product = require("../models/Product");
const SiteSettings = require("../models/SiteSettings");
const {
  getArtProductImageUrl,
  getBlankProductImageUrls,
  getCategoryImageUrl,
} = require("../config/launchImageMap");
const { getDefaultDeliveryZones } = require("../utils/egyptGovernorates");

const LAUNCH_PRICE = 650;
const COMPARE_AT_PRICE = 0;
const DEFAULT_STOCK = 10;
const SIZES = ["M", "L", "XL", "XXL"];

// Image workflow note:
// This seed only writes image URLs when the seed command is run. Existing
// MongoDB products/categories keep their saved URLs after local asset changes.
// For image-only updates, run `npm run sync:images` from the server folder
// instead of reseeding or resetting launch data.

const normalizeText = (value = "") => String(value || "").trim();

const getExistingStock = (existingProduct, colorSlug, sizeLabel) => {
  const color = existingProduct?.colors?.find(
    (entry) => entry.slug === colorSlug
  );
  const size = color?.sizes?.find((entry) => entry.label === sizeLabel);
  const stock = Number(size?.stock || 0);

  return stock > 0 ? stock : DEFAULT_STOCK;
};

const buildBlankImages = ({ productSlug, englishName, arabicName }) => {
  return getBlankProductImageUrls(productSlug).map((url, urlIndex) => {
    const index = urlIndex + 1;

    return {
      url,
      publicId: "",
      alt: `${englishName} view ${index}`,
      translations: {
        ar: {
        alt: `${arabicName} - صورة ${index}`,
      },
      },
      role: index === 1 ? "primary" : index === 2 ? "hover" : "gallery",
      position: index,
    };
  });
};

const buildArtImages = ({ index, englishName, arabicName }) => {
  const url = getArtProductImageUrl(index);

  return [
    {
      url,
      publicId: "",
      alt: `${englishName} print`,
      translations: {
        ar: {
          alt: `${arabicName} - صورة المنتج`,
        },
      },
      role: "primary",
      position: 1,
    },
  ];
};

const buildSizes = (existingProduct, colorSlug, skuPrefix) => {
  return SIZES.map((label) => ({
    label,
    sku: `${skuPrefix}-${label}`,
    stock: getExistingStock(existingProduct, colorSlug, label),
    isActive: true,
  }));
};

const upsertCategory = async ({
  lookupSlug,
  legacySlug,
  name,
  slug,
  description,
  imageUrl,
  imageAlt,
  sortOrder,
  arabicName,
  arabicDescription,
}) => {
  const legacyCategory = legacySlug
    ? await Category.findOne({ slug: legacySlug })
    : null;
  let category = await Category.findOne({ slug: lookupSlug || slug });

  if (!category && legacyCategory) {
    category = legacyCategory;
  }

  if (!category) {
    category = new Category();
  }

  category.name = name;
  category.slug = slug;
  category.description = description;
  category.image = {
    url: imageUrl,
    publicId: "",
    alt: imageAlt,
  };
  category.status = "active";
  category.sortOrder = sortOrder;
  category.seo = {
    title: `${name} | Davinto`,
    description,
  };
  category.translations = {
    ar: {
      name: arabicName,
      description: arabicDescription,
      badges: [],
      seo: {
        title: `${arabicName} | دافينتو`,
        description: arabicDescription,
      },
      badges: [],
    },
  };

  await category.save();

  if (
    legacyCategory &&
    String(legacyCategory._id) !== String(category._id)
  ) {
    await Product.updateMany(
      { category: legacyCategory._id },
      { $set: { category: category._id } }
    );

    legacyCategory.status = "archived";
    await legacyCategory.save();
    console.log(`Archived duplicate legacy category: ${legacySlug}`);
  }

  console.log(`Category ready: ${category.name} (${category.slug})`);
  return category;
};

const blankProducts = [
  {
    name: "Black T-Shirt",
    slug: "black-t-shirt",
    colorName: "Black",
    colorNameAr: "أسود",
    colorSlug: "black",
    hex: "#111111",
    folder: "black",
    skuPrefix: "DV-BLK-TEE",
    arabicName: "تيشيرت أسود",
  },
  {
    name: "White T-Shirt",
    slug: "white-t-shirt",
    colorName: "White",
    colorNameAr: "أبيض",
    colorSlug: "white",
    hex: "#ffffff",
    folder: "white",
    skuPrefix: "DV-WHT-TEE",
    arabicName: "تيشيرت أبيض",
  },
  {
    name: "Beige T-Shirt",
    slug: "beige-t-shirt",
    colorName: "Beige",
    colorNameAr: "بيج",
    colorSlug: "beige",
    hex: "#d8c4a3",
    folder: "beige",
    skuPrefix: "DV-BGE-TEE",
    arabicName: "تيشيرت بيج",
  },
  {
    name: "Pink T-Shirt",
    slug: "pink-t-shirt",
    colorName: "Pink",
    colorNameAr: "وردي",
    colorSlug: "pink",
    hex: "#e8a4b8",
    folder: "pink",
    skuPrefix: "DV-PNK-TEE",
    arabicName: "تيشيرت وردي",
  },
];

const getBaseProductPayload = ({
  category,
  name,
  slug,
  shortDescription,
  description,
  fabric,
  fit,
  careInstructions,
  arabicName,
  arabicShortDescription,
  arabicDescription,
  arabicFabric,
  arabicFit,
  arabicCare,
}) => ({
  name,
  slug,
  category: category._id,
  price: LAUNCH_PRICE,
  compareAtPrice: COMPARE_AT_PRICE,
  shortDescription,
  description,
  fabric,
  fit,
  careInstructions,
  badges: [],
  isFeatured: true,
  status: "active",
  seo: {
    title: `${name} | Davinto`,
    description: `${name} from Davinto.`,
  },
  translations: {
    ar: {
      name: arabicName,
      shortDescription: arabicShortDescription,
      description: arabicDescription,
      fabric: arabicFabric,
      fit: arabicFit,
      care: arabicCare,
      seo: {
        title: `${arabicName} | دافينتو`,
        description: arabicDescription,
      },
    },
  },
});

const upsertProduct = async (payload, color) => {
  const existingProduct = await Product.findOne({ slug: payload.slug });

  if (!Array.isArray(color.images) || color.images.length === 0) {
    console.warn(
      `Warning: skipped ${payload.slug} because no product image was found.`
    );
    return null;
  }

  const product = await Product.findOneAndUpdate(
    { slug: payload.slug },
    {
      ...payload,
      colors: [
        {
          ...color,
          sizes: buildSizes(existingProduct, color.slug, color.skuPrefix),
          skuPrefix: undefined,
          isActive: true,
        },
      ],
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );

  console.log(`Product ready: ${product.name}`);
  return product;
};

const upsertBlankProducts = async (category) => {
  for (const productData of blankProducts) {
    await upsertProduct(
      getBaseProductPayload({
        category,
        name: productData.name,
        slug: productData.slug,
        shortDescription:
          "A clean Davinto launch T-shirt made for everyday styling.",
        description:
          "A premium everyday T-shirt from the Davinto launch edit, designed with a clean silhouette and easy styling in mind.",
        fabric: "Soft cotton blend",
        fit: "Regular fit",
        careInstructions: "Machine wash cold. Wash inside out. Do not bleach.",
        arabicName: productData.arabicName,
        arabicShortDescription:
          "تيشيرت دافينتو نظيف للإطلالات اليومية.",
        arabicDescription:
          "تيشيرت يومي من إصدار دافينتو للإطلاق، بقصة نظيفة وسهلة التنسيق.",
        arabicFabric: "خليط قطن ناعم",
        arabicFit: "قصة عادية",
        arabicCare:
          "يغسل بالماء البارد ويقلب للداخل. لا يستخدم المبيض.",
      }),
      {
        name: productData.colorName,
        translations: {
          ar: {
            name: productData.colorNameAr,
          },
        },
        slug: productData.colorSlug,
        hex: productData.hex,
        images: buildBlankImages({
          productSlug: productData.slug,
          englishName: productData.name,
          arabicName: productData.arabicName,
        }),
        skuPrefix: productData.skuPrefix,
      }
    );
  }
};

const upsertArtProducts = async (category) => {
  for (let index = 1; index <= 18; index += 1) {
    const name = `Art piece ${index}`;
    const arabicName = `قطعة فن ${index}`;

    await upsertProduct(
      getBaseProductPayload({
        category,
        name,
        slug: `art-piece-${index}`,
        shortDescription:
          "A printed Davinto T-shirt with a clean everyday fit.",
        description:
          "A printed Davinto T-shirt with a clean everyday fit.",
        fabric: "Soft cotton blend",
        fit: "Regular fit",
        careInstructions: "Machine wash cold. Wash inside out. Do not bleach.",
        arabicName,
        arabicShortDescription:
          "تيشيرت دافينتو مطبوع بقصة بسيطة مناسبة للاستخدام اليومي.",
        arabicDescription:
          "تيشيرت دافينتو مطبوع بقصة بسيطة مناسبة للاستخدام اليومي.",
        arabicFabric: "خليط قطن ناعم",
        arabicFit: "قصة عادية",
        arabicCare:
          "يغسل بالماء البارد ويقلب للداخل. لا يستخدم المبيض.",
      }),
      {
        name: "White",
        translations: {
          ar: {
            name: "أبيض",
          },
        },
        slug: "white",
        hex: "#ffffff",
        images: buildArtImages({
          index,
          englishName: name,
          arabicName,
        }),
        skuPrefix: `DV-AH-${String(index).padStart(2, "0")}`,
      }
    );
  }
};

const updateLaunchSettings = async () => {
  const settings = await SiteSettings.getSingleton();

  settings.delivery = {
    ...(settings.delivery || {}),
    baseFee: 120,
    freeDeliveryThreshold: settings.delivery?.freeDeliveryThreshold ?? 0,
    notes:
      settings.delivery?.notes ||
      "Delivery fee is 70 EGP for Cairo/Giza and 120 EGP for other areas.",
    zones: {
      ...getDefaultDeliveryZones(),
    },
  };

  settings.payments = {
    ...(settings.payments || {}),
    cod: {
      enabled: true,
      label: "Cash on Delivery",
      instructions: "Pay when your order arrives.",
    },
    instapay: {
      enabled: true,
      label: "Instapay",
      instructions:
        "Send the payment to 01271530992 then paste the transaction reference.",
    },
    vodafoneCash: {
      enabled: true,
      label: "Vodafone Cash",
      instructions:
        "Send the payment to 01097187348 then paste the transaction reference.",
    },
    paymobCard: {
      ...(settings.payments?.paymobCard || {}),
      enabled: false,
      label: settings.payments?.paymobCard?.label || "Visa / Mastercard",
      instructions:
        settings.payments?.paymobCard?.instructions ||
        "Pay securely online using your card.",
    },
  };

  settings.manualPayment = {
    ...(settings.manualPayment || {}),
    instapayHandle: "01271530992",
    instapayQrImage: settings.manualPayment?.instapayQrImage || "",
    vodafoneCashNumber: "01097187348",
    vodafoneCashQrImage: settings.manualPayment?.vodafoneCashQrImage || "",
    requireTransactionReference: true,
    requireProofImage: Boolean(settings.manualPayment?.requireProofImage),
  };

  await settings.save();
  console.log("Launch settings ready.");
  return settings;
};

const connectToDatabase = async () => {
  const mongoUri = normalizeText(process.env.MONGO_URI);

  if (!mongoUri) {
    throw new Error("MONGO_URI is required to seed launch data.");
  }

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected.");
};

const run = async () => {
  try {
    console.log("");
    console.log("Davinto Launch Data Seed");
    console.log("=========================");
    console.log("");

    await connectToDatabase();

    const blanksCategory = await upsertCategory({
      lookupSlug: "blanks",
      legacySlug: "t-shirts",
      name: "Blanks",
      slug: "blanks",
      description: "Davinto blank essentials in clean everyday colors.",
      imageUrl: getCategoryImageUrl("blanks"),
      imageAlt: "Davinto Blanks",
      sortOrder: 1,
      arabicName: "أساسيات سادة",
      arabicDescription: "أساسيات دافينتو السادة بألوان يومية نظيفة.",
    });

    const artCategory = await upsertCategory({
      lookupSlug: "art-and-history",
      name: "Art and History",
      slug: "art-and-history",
      description: "Printed Davinto pieces inspired by art and history.",
      imageUrl: getCategoryImageUrl("art-and-history"),
      imageAlt: "Davinto Art and History",
      sortOrder: 2,
      arabicName: "فن وتاريخ",
      arabicDescription: "قطع دافينتو مطبوعة مستوحاة من الفن والتاريخ.",
    });

    await upsertBlankProducts(blanksCategory);
    await upsertArtProducts(artCategory);
    await updateLaunchSettings();

    console.log("");
    console.log("Launch data seed completed successfully.");
    console.log("");
  } catch (error) {
    console.error("");
    console.error("Launch data seed failed:");
    console.error(error.message);
    console.error("");
    process.exitCode = 1;
    throw error;
  } finally {
    await mongoose.connection.close().catch(() => {});
  }
};

if (require.main === module) {
  run().catch(() => {});
}

module.exports = {
  run,
};
