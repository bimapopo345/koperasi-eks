import { User, Product, Savings, LoanProduct } from "../db/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getDashboardStats = asyncHandler(async (req, res) => {
  try {
    // Get total members count
    const totalMembers = await User.countDocuments();

    // Get total savings amount (only approved deposits)
    const totalSavingsResult = await Savings.aggregate([
      {
        $match: {
          type: "Setoran",
          status: "Approved",
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);
    const totalSavings = totalSavingsResult[0]?.totalAmount || 0;

    // Get total products count
    const totalProducts = await Product.countDocuments();

    // Get active loan products count (produk pinjaman yang aktif)
    const activeSavingsCount = await LoanProduct.countDocuments({
      isActive: true,
    });

    // Get recent transactions (last 10 savings)
    const recentTransactions = await Savings.find()
      .populate("memberId", "name uuid")
      .sort({ createdAt: -1 })
      .limit(10)
      .select("amount savingsDate type memberId description");

    // Get monthly statistics for chart
    const monthlyStats = await Savings.aggregate([
      {
        $match: {
          status: "Approved",
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$savingsDate" },
            month: { $month: "$savingsDate" },
          },
          deposits: {
            $sum: {
              $cond: [{ $eq: ["$type", "Setoran"] }, "$amount", 0],
            },
          },
          withdrawals: {
            $sum: {
              $cond: [{ $eq: ["$type", "Penarikan"] }, "$amount", 0],
            },
          },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
      {
        $limit: 6,
      },
      {
        $project: {
          month: {
            $let: {
              vars: {
                months: [
                  "",
                  "Jan",
                  "Feb",
                  "Mar",
                  "Apr",
                  "Mei",
                  "Jun",
                  "Jul",
                  "Agu",
                  "Sep",
                  "Okt",
                  "Nov",
                  "Des",
                ],
              },
              in: {
                $arrayElemAt: ["$$months", "$_id.month"],
              },
            },
          },
          deposits: 1,
          withdrawals: 1,
        },
      },
    ]);

    // Format transactions for frontend
    const formattedTransactions = recentTransactions.map((transaction) => ({
      id: transaction._id,
      member: transaction.memberId?.name || "Unknown",
      memberUuid: transaction.memberId?.uuid || "",
      amount: transaction.amount,
      date: transaction.savingsDate
        ? new Date(transaction.savingsDate).toLocaleDateString("id-ID")
        : new Date(transaction.createdAt).toLocaleDateString("id-ID"),
      type: transaction.type || "Setoran",
      description: transaction.description || "",
    }));

    res.status(200).json({
      success: true,
      data: {
        totalMembers,
        totalSavings,
        totalProducts,
        activeSavingsCount,
        recentTransactions: formattedTransactions,
        monthlyStats,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data dashboard",
      error: error.message,
    });
  }
});

export { getDashboardStats };
