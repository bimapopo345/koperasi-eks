import { User, Product, Savings } from "../db/index.js";

const seedDashboardData = async () => {
  try {
    // Hapus data yang sudah ada kecuali admin
    await Savings.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({ role: { $ne: "admin" } });

    // Buat data produk
    const products = await Product.create([
      {
        title: "Paket Kouhai",
        depositAmount: 2500000,
        returnProfit: 10,
        termDuration: 36,
        description:
          "Simpanan dengan jangka pendek, fleksibel dan menguntungkan",
      },
      {
        title: "Paket Senpai",
        depositAmount: 3500000,
        returnProfit: 10,
        termDuration: 36,
        description:
          "Simpanan dengan jangka pendek, fleksibel dan menguntungkan",
      },
     {
        title: "Paket Kouhai",
        depositAmount: 5000000,
        returnProfit: 10,
        termDuration: 36,
        description:
          "Simpanan dengan jangka pendek, fleksibel dan menguntungkan",
      },
    ]);

    console.log("✅ Dashboard data seeded successfully!");
    console.log(`- Created ${products.length} products`);

    return {
      products: products.length,
    };
  } catch (error) {
    console.error("❌ Error seeding dashboard data:", error);
    throw error;
  }
};

export default seedDashboardData;
