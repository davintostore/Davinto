require("dotenv").config();

const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");

const Category = require("../models/Category");
const Product = require("../models/Product");

const isApplyMode = process.argv.includes("--apply");

const CANONICAL_CATEGORIES = [
  {
    name: "Nature & Botanical",
    arabicName: "طبيعة ونباتات",
    slug: "nature-botanical",
    aliases: ["nature-botanical", "nature-and-botanical", "Nature & Botanical"],
    sortOrder: 1,
  },
  {
    name: "Music & Culture",
    arabicName: "موسيقى وثقافة",
    slug: "music-culture",
    aliases: ["music-culture", "music-and-culture", "Music & Culture"],
    sortOrder: 2,
  },
  {
    name: "Words",
    arabicName: "كلمات",
    slug: "words",
    aliases: ["words", "Words"],
    sortOrder: 3,
  },
  {
    name: "Graphic Design",
    arabicName: "تصميم جرافيك",
    slug: "graphic-design",
    aliases: ["graphic-design", "graphic", "Graphic Design"],
    sortOrder: 4,
  },
  {
    name: "Blanks",
    arabicName: "أساسيات سادة",
    slug: "blanks",
    aliases: ["blanks", "blank", "Blanks"],
    sortOrder: 5,
  },
  {
    name: "Art and History",
    arabicName: "فن وتاريخ",
    slug: "art-history",
    aliases: ["art-history", "art-and-history", "Art & History", "Art and History"],
    sortOrder: 6,
  },
];

const normalizeKey = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const canonicalByAlias = new Map();
CANONICAL_CATEGORIES.forEach((canonical) => {
  [canonical.slug, canonical.name, ...canonical.aliases].forEach((alias) => {
    canonicalByAlias.set(normalizeKey(alias), canonical);
  });
});

const getCanonicalForCategory = (category) =>
  canonicalByAlias.get(normalizeKey(category?.slug)) ||
  canonicalByAlias.get(normalizeKey(category?.name)) ||
  null;

const findDuplicates = (categories, field) => {
  const groups = new Map();
  categories.forEach((category) => {
    const key = normalizeKey(category[field]);
    if (!key) return;
    groups.set(key, [...(groups.get(key) || []), String(category._id)]);
  });
  return Array.from(groups.entries())
    .filter(([, ids]) => ids.length > 1)
    .map(([value, ids]) => ({ value, ids }));
};

const printReport = (report) => {
  console.log(JSON.stringify(report, null, 2));
};

