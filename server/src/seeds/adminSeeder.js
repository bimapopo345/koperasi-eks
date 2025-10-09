import bcrypt from "bcryptjs";
import { User } from "../models/user.model.js";

export const createAdminUser = async () => {
  try {
    // Check if admin already exists
    const existingAdmin = await User.findOne({ username: "admin" });

    if (existingAdmin) {
      console.log("Admin user already exists");
      return;
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("admin123", salt);

    // Create admin user
    const adminUser = new User({
      username: "admin",
      password: hashedPassword,
      name: "Administrator",
      role: "admin",
      isActive: true,
    });

    await adminUser.save();
    console.log("Admin user created successfully");
    console.log("Username: admin");
    console.log("Password: admin123");
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
};

// Run the seeder
if (import.meta.url === `file://${process.argv[1]}`) {
  createAdminUser();
}
