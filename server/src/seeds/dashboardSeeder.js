import { User, Product, Savings } from "../db/index.js";

const seedDashboardData = async () => {
  try {
    // Hapus data yang sudah ada kecuali admin
    await Savings.deleteMany({});
    await Product.deleteMany({});
    await User.deleteMany({ role: { $ne: "admin" } });

    // Buat data users/anggota
    const membersData = [
      {
        username: "member1",
        password: "password123",
        name: "Ahmad Santoso",
        role: "staff",
      },
      {
        username: "member2",
        password: "password123",
        name: "Siti Nurhaliza",
        role: "staff",
      },
      {
        username: "member3",
        password: "password123",
        name: "Budi Pratama",
        role: "staff",
      },
      {
        username: "member4",
        password: "password123",
        name: "Dewi Lestari",
        role: "staff",
      },
      {
        username: "member5",
        password: "password123",
        name: "Eko Prasetyo",
        role: "staff",
      },
    ];

    // Tambahkan UUID untuk setiap member
    const membersWithUuid = membersData.map((member, index) => {
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substr(2, 5);
      return {
        ...member,
        uuid: `MEMBER_${timestamp}_${index}_${random}`.toUpperCase(),
      };
    });

    const members = await User.create(membersWithUuid);

    // Buat data produk
    const products = await Product.create([
      {
        title: "Simpanan Harian",
        depositAmount: 100000,
        returnProfit: 3,
        termDuration: 30,
        description:
          "Simpanan dengan jangka pendek, fleksibel dan menguntungkan",
      },
      {
        title: "Simpanan Bulanan",
        depositAmount: 500000,
        returnProfit: 5,
        termDuration: 90,
        description:
          "Simpanan jangka menengah dengan keuntungan yang lebih baik",
      },
      {
        title: "Simpanan Tahunan",
        depositAmount: 5000000,
        returnProfit: 8,
        termDuration: 365,
        description: "Simpanan jangka panjang untuk masa depan yang lebih baik",
      },
    ]);

    // Buat data transaksi/savings
    const savingsData = [
      {
        memberId: members[0]._id,
        amount: 1000000,
        savingsDate: new Date("2024-01-15"),
        type: "Setoran",
        description: "Setoran awal",
        installmentPeriod: 12,
      },
      {
        memberId: members[1]._id,
        amount: 2500000,
        savingsDate: new Date("2024-01-20"),
        type: "Setoran",
        description: "Setoran bulanan Januari",
        installmentPeriod: 6,
      },
      {
        memberId: members[2]._id,
        amount: 5000000,
        savingsDate: new Date("2024-02-01"),
        type: "Setoran",
        description: "Setoran tahunan",
        installmentPeriod: 12,
      },
      {
        memberId: members[3]._id,
        amount: 750000,
        savingsDate: new Date("2024-02-10"),
        type: "Setoran",
        description: "Setoran tambahan",
        installmentPeriod: 3,
      },
      {
        memberId: members[4]._id,
        amount: 2000000,
        savingsDate: new Date("2024-02-15"),
        type: "Setoran",
        description: "Setoran untuk produk bulanan",
        installmentPeriod: 6,
      },
      {
        memberId: members[0]._id,
        amount: 500000,
        savingsDate: new Date("2024-02-20"),
        type: "Setoran",
        description: "Setoran bulanan Februari",
        installmentPeriod: 12,
      },
      {
        memberId: members[1]._id,
        amount: 1000000,
        savingsDate: new Date("2024-03-01"),
        type: "Setoran",
        description: "Setoran bulanan Maret",
        installmentPeriod: 6,
      },
      {
        memberId: members[2]._id,
        amount: 3000000,
        savingsDate: new Date("2024-03-05"),
        type: "Setoran",
        description: "Setoran tambahan investasi",
        installmentPeriod: 12,
      },
      {
        memberId: members[3]._id,
        amount: 1500000,
        savingsDate: new Date("2024-03-10"),
        type: "Setoran",
        description: "Setoran untuk liburan",
        installmentPeriod: 3,
      },
      {
        memberId: members[4]._id,
        amount: 4000000,
        savingsDate: new Date("2024-03-15"),
        type: "Setoran",
        description: "Setoran semesteran",
        installmentPeriod: 6,
      },
    ];

    // Tambahkan UUID untuk setiap savings
    const savingsWithUuid = savingsData.map((saving, index) => {
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substr(2, 5);
      return {
        ...saving,
        uuid: `SAVINGS_${timestamp}_${index}_${random}`.toUpperCase(),
      };
    });

    const savings = await Savings.create(savingsWithUuid);

    console.log("✅ Dashboard data seeded successfully!");
    console.log(`- Created ${members.length} members`);
    console.log(`- Created ${products.length} products`);
    console.log(`- Created ${savings.length} savings`);

    return {
      members: members.length,
      products: products.length,
      savings: savings.length,
    };
  } catch (error) {
    console.error("❌ Error seeding dashboard data:", error);
    throw error;
  }
};

export default seedDashboardData;
