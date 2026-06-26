require("dotenv").config();

const mongoose = require("mongoose");

const Admin = require("../models/Admin");
const Bundle = require("../models/Bundle");
const Category = require("../models/Category");
const DiscountCode = require("../models/DiscountCode");
const Offer = require("../models/Offer");
const Product = require("../models/Product");
const SiteSettings = require("../models/SiteSettings");
const { getDefaultDeliveryZones } = require("../utils/egyptGovernorates");

const normalizeText = (value = "") => {
  return String(value || "").trim();
};

const connectToDatabase = async () => {
  const mongoUri = normalizeText(process.env.MONGO_URI);

  if (!mongoUri) {
    console.log("");
    console.log("❌ MONGO_URI is empty.");
    console.log("Add the real MongoDB connection string to server/.env first.");
    console.log("Seed was skipped safely.");
    console.log("");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  console.log("✅ MongoDB connected.");
};

const seedAdmin = async () => {
  const name = normalizeText(process.env.ADMIN_NAME) || "Admin";
  const email =
    normalizeText(process.env.ADMIN_EMAIL).toLowerCase() ||
    "admin@davinto.com";
  const password = normalizeText(process.env.ADMIN_PASSWORD);

  if (!password) {
    throw new Error("ADMIN_PASSWORD is required before seeding admin.");
  }

  const existingAdmin = await Admin.findOne({ email });

  if (existingAdmin) {
    existingAdmin.name = name;
    existingAdmin.role = existingAdmin.role || "owner";
    existingAdmin.status = "active";

    await existingAdmin.save();

    console.log(`✅ Admin already exists: ${email}`);
    return existingAdmin;
  }

  const admin = await Admin.create({
    name,
    email,
    password,
    role: "owner",
    status: "active",
  });

  console.log(`✅ Admin created: ${admin.email}`);
  return admin;
};

const upsertCategory = async ({ name, slug, description, sortOrder }) => {
  const category = await Category.findOneAndUpdate(
    { slug },
    {
      name,
      slug,
      description,
      sortOrder,
      status: "active",
      seo: {
        title: `${name} | Davinto`,
        description,
      },
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
    }
  );

  console.log(`✅ Category ready: ${category.name}`);
  return category;
};

const seedCategories = async () => {
  const tShirts = await upsertCategory({
    name: "T-Shirts",
    slug: "t-shirts",
    description: "Premium Davinto t-shirts and essentials.",
    sortOrder: 1,
  });

  const pants = await upsertCategory({
    name: "Pants",
    slug: "pants",
    description: "Clean everyday pants and bottoms.",
    sortOrder: 2,
  });

  return {
    tShirts,
    pants,
  };
};

const createColor = ({
  name,
  nameAr = "",
  slug,
  hex,
  imageSeed,
  primaryAltAr = "",
  hoverAltAr = "",
  detailAltAr = "",
  sizes,
}) => {
  return {
    name,
    translations: {
      ar: {
        name: nameAr,
      },
    },
    slug,
    hex,
    isActive: true,
    images: [
      {
        url: `https://placehold.co/900x1200/111111/f7f3ea?text=${encodeURIComponent(
          imageSeed
        )}+Front`,
        publicId: "",
        alt: `${imageSeed} front`,
        translations: {
          ar: {
            alt: primaryAltAr,
          },
        },
        role: "primary",
        position: 1,
      },
      {
        url: `https://placehold.co/900x1200/191919/f7f3ea?text=${encodeURIComponent(
          imageSeed
        )}+Hover`,
        publicId: "",
        alt: `${imageSeed} hover`,
        translations: {
          ar: {
            alt: hoverAltAr,
          },
        },
        role: "hover",
        position: 2,
      },
      {
        url: `https://placehold.co/900x1200/222222/f7f3ea?text=${encodeURIComponent(
          imageSeed
        )}+Detail`,
        publicId: "",
        alt: `${imageSeed} detail`,
        translations: {
          ar: {
            alt: detailAltAr,
          },
        },
        role: "gallery",
        position: 3,
      },
    ],
    sizes,
  };
};

const createSizes = (prefix) => {
  return [
    {
      label: "S",
      sku: `${prefix}-S`,
      stock: 8,
      isActive: true,
    },
    {
      label: "M",
      sku: `${prefix}-M`,
      stock: 12,
      isActive: true,
    },
    {
      label: "L",
      sku: `${prefix}-L`,
      stock: 10,
      isActive: true,
    },
    {
      label: "XL",
      sku: `${prefix}-XL`,
      stock: 6,
      isActive: true,
    },
  ];
};

const upsertProduct = async (payload) => {
  const product = await Product.findOneAndUpdate(
    { slug: payload.slug },
    payload,
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );

  console.log(`✅ Product ready: ${product.name}`);
  return product;
};

const seedProducts = async ({ tShirts, pants }) => {
  const blackTee = await upsertProduct({
    name: "Davinto Essential Tee",
    slug: "davinto-essential-tee",
    category: tShirts._id,
    price: 650,
    compareAtPrice: 800,
    shortDescription:
      "A clean essential tee built for daily fits with a premium dark edge.",
    description:
      "The Davinto Essential Tee is designed as a simple, sharp, everyday piece with a premium feel.",
    fabric: "Heavyweight cotton blend",
    fit: "Relaxed fit",
    care: "Wash inside out. Cold wash recommended.",
    badges: ["New", "Essential"],
    isFeatured: true,
    status: "active",
    seo: {
      title: "Davinto Essential Tee",
      description: "Premium Davinto essential t-shirt.",
    },
    translations: {
      ar: {
        name: "\u062a\u064a\u0634\u064a\u0631\u062a \u062f\u0627\u0641\u064a\u0646\u062a\u0648 \u0627\u0644\u0623\u0633\u0627\u0633\u064a",
        shortDescription:
          "\u062a\u064a\u0634\u064a\u0631\u062a \u064a\u0648\u0645\u064a \u0646\u0638\u064a\u0641 \u0628\u062e\u0627\u0645\u0629 \u0645\u0645\u064a\u0632\u0629.",
        badges: ["\u062c\u062f\u064a\u062f", "\u0623\u0633\u0627\u0633\u064a"],
      },
    },
    colors: [
      createColor({
        name: "Black",
        nameAr: "\u0623\u0633\u0648\u062f",
        slug: "black",
        hex: "#111111",
        imageSeed: "Essential Tee Black",
        primaryAltAr:
          "\u062a\u064a\u0634\u064a\u0631\u062a \u062f\u0627\u0641\u064a\u0646\u062a\u0648 \u0623\u0633\u0627\u0633\u064a \u0623\u0633\u0648\u062f",
        hoverAltAr:
          "\u062a\u064a\u0634\u064a\u0631\u062a \u0623\u0633\u0627\u0633\u064a \u0623\u0633\u0648\u062f \u0645\u0646 \u0632\u0627\u0648\u064a\u0629 \u0623\u062e\u0631\u0649",
        detailAltAr:
          "\u062a\u0641\u0627\u0635\u064a\u0644 \u062e\u0627\u0645\u0629 \u0627\u0644\u062a\u064a\u0634\u064a\u0631\u062a \u0627\u0644\u0623\u0633\u0648\u062f",
        sizes: createSizes("DV-TEE-BLK"),
      }),
      createColor({
        name: "Off White",
        nameAr: "\u0623\u0648\u0641 \u0648\u0627\u064a\u062a",
        slug: "off-white",
        hex: "#f7f3ea",
        imageSeed: "Essential Tee Off White",
        primaryAltAr:
          "\u062a\u064a\u0634\u064a\u0631\u062a \u062f\u0627\u0641\u064a\u0646\u062a\u0648 \u0623\u0633\u0627\u0633\u064a \u0623\u0648\u0641 \u0648\u0627\u064a\u062a",
        hoverAltAr:
          "\u062a\u064a\u0634\u064a\u0631\u062a \u0623\u0633\u0627\u0633\u064a \u0623\u0648\u0641 \u0648\u0627\u064a\u062a \u0645\u0646 \u0632\u0627\u0648\u064a\u0629 \u0623\u062e\u0631\u0649",
        detailAltAr:
          "\u062a\u0641\u0627\u0635\u064a\u0644 \u062e\u0627\u0645\u0629 \u0627\u0644\u062a\u064a\u0634\u064a\u0631\u062a \u0627\u0644\u0623\u0648\u0641 \u0648\u0627\u064a\u062a",
        sizes: createSizes("DV-TEE-OW"),
      }),
    ],
  });

  const washedTee = await upsertProduct({
    name: "Davinto Washed Tee",
    slug: "davinto-washed-tee",
    category: tShirts._id,
    price: 720,
    compareAtPrice: 0,
    shortDescription:
      "Washed texture, relaxed silhouette, and a premium everyday look.",
    description:
      "The Davinto Washed Tee gives a slightly faded texture while staying clean and easy to style.",
    fabric: "Washed cotton",
    fit: "Oversized fit",
    care: "Wash separately for first wash. Do not bleach.",
    badges: ["Washed"],
    isFeatured: true,
    status: "active",
    seo: {
      title: "Davinto Washed Tee",
      description: "Premium washed t-shirt from Davinto.",
    },
    translations: {
      ar: {
        name: "\u062a\u064a\u0634\u064a\u0631\u062a \u062f\u0627\u0641\u064a\u0646\u062a\u0648 \u0648\u0627\u0634\u062f",
        shortDescription:
          "\u0645\u0644\u0645\u0633 \u0648\u0627\u0634\u062f \u0648\u0642\u0635\u0629 \u0648\u0627\u0633\u0639\u0629 \u0644\u0644\u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u064a\u0648\u0645\u064a.",
        badges: ["\u0648\u0627\u0634\u062f"],
      },
    },
    colors: [
      createColor({
        name: "Charcoal",
        nameAr: "\u0641\u062d\u0645\u064a",
        slug: "charcoal",
        hex: "#2b2b2b",
        imageSeed: "Washed Tee Charcoal",
        primaryAltAr:
          "\u062a\u064a\u0634\u064a\u0631\u062a \u0648\u0627\u0634\u062f \u0641\u062d\u0645\u064a",
        hoverAltAr:
          "\u062a\u064a\u0634\u064a\u0631\u062a \u0648\u0627\u0634\u062f \u0641\u062d\u0645\u064a \u0645\u0646 \u0632\u0627\u0648\u064a\u0629 \u0623\u062e\u0631\u0649",
        detailAltAr:
          "\u062a\u0641\u0627\u0635\u064a\u0644 \u062e\u0627\u0645\u0629 \u0627\u0644\u062a\u064a\u0634\u064a\u0631\u062a \u0627\u0644\u0641\u062d\u0645\u064a",
        sizes: createSizes("DV-WTEE-CHR"),
      }),
      createColor({
        name: "Stone",
        nameAr: "\u0633\u062a\u0648\u0646",
        slug: "stone",
        hex: "#b7aa97",
        imageSeed: "Washed Tee Stone",
        primaryAltAr:
          "\u062a\u064a\u0634\u064a\u0631\u062a \u0648\u0627\u0634\u062f \u0633\u062a\u0648\u0646",
        hoverAltAr:
          "\u062a\u064a\u0634\u064a\u0631\u062a \u0648\u0627\u0634\u062f \u0633\u062a\u0648\u0646 \u0645\u0646 \u0632\u0627\u0648\u064a\u0629 \u0623\u062e\u0631\u0649",
        detailAltAr:
          "\u062a\u0641\u0627\u0635\u064a\u0644 \u062e\u0627\u0645\u0629 \u0627\u0644\u062a\u064a\u0634\u064a\u0631\u062a \u0627\u0644\u0633\u062a\u0648\u0646",
        sizes: createSizes("DV-WTEE-STN"),
      }),
    ],
  });

  const straightPants = await upsertProduct({
    name: "Davinto Straight Pants",
    slug: "davinto-straight-pants",
    category: pants._id,
    price: 950,
    compareAtPrice: 1150,
    shortDescription:
      "Straight-leg pants with a clean fit and premium daily styling.",
    description:
      "The Davinto Straight Pants are made for easy styling with tees, shirts, and jackets.",
    fabric: "Cotton twill blend",
    fit: "Straight fit",
    care: "Cold wash. Hang dry recommended.",
    badges: ["Best Seller"],
    isFeatured: false,
    status: "active",
    seo: {
      title: "Davinto Straight Pants",
      description: "Premium straight pants from Davinto.",
    },
    translations: {
      ar: {
        name: "\u0628\u0646\u0637\u0644\u0648\u0646 \u062f\u0627\u0641\u064a\u0646\u062a\u0648 \u0633\u062a\u0631\u064a\u062a",
        shortDescription:
          "\u0628\u0646\u0637\u0644\u0648\u0646 \u0628\u0642\u0635\u0629 \u0633\u062a\u0631\u064a\u062a \u0646\u0638\u064a\u0641\u0629 \u0644\u0644\u0625\u0637\u0644\u0627\u0644\u0627\u062a \u0627\u0644\u064a\u0648\u0645\u064a\u0629.",
        badges: ["\u0627\u0644\u0623\u0643\u062b\u0631 \u0645\u0628\u064a\u0639\u0627"],
      },
    },
    colors: [
      createColor({
        name: "Black",
        nameAr: "\u0623\u0633\u0648\u062f",
        slug: "black",
        hex: "#111111",
        imageSeed: "Straight Pants Black",
        primaryAltAr:
          "\u0628\u0646\u0637\u0644\u0648\u0646 \u062f\u0627\u0641\u064a\u0646\u062a\u0648 \u0633\u062a\u0631\u064a\u062a \u0623\u0633\u0648\u062f",
        hoverAltAr:
          "\u0628\u0646\u0637\u0644\u0648\u0646 \u0633\u062a\u0631\u064a\u062a \u0623\u0633\u0648\u062f \u0645\u0646 \u0632\u0627\u0648\u064a\u0629 \u0623\u062e\u0631\u0649",
        detailAltAr:
          "\u062a\u0641\u0627\u0635\u064a\u0644 \u062e\u0627\u0645\u0629 \u0627\u0644\u0628\u0646\u0637\u0644\u0648\u0646 \u0627\u0644\u0623\u0633\u0648\u062f",
        sizes: createSizes("DV-PANTS-BLK"),
      }),
      createColor({
        name: "Sand",
        nameAr: "\u0631\u0645\u0644\u064a",
        slug: "sand",
        hex: "#c8b99e",
        imageSeed: "Straight Pants Sand",
        primaryAltAr:
          "\u0628\u0646\u0637\u0644\u0648\u0646 \u062f\u0627\u0641\u064a\u0646\u062a\u0648 \u0633\u062a\u0631\u064a\u062a \u0631\u0645\u0644\u064a",
        hoverAltAr:
          "\u0628\u0646\u0637\u0644\u0648\u0646 \u0633\u062a\u0631\u064a\u062a \u0631\u0645\u0644\u064a \u0645\u0646 \u0632\u0627\u0648\u064a\u0629 \u0623\u062e\u0631\u0649",
        detailAltAr:
          "\u062a\u0641\u0627\u0635\u064a\u0644 \u062e\u0627\u0645\u0629 \u0627\u0644\u0628\u0646\u0637\u0644\u0648\u0646 \u0627\u0644\u0631\u0645\u0644\u064a",
        sizes: createSizes("DV-PANTS-SND"),
      }),
    ],
  });

  return {
    blackTee,
    washedTee,
    straightPants,
  };
};

const seedSettings = async () => {
  const settings = await SiteSettings.getSingleton();

  settings.storeName = settings.storeName || "Davinto";
  settings.storeEmail = settings.storeEmail || "";
  settings.storePhone = settings.storePhone || "";
  settings.whatsappNumber = settings.whatsappNumber || "";
  settings.storeAddress = settings.storeAddress || "";
  settings.instagramUrl = settings.instagramUrl || "";
  settings.facebookUrl = settings.facebookUrl || "";
  settings.tiktokUrl = settings.tiktokUrl || "";
  settings.currency = settings.currency || "EGP";
  settings.currencySymbol = settings.currencySymbol || "EGP";

  settings.delivery = {
    ...(settings.delivery || {}),
    baseFee: settings.delivery?.baseFee ?? 120,
    freeDeliveryThreshold: settings.delivery?.freeDeliveryThreshold ?? 2000,
    notes:
      settings.delivery?.notes ||
      "Delivery fees and timing may vary depending on location.",
    zones: {
      ...getDefaultDeliveryZones(),
      ...(settings.delivery?.zones || {}),
      cairo: 70,
      giza: 70,
    },
  };

  settings.payments = {
    cod: {
      enabled: true,
      label: "Cash on Delivery",
      instructions: "Pay when your order arrives.",
    },
    instapay: {
      enabled: true,
      label: "Instapay",
      instructions: "Send the payment then paste the transaction reference.",
    },
    vodafoneCash: {
      enabled: true,
      label: "Vodafone Cash",
      instructions: "Send the payment then paste the transaction reference.",
    },
    paymobCard: {
      enabled: false,
      label: "Visa / Mastercard",
      instructions: "Pay securely online using your card.",
    },
  };

  settings.manualPayment = {
    ...(settings.manualPayment || {}),
    instapayHandle:
      settings.manualPayment?.instapayHandle || "01271530992",
    instapayQrImage: settings.manualPayment?.instapayQrImage || "",
    vodafoneCashNumber:
      settings.manualPayment?.vodafoneCashNumber || "01097187348",
    vodafoneCashQrImage: settings.manualPayment?.vodafoneCashQrImage || "",
    requireTransactionReference: true,
    requireProofImage: Boolean(settings.manualPayment?.requireProofImage),
  };

  settings.translations = {
    ar: {
      store: {
        name: "دافينتو",
        address: "القاهرة، مصر",
      },
      delivery: {
        notes: "قد تختلف رسوم ومدة التوصيل حسب الموقع.",
      },
      payments: {
        cod: {
          label: "الدفع عند الاستلام",
          instructions: "ادفع عند استلام طلبك.",
        },
        instapay: {
          label: "إنستاباي",
          instructions: "حوّل المبلغ ثم أدخل رقم مرجع العملية.",
        },
        vodafoneCash: {
          label: "فودافون كاش",
          instructions: "حوّل المبلغ ثم أدخل رقم مرجع العملية.",
        },
        paymobCard: {
          label: "فيزا / ماستركارد",
          instructions: "ادفع بأمان عبر الإنترنت باستخدام بطاقتك.",
        },
      },
      manualPayment: {
        instapayLabel: "بيانات إنستاباي",
        instapayInstructions: "استخدم عنوان إنستاباي الموضح لإرسال المبلغ.",
        vodafoneCashLabel: "بيانات فودافون كاش",
        vodafoneCashInstructions:
          "استخدم رقم فودافون كاش الموضح لإرسال المبلغ.",
      },
    },
  };

  settings.tracking = {
    ...(settings.tracking || {}),
    metaPixelId: settings.tracking?.metaPixelId || "",
    enableMetaPixel: Boolean(settings.tracking?.enableMetaPixel),
  };

  settings.lowStockThreshold = settings.lowStockThreshold ?? 5;

  await settings.save();

  console.log("✅ Settings ready.");
  return settings;
};

const seedDiscountCode = async () => {
  const discountCode = await DiscountCode.findOneAndUpdate(
    { code: "DAVINTO10" },
    {
      code: "DAVINTO10",
      name: "Davinto 10% Launch Code",
      description: "Launch discount code for testing checkout.",
      type: "percentage",
      value: 10,
      maxDiscountAmount: 250,
      minSubtotal: 500,
      usageLimit: 0,
      startsAt: null,
      endsAt: null,
      status: "active",
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );

  console.log(`✅ Discount code ready: ${discountCode.code}`);
  return discountCode;
};

const seedOffer = async ({ tShirts }) => {
  const offer = await Offer.findOneAndUpdate(
    { slug: "free-delivery-on-two-items" },
    {
      title: "Free Delivery On 2+ Items",
      slug: "free-delivery-on-two-items",
      description: "Automatic free delivery when the cart has two or more items.",
      translations: {
        ar: {
          title: "توصيل مجاني عند شراء قطعتين أو أكثر",
          description:
            "توصيل مجاني تلقائي عندما تحتوي السلة على قطعتين أو أكثر.",
        },
      },
      discountType: "freeDelivery",
      discountValue: 0,
      maxDiscountAmount: 0,
      scope: "all",
      categories: [],
      products: [],
      minSubtotal: 0,
      minQuantity: 2,
      priority: 10,
      stackable: true,
      startsAt: null,
      endsAt: null,
      usageLimit: 0,
      status: "active",
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );

  console.log(`✅ Offer ready: ${offer.title}`);
  return offer;
};

const seedBundle = async ({ blackTee, washedTee }) => {
  const bundle = await Bundle.findOneAndUpdate(
    { slug: "any-two-tees-offer" },
    {
      title: "Any 2 Tees Offer",
      slug: "any-two-tees-offer",
      description: "Buy any two selected tees for a better price.",
      translations: {
        ar: {
          title: "عرض أي تيشيرتين",
          description: "اشترِ أي تيشيرتين من المنتجات المحددة بسعر أفضل.",
        },
      },
      bundleMode: "anyProducts",
      eligibleScope: "products",
      categories: [],
      products: [blackTee._id, washedTee._id],
      requiredQuantity: 2,
      pricingType: "fixedBundlePrice",
      bundlePrice: 1200,
      discountValue: 0,
      maxDiscountAmount: 0,
      allowMultipleApplications: true,
      stackable: true,
      priority: 20,
      startsAt: null,
      endsAt: null,
      usageLimit: 0,
      status: "active",
    },
    {
      returnDocument: "after",
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );

  console.log(`✅ Bundle ready: ${bundle.title}`);
  return bundle;
};

const run = async () => {
  try {
    console.log("");
    console.log("Davinto Dev Seed");
    console.log("================");
    console.log("");

    await connectToDatabase();

    await seedAdmin();
    const categories = await seedCategories();
    const products = await seedProducts(categories);
    await seedSettings();
    await seedDiscountCode();
    await seedOffer(categories);
    await seedBundle(products);

    console.log("");
    console.log("✅ Seed completed successfully.");
    console.log("");
  } catch (error) {
    console.error("");
    console.error("❌ Seed failed:");
    console.error(error.message);
    console.error("");
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close().catch(() => {});
  }
};

run();
