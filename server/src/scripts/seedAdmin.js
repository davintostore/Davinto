require("dotenv").config();

const connectDB = require("../config/db");
const Admin = require("../models/Admin");

const seedAdmin = async () => {
  try {
    await connectDB();

    const name = process.env.ADMIN_NAME || "Davinto Owner";
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env.");
    }

    if (password.length < 8) {
      throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
    }

    const existingAdmin = await Admin.findOne({
      email: email.toLowerCase().trim(),
    });

    if (existingAdmin) {
      console.log(`Admin already exists: ${existingAdmin.email}`);
      process.exit(0);
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

    process.exit(0);
  } catch (error) {
    console.error("Seed admin failed:", error.message);
    process.exit(1);
  }
};

seedAdmin();