const createBackup = (categories, products) => {
  const backupDirectory = path.resolve(
    __dirname,
    "../../../_owner-assets/backups"
  );
  fs.mkdirSync(backupDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(
    backupDirectory,
    `category-migration-backup-${timestamp}.json`
  );
  const backup = {
    createdAt: new Date().toISOString(),
    categories: categories.map((category) => ({
      id: String(category._id),
      name: category.name,
      slug: category.slug,
      status: category.status,
      sortOrder: category.sortOrder,
      translations: category.translations,
      image: category.image,
    })),
    products: products.map((product) => ({
      id: String(product._id),
      name: product.name,
      slug: product.slug,
      categoryId: product.category ? String(product.category) : null,
    })),
  };
  fs.writeFileSync(backupPath, `${JSON.stringify(backup, null, 2)}\n`, "utf8");
  return backupPath;
};

const run = async () => {
  const mongoUri = String(process.env.MONGO_URI || "").trim();
  if (!mongoUri) {
    throw new Error("MONGO_URI is required. No database changes were attempted.");
  }

  await mongoose.connect(mongoUri);

  const categories = await Category.find({}).lean();
  const products = await Product.find({}).select("name slug category").lean();
  const categoryById = new Map(
    categories.map((category) => [String(category._id), category])
  );
  const categoryMatches = new Map(
    CANONICAL_CATEGORIES.map((canonical) => [canonical.slug, []])
  );

  categories.forEach((category) => {
    const canonical = getCanonicalForCategory(category);
    if (canonical) categoryMatches.get(canonical.slug).push(category);
  });

  const productCounts = Object.fromEntries(
    CANONICAL_CATEGORIES.map((canonical) => [canonical.slug, 0])
  );
  const unmappedProducts = [];

  products.forEach((product) => {
    const category = categoryById.get(String(product.category || ""));
    const canonical = getCanonicalForCategory(category);
    if (!category || !canonical) {
      unmappedProducts.push({
        id: String(product._id),
        name: product.name,
        slug: product.slug,
        categoryId: product.category ? String(product.category) : null,
        categoryName: category?.name || null,
        categorySlug: category?.slug || null,
      });
      return;
    }
    productCounts[canonical.slug] += 1;
  });

  const matchedCategoryIds = new Set(
    Array.from(categoryMatches.values()).flat().map((category) => String(category._id))
  );
  const obsoleteCategories = categories
    .filter((category) => !matchedCategoryIds.has(String(category._id)))
    .map((category) => ({
      id: String(category._id),
      name: category.name,
      slug: category.slug,
    }));
  const duplicateCanonicalMatches = Array.from(categoryMatches.entries())
    .filter(([, matches]) => matches.length > 1)
    .map(([slug, matches]) => ({
      slug,
      categoryIds: matches.map((category) => String(category._id)),
    }));
  const report = {
    mode: isApplyMode ? "apply" : "dry-run",
    currentCategories: categories.map((category) => ({
      id: String(category._id),
      name: category.name,
      slug: category.slug,
    })),
    canonicalCategories: CANONICAL_CATEGORIES.map(({ name, arabicName, slug }) => ({
      name,
      arabicName,
      slug,
      action: categoryMatches.get(slug).length > 0 ? "update" : "create",
    })),
    obsoleteCategories,
    productCounts,
    unmappedProducts,
    orphanRisk: unmappedProducts,
    duplicateSlugs: findDuplicates(categories, "slug"),
    duplicateNames: findDuplicates(categories, "name"),
    duplicateCanonicalMatches,
  };

  printReport(report);

  if (!isApplyMode) {
    console.log("Dry-run complete. Re-run with --apply only after reviewing this report.");
    return;
  }

  if (unmappedProducts.length > 0) {
    throw new Error(
      `Apply refused: ${unmappedProducts.length} product(s) cannot be mapped safely.`
    );
  }

  const backupPath = createBackup(categories, products);
  console.log(`Backup created: ${backupPath}`);

  const canonicalDocuments = new Map();
  for (const canonical of CANONICAL_CATEGORIES) {
    const matches = categoryMatches.get(canonical.slug);
    const preferredMatch =
      matches.find((category) => category.slug === canonical.slug) || matches[0];
    let document;

    if (preferredMatch) {
      document = await Category.findById(preferredMatch._id);
      document.name = canonical.name;
      document.slug = canonical.slug;
      document.status = "active";
      document.sortOrder = canonical.sortOrder;
      document.translations.ar.name = canonical.arabicName;
      await document.save();
    } else {
      document = await Category.create({
        name: canonical.name,
        slug: canonical.slug,
        status: "active",
        sortOrder: canonical.sortOrder,
        translations: { ar: { name: canonical.arabicName } },
      });
    }
    canonicalDocuments.set(canonical.slug, document);
  }

  const productUpdates = products.map((product) => {
    const oldCategory = categoryById.get(String(product.category));
    const canonical = getCanonicalForCategory(oldCategory);
    return {
      updateOne: {
        filter: { _id: product._id },
        update: { $set: { category: canonicalDocuments.get(canonical.slug)._id } },
      },
    };
  });
  if (productUpdates.length > 0) await Product.bulkWrite(productUpdates);

  const canonicalIds = Array.from(canonicalDocuments.values()).map(
    (document) => document._id
  );
  const invalidProductCount = await Product.countDocuments({
    category: { $nin: canonicalIds },
  });
  if (invalidProductCount > 0) {
    throw new Error(
      `Verification failed before deletion: ${invalidProductCount} product(s) do not reference canonical categories.`
    );
  }

  await Category.deleteMany({ _id: { $nin: canonicalIds } });

  const finalCategories = await Category.find({}).select("name slug").lean();
  const finalDuplicateSlugs = findDuplicates(finalCategories, "slug");
  const finalInvalidProductCount = await Product.countDocuments({
    category: { $nin: canonicalIds },
  });
  if (
    finalCategories.length !== 6 ||
    finalDuplicateSlugs.length > 0 ||
    finalInvalidProductCount > 0
  ) {
    throw new Error("Final verification failed. Review the backup before retrying.");
  }

  console.log(
    JSON.stringify(
      {
        applied: true,
        backupPath,
        categoriesRemaining: finalCategories.length,
        duplicateCanonicalSlugs: finalDuplicateSlugs,
        productsReassigned: productUpdates.length,
        invalidProductReferences: finalInvalidProductCount,
      },
      null,
      2
    )
  );
};

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
