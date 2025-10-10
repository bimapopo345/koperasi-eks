import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import api from "../api/index.jsx";
import Pagination from "../components/Pagination.jsx";

const MemberDetail = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  
  const [member, setMember] = useState(null);
  const [savings, setSavings] = useState([]);
  const [loans, setLoans] = useState([]); // Placeholder for future loans
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("simpanan");
  
  // Pagination for savings
  const [currentSavingsPage, setCurrentSavingsPage] = useState(1);
  const [currentLoansPage, setCurrentLoansPage] = useState(1);
  const [currentPeriodPage, setCurrentPeriodPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    if (uuid) {
      fetchMemberDetail();
      fetchMemberSavings();
    }
  }, [uuid]);

  const fetchMemberDetail = async () => {
    try {
      const response = await api.get("/api/admin/members");
      if (response.data.success) {
        const foundMember = response.data.data.find(m => m.uuid === uuid);
        if (foundMember) {
          setMember(foundMember);
        } else {
          setError("Anggota tidak ditemukan");
        }
      }
    } catch (err) {
      setError("Gagal memuat data anggota");
      console.error("Member fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMemberSavings = async () => {
    try {
      const response = await api.get("/api/admin/savings");
      if (response.data.success) {
        // Handle different response data structures
        const savingsData = response.data.data?.savings || response.data.data || response.data.savings || [];
        const memberSavings = Array.isArray(savingsData) ? savingsData.filter(
          saving => saving.memberId?._id === member?._id || 
                   saving.memberId?.uuid === uuid ||
                   (typeof saving.memberId === 'string' && saving.memberId === member?._id)
        ) : [];
        setSavings(memberSavings);
        console.log("Member savings:", memberSavings);
      }
    } catch (err) {
      console.error("Savings fetch error:", err);
      setSavings([]); // Set empty array on error
    }
  };

  // Re-fetch savings when member data is loaded
  useEffect(() => {
    if (member) {
      fetchMemberSavings();
    }
  }, [member]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const badges = {
      Pending: "bg-yellow-100 text-yellow-800",
      Approved: "bg-green-100 text-green-800",
      Rejected: "bg-red-100 text-red-800",
    };
    return badges[status] || "bg-gray-100 text-gray-800";
  };

  const getMemberName = (memberId) => {
    if (!memberId) return "Unknown";
    if (typeof memberId === "object" && memberId.name) {
      return memberId.name;
    }
    return member?.name || "Unknown";
  };

  const getProductName = (productId) => {
    if (!productId) return "Unknown";
    if (typeof productId === "object" && productId.title) {
      return productId.title;
    }
    return member?.product?.title || "Unknown";
  };

  // Pagination logic for savings
  const totalSavingsPages = Math.ceil(savings.length / itemsPerPage);
  const startSavingsIndex = (currentSavingsPage - 1) * itemsPerPage;
  const currentSavings = savings.slice(startSavingsIndex, startSavingsIndex + itemsPerPage);

  const handleSavingsPageChange = (page) => {
    setCurrentSavingsPage(page);
  };

  const handlePeriodPageChange = (page) => {
    setCurrentPeriodPage(page);
  };

  // Calculate totals
  const totalSetoran = savings
    .filter(s => s.type === "Setoran" && s.status === "Approved")
    .reduce((sum, s) => sum + s.amount, 0);
  
  const totalPenarikan = savings
    .filter(s => s.type === "Penarikan" && s.status === "Approved")
    .reduce((sum, s) => sum + s.amount, 0);

  const saldoSimpanan = totalSetoran - totalPenarikan;

  // Generate period status table
  const generatePeriodStatus = () => {
    if (!member?.product) return [];
    
    // Get total periods from product's termDuration (correct field name)
    let totalPeriods = member.product.termDuration;
    
    // If no termDuration defined in product, try to determine from existing savings data
    if (!totalPeriods && savings.length > 0) {
      const maxPeriod = Math.max(...savings.map(s => s.installmentPeriod || 1));
      totalPeriods = Math.max(maxPeriod, 12); // At least 12 periods
    }
    
    // Default to 36 if still no periods determined
    totalPeriods = totalPeriods || 36;
    const periodStatus = [];
    
    for (let period = 1; period <= totalPeriods; period++) {
      // Find all transactions for this period
      const periodTransactions = savings.filter(s => s.installmentPeriod === period);
      
      let status = 'belum_bayar';
      let totalPaid = 0;
      let requiredAmount = member.product.depositAmount || 0;
      let transactions = [];
      
      if (periodTransactions.length > 0) {
        // Sort by date, newest first
        const sortedTransactions = periodTransactions.sort((a, b) => new Date(b.savingsDate) - new Date(a.savingsDate));
        
        transactions = sortedTransactions.map(tx => ({
          ...tx,
          rejectionReason: tx.rejectionReason || null
        }));
        
        // Calculate total approved amount for this period
        const approvedTransactions = periodTransactions.filter(t => t.status === 'Approved');
        totalPaid = approvedTransactions.reduce((sum, t) => sum + t.amount, 0);
        
        // Check latest transaction status
        const latestTransaction = sortedTransactions[0];
        
        if (latestTransaction.status === 'Rejected') {
          status = 'rejected';
        } else if (latestTransaction.status === 'Pending') {
          status = 'pending';
        } else if (totalPaid >= requiredAmount) {
          status = 'paid';
        } else if (totalPaid > 0) {
          status = 'partial';
        }
      }
      
      periodStatus.push({
        period,
        status,
        totalPaid,
        requiredAmount,
        remainingAmount: Math.max(0, requiredAmount - totalPaid),
        transactions,
        percentage: requiredAmount > 0 ? (totalPaid / requiredAmount) * 100 : 0
      });
    }
    
    return periodStatus;
  };

  const periodStatusData = generatePeriodStatus();

  // Pagination for period status (moved after periodStatusData is defined)
  const totalPeriodPages = Math.ceil(periodStatusData.length / itemsPerPage);
  const startPeriodIndex = (currentPeriodPage - 1) * itemsPerPage;
  const currentPeriodData = periodStatusData.slice(startPeriodIndex, startPeriodIndex + itemsPerPage);

  const getStatusInfo = (status) => {
    const statusMap = {
      'paid': { label: 'Lunas', class: 'bg-green-100 text-green-800', icon: '✅' },
      'partial': { label: 'Sebagian', class: 'bg-yellow-100 text-yellow-800', icon: '⚠️' },
      'pending': { label: 'Pending', class: 'bg-blue-100 text-blue-800', icon: '⏳' },
      'rejected': { label: 'Ditolak', class: 'bg-red-100 text-red-800', icon: '❌' },
      'belum_bayar': { label: 'Belum Bayar', class: 'bg-gray-100 text-gray-600', icon: '⭕' }
    };
    return statusMap[status] || statusMap['belum_bayar'];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 sm:h-32 sm:w-32 border-b-2 border-pink-600 mx-auto"></div>
          <p className="mt-4 text-sm sm:text-base text-gray-600">🌸 Memuat detail anggota...</p>
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
          <p className="text-sm sm:text-base text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate("/master/anggota")}
            className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700"
          >
            Kembali ke Daftar Anggota
          </button>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="text-center">
          <div className="text-gray-400 text-4xl sm:text-6xl mb-4">👤</div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Anggota Tidak Ditemukan</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4">Anggota dengan UUID "{uuid}" tidak ditemukan</p>
          <button
            onClick={() => navigate("/master/anggota")}
            className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700"
          >
            Kembali ke Daftar Anggota
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate("/master/anggota")}
            className="text-pink-600 hover:text-pink-800 flex items-center"
          >
            <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            🌸 Detail Anggota
          </h1>
        </div>
      </div>

      {/* Member Info Card */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6 border border-pink-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informasi Dasar</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">UUID</label>
                <p className="text-sm text-gray-900 font-mono">{member.uuid}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Nama</label>
                <p className="text-sm text-gray-900 font-semibold">{member.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Username</label>
                <p className="text-sm text-gray-900">{member.user?.username}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Gender</label>
                <p className="text-sm text-gray-900">
                  <span className={`px-2 py-1 rounded-full text-xs ${member.gender === 'L' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'}`}>
                    {member.gender === 'L' ? '👨 Laki-laki' : '👩 Perempuan'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Kontak & Alamat</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Telepon</label>
                <p className="text-sm text-gray-900">{member.phone || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Kota</label>
                <p className="text-sm text-gray-900">{member.city || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Alamat Lengkap</label>
                <p className="text-sm text-gray-900">{member.completeAddress || "-"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">No Rekening</label>
                <p className="text-sm text-gray-900 font-mono">{member.accountNumber || "-"}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Produk & Saldo</h3>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Produk Simpanan</label>
                <p className="text-sm text-gray-900">
                  {member.product ? (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                      🌸 {member.product.title}
                    </span>
                  ) : (
                    <span className="text-gray-400">Belum memilih produk</span>
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Total Saldo Simpanan</label>
                <p className="text-lg font-bold text-green-600">{formatCurrency(saldoSimpanan)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-gray-500">Total Setoran</label>
                  <p className="font-semibold text-green-600">{formatCurrency(totalSetoran)}</p>
                </div>
                <div>
                  <label className="text-gray-500">Total Penarikan</label>
                  <p className="font-semibold text-red-600">{formatCurrency(totalPenarikan)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-pink-100">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("simpanan")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "simpanan"
                  ? "border-pink-500 text-pink-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              💰 Simpanan ({savings.length})
            </button>
            <button
              onClick={() => setActiveTab("pinjaman")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "pinjaman"
                  ? "border-pink-500 text-pink-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              🏦 Pinjaman (0)
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "simpanan" && (
            <div>
              {/* Projection Cards */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan Proyeksi & Realisasi</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Proyeksi Card */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-blue-800">📊 Proyeksi Total</h4>
                      <div className="text-blue-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-blue-700 mb-2">
                      {member?.product ? formatCurrency((member.product.depositAmount || 0) * periodStatusData.length) : 'Rp 0'}
                    </div>
                    <div className="text-sm text-blue-600">
                      {member?.product ? `${formatCurrency(member.product.depositAmount)} × ${periodStatusData.length} periode` : 'Belum ada produk'}
                    </div>
                  </div>

                  {/* Realisasi Card */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6 border border-green-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-green-800">💰 Realisasi (Approved)</h4>
                      <div className="text-green-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-green-700 mb-2">
                      {formatCurrency(totalSetoran)}
                    </div>
                    <div className="text-sm text-green-600">
                      {periodStatusData.filter(p => p.status === 'paid').length} periode lunas
                    </div>
                  </div>

                  {/* Progress Card */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border border-purple-200">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-purple-800">📈 Progress</h4>
                      <div className="text-purple-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-purple-700 mb-2">
                      {member?.product ? 
                        `${(((totalSetoran) / ((member.product.depositAmount || 1) * periodStatusData.length)) * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </div>
                    <div className="w-full bg-purple-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                        style={{ 
                          width: member?.product ? 
                            `${Math.min(((totalSetoran) / ((member.product.depositAmount || 1) * periodStatusData.length)) * 100, 100)}%`
                            : '0%'
                        }}
                      ></div>
                    </div>
                    <div className="text-sm text-purple-600">
                      Dari target keseluruhan
                    </div>
                  </div>
                </div>
              </div>

              {/* Period Status Overview */}
              {member?.product && periodStatusData.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Periode Pembayaran</h3>
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center text-sm">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {periodStatusData.filter(p => p.status === 'paid').length}
                        </div>
                        <div className="text-gray-600">Lunas</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-yellow-600">
                          {periodStatusData.filter(p => p.status === 'partial').length}
                        </div>
                        <div className="text-gray-600">Sebagian</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {periodStatusData.filter(p => p.status === 'pending').length}
                        </div>
                        <div className="text-gray-600">Pending</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">
                          {(() => {
                            // Count periods that have rejected transactions (most recent status is rejected)
                            return periodStatusData.filter(p => {
                              if (p.transactions.length === 0) return false;
                              const latestTx = p.transactions.sort((a, b) => new Date(b.savingsDate) - new Date(a.savingsDate))[0];
                              return latestTx.status === 'Rejected';
                            }).length;
                          })()}
                        </div>
                        <div className="text-gray-600">Ditolak</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-600">
                          {periodStatusData.filter(p => p.status === 'belum_bayar').length}
                        </div>
                        <div className="text-gray-600">Belum Bayar</div>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-pink-50 to-rose-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                            Periode
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                            Dibayar
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                            Target
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                            Sisa
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                            Progress
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                            Transaksi
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentPeriodData.map((period) => {
                          const statusInfo = getStatusInfo(period.status);
                          return (
                            <tr key={period.period} className="hover:bg-pink-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                Periode {period.period}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusInfo.class}`}>
                                  {statusInfo.icon} {statusInfo.label}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                <span className={period.totalPaid > 0 ? 'font-semibold text-green-600' : 'text-gray-400'}>
                                  {formatCurrency(period.totalPaid)}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {formatCurrency(period.requiredAmount)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                <span className={period.remainingAmount > 0 ? 'font-semibold text-red-600' : 'text-gray-400'}>
                                  {formatCurrency(period.remainingAmount)}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                <div className="flex items-center">
                                  <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                                    <div 
                                      className={`h-2 rounded-full ${
                                        period.percentage >= 100 ? 'bg-green-500' : 
                                        period.percentage > 0 ? 'bg-yellow-500' : 'bg-gray-300'
                                      }`}
                                      style={{ width: `${Math.min(period.percentage, 100)}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs text-gray-600 w-12">
                                    {period.percentage.toFixed(0)}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {period.transactions.length > 0 ? (
                                  <div className="space-y-1">
                                    {period.transactions.map((tx, idx) => (
                                      <div key={idx} className="text-xs">
                                        <span className={`inline-block px-1 py-0.5 rounded text-white text-xs ${
                                          tx.status === 'Approved' ? 'bg-green-500' :
                                          tx.status === 'Pending' ? 'bg-yellow-500' :
                                          'bg-red-500'
                                        }`}>
                                          {tx.status}
                                        </span>
                                        <span className="ml-1">{formatCurrency(tx.amount)}</span>
                                        {tx.status === 'Rejected' && tx.rejectionReason && (
                                          <div className="text-red-600 text-xs italic mt-1">
                                            💬 "{tx.rejectionReason}"
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination for Period Status */}
                  {totalPeriodPages > 1 && (
                    <div className="mt-4">
                      <Pagination
                        currentPage={currentPeriodPage}
                        totalPages={totalPeriodPages}
                        onPageChange={handlePeriodPageChange}
                        itemsPerPage={itemsPerPage}
                        totalItems={periodStatusData.length}
                      />
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

          {activeTab === "pinjaman" && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Riwayat Pinjaman</h3>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🏦</div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">Fitur Pinjaman</h4>
                <p className="text-gray-500 mb-4">Fitur pinjaman akan segera hadir</p>
                <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Coming Soon
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemberDetail;