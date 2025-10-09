import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import conf from "../conf/conf.js";
import seedDashboardData from "../seeds/dashboardSeeder.js";

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(conf.mongodbUri);
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
};

// Seed admin user
const seedAdminUser = async () => {
  try {
    // Cek apakah admin sudah ada
    const existingAdmin = await User.findOne({ username: "admin" });

    if (existingAdmin) {
      console.log("Admin user sudah ada");
      return;
    }

    // Buat admin default
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 5);
    const adminUuid = `ADMIN_${timestamp}_${random}`.toUpperCase();

    const adminUser = new User({
      uuid: adminUuid,
      username: "admin",
      password: "admin123", // Password akan di-hash otomatis oleh pre-save middleware
      name: "Administrator",
      role: "admin",
      isActive: true,
    });

    await adminUser.save();
    console.log("Admin user berhasil dibuat:");
    console.log("Username: admin");
    console.log("Password: admin123");
    console.log("Role: admin");
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
};

// Run seeder
const runSeeder = async () => {
  console.log("Starting database seeder...");

  await connectDB();
  await seedAdminUser();
  await seedDashboardData();

  console.log("Seeder completed!");
  process.exit(0);
};

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
  process.exit(1);
});

// Run the seeder
runSeeder();
