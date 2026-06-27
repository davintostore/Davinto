require("dotenv").config();

const mongoose = require("mongoose");

const Category = require("../models/Category");
const { getCategoryImageUrl } = require("../config/launchImageMap");

const normalizeText = (value = "") => String(value || "").trim();

const connectToDatabase = async () => {
  const mongoUri = normalizeText(process.env.MONGO_URI);

  if (!mongoUri) {
    throw new Error("MONGO_URI is required to update the Blanks category image.");
  }

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected.");
};

const run = async () => {
  const nextImageUrl = getCategoryImageUrl("blanks");

  try {
    console.log("");
    console.log("Davinto Blanks Category Image Update");
    console.log("====================================");
    console.log(`Target image URL: ${nextImageUrl}`);
    console.log("");

    await connectToDatabase();

    const category = await Category.findOne({ slug: "blanks" }).select(
      "name slug image"
    );

    if (!category) {
      throw new Error("Blanks category was not found.");
    }

    const currentImageUrl = normalizeText(category.image?.url);

    if (currentImageUrl === nextImageUrl) {
      console.log("Blanks category image is already up to date.");
      return;
    }

    await Category.updateOne(
      { _id: category._id },
      { $set: { "image.url": nextImageUrl } }
    );

    console.log("Updated Category blanks: image.url");
    console.log(`  ${currentImageUrl || "(empty)"}`);
    console.log(`  -> ${nextImageUrl}`);
  } catch (error) {
    console.error("");
    console.error("Blanks category image update failed:");
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
