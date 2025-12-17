/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import api from "../api/index.jsx";
import { SavingsChart } from "../components/charts/index.jsx";

const Dashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const [stats, setStats] = useState({
    totalMembers: 0,
    totalDeposits: 0,
    totalProducts: 0,
    activeSavingsCount: 0,
    recentTransactions: [],
    monthlyStats: [],
    // Loan statistics
    totalLoanProducts: 0,
    totalActiveLoans: 0,
    totalLoanDisbursed: 0,
    totalLoanCollected: 0,
    totalOutstanding: 0,
    overdueLoans: 0,
    recentLoanActivities: [],
    monthlyLoanStats: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get("/api/admin/dashboard");
        if (response.data.success) {
          setStats({
            totalMembers: response.data.data.totalMembers,
            totalDeposits: response.data.data.totalSavings,
            totalProducts: response.data.data.totalProducts,
            activeSavingsCount: response.data.data.activeSavingsCount || 0,
            recentTransactions: response.data.data.recentTransactions,
            monthlyStats: response.data.data.monthlyStats || [],
            // Loan statistics
            totalLoanProducts: response.data.data.totalLoanProducts || 0,
            totalActiveLoans: response.data.data.totalActiveLoans || 0,
            totalLoanDisbursed: response.data.data.totalLoanDisbursed || 0,
            totalLoanCollected: response.data.data.totalLoanCollected || 0,
            totalOutstanding: response.data.data.totalOutstanding || 0,
            overdueLoans: response.data.data.overdueLoans || 0,
            recentLoanActivities: response.data.data.recentLoanActivities || [],
            monthlyLoanStats: response.data.data.monthlyLoanStats || [],
          });
        }
      } catch (err) {
        setError("Gagal memuat data dashboard");
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 sm:h-32 sm:w-32 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-sm sm:text-base text-gray-600">🌸 Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="text-red-600 text-4xl sm:text-6xl mb-4">⚠️</div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Error</h2>
          <p className="text-sm sm:text-base text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          🌸 Dashboard LPK SAMIT
        </h1>
        <p className="text-sm sm:text-base text-gray-600 mt-2">
          Selamat datang, {user?.name} - Sakura Mitra
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <StatCard
          title="Total Anggota"
          value={stats.totalMembers}
          icon="👥"
          color="bg-pink-100 text-pink-600"
        />
        <StatCard
          title="Total Tabungan"
          value={typeof stats.totalLoanCollected === 'number' ? 
            new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              minimumFractionDigits: 0,
            }).format(stats.totalDeposits) : 
            "Rp 0"
          }
          icon="💰"
          color="bg-rose-100 text-rose-600"
        />
        <StatCard
          title="Produk Simpanan"
          value={stats.totalProducts}
          icon="📋"
          color="bg-purple-100 text-purple-600"
        />
        <StatCard
          title="Produk Simpanan Aktif"
          value={stats.activeSavingsCount}
          icon="🌸"
          color="bg-pink-100 text-pink-600"
        />
      </div>

      {/* Loan Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <StatCard
          title="Produk Pinjaman"
          value={stats.totalLoanProducts || 0}
          icon="📦"
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Total Pinjaman Aktif"
          value={stats.totalActiveLoans || 0}
          icon="💳"
          color="bg-green-100 text-green-600"
        />
        <StatCard
          title="Total Pinjaman Terbayar"
          value={typeof stats.totalLoanCollected === 'number' ? 
            new Intl.NumberFormat("id-ID", {
              style: "currency",
              currency: "IDR",
              minimumFractionDigits: 0,
            }).format(stats.totalLoanCollected) : 
            "Rp 0"
          }
          icon="✅"
          color="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          title="Jatuh Tempo"
          value={stats.overdueLoans || 0}
          icon="⚠️"
          color={stats.overdueLoans > 0 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-pink-100">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
            🌸 Aksi Cepat
          </h3>
          <div className="space-y-2 sm:space-y-3">
            <button className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <span className="text-pink-600 mr-2 sm:mr-3 text-sm sm:text-base">👤</span>
                <span className="text-xs sm:text-sm font-medium text-gray-900">
                  Tambah Anggota Baru
                </span>
              </div>
            </button>
            <button className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <span className="text-rose-600 mr-2 sm:mr-3 text-sm sm:text-base">💰</span>
                <span className="text-xs sm:text-sm font-medium text-gray-900">
                  Proses Setoran
                </span>
              </div>
            </button>
            <button className="w-full text-left px-3 sm:px-4 py-2 sm:py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
              <div className="flex items-center">
                <span className="text-purple-600 mr-2 sm:mr-3 text-sm sm:text-base">🌸</span>
                <span className="text-xs sm:text-sm font-medium text-gray-900">
                  Tambah Produk
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-pink-100">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
            🌸 Aktivitas Terkini
          </h3>
          <div className="space-y-4">
            {stats.recentTransactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} />
            ))}
          </div>
        </div>
      </div>

      {/* Statistics Chart */}
      <div className="mt-6 sm:mt-8">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-pink-100">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
            📊 Statistik Bulanan
          </h3>
          <SavingsChart data={stats.monthlyStats} />
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-4 sm:p-6 border border-pink-100">
    <div className="flex items-center">
      <div className={`p-2 sm:p-3 rounded-lg ${color}`}>
        <span className="text-lg sm:text-2xl">{icon}</span>
      </div>
      <div className="ml-3 sm:ml-4">
        <p className="text-xs sm:text-sm font-medium text-gray-600">{title}</p>
        <p className="text-lg sm:text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
);

// Transaction Item Component
const TransactionItem = ({ transaction }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
    <div className="flex items-center">
      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mr-3">
        <span className="text-gray-600 text-sm font-bold">
          {transaction.member.charAt(0)}
        </span>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">
          {transaction.member}
        </p>
        <p className="text-xs text-gray-500">{transaction.date}</p>
      </div>
    </div>
    <div className="text-right">
      <p
        className={`text-sm font-medium ${
          transaction.type === "Setoran" ? "text-green-600" : "text-red-600"
        }`}
      >
        {transaction.type === "Setoran" ? "+" : "-"}Rp{" "}
        {transaction.amount.toLocaleString("id-ID")}
      </p>
      <p className="text-xs text-gray-500">{transaction.type}</p>
    </div>
  </div>
);

export default Dashboard;
