require("dotenv").config();

const mongoose = require("mongoose");
const Admin = require("../models/Admin");

const normalizeText = (value = "") => String(value || "").trim();

const connectToDatabase = async () => {
  const mongoUri = normalizeText(process.env.MONGO_URI);

  if (!mongoUri) {
    throw new Error("MONGO_URI is required to seed the admin account.");
  }

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected.");
};

const run = async () => {
  try {
    await connectToDatabase();

    const name = process.env.ADMIN_NAME || "Davinto Owner";
    const email = String(process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env.");
    }

    if (password.length < 8) {
      throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
    }

    const existingAdmin = await Admin.findOne({ email });

    if (existingAdmin) {
      existingAdmin.name = name;
      existingAdmin.password = password;
      existingAdmin.role = existingAdmin.role || "owner";
      existingAdmin.isActive = true;

      const admin = await existingAdmin.save();

      console.log("Admin updated successfully:");
      console.log({
        id: admin._id.toString(),
        name: admin.name,
        email: admin.email,
        role: admin.role,
      });
      return admin;
    }

    const admin = await Admin.create({
      name,
      email,
      password,
      role: "owner",
      isActive: true,
    });

    console.log("Admin created successfully:");
    console.log({
      id: admin._id.toString(),
      name: admin.name,
      email: admin.email,
      role: admin.role,
    });
    return admin;
  } catch (error) {
    console.error("Seed admin failed:", error.message);
    process.exitCode = 1;
    throw error;
  }
};

if (require.main === module) {
  run()
    .catch(() => {})
    .finally(() => {
      mongoose.connection.close().catch(() => {});
    });
}

module.exports = {
  run,
};
