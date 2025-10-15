import { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "react-toastify";
import { API_URL } from "../api/config";
import Pagination from "../components/Pagination.jsx";

const Loans = () => {
  const [loanPayments, setLoanPayments] = useState([]);
  const [loans, setLoans] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [paymentSchedule, setPaymentSchedule] = useState([]);
  
  const [formData, setFormData] = useState({
    loanId: "",
    memberId: "",
    amount: "",
    paymentDate: format(new Date(), "yyyy-MM-dd"),
    description: "",
    notes: "",
    proofFile: null,
  });

  const [loanInfo, setLoanInfo] = useState({
    nextPeriod: 1,
    expectedAmount: 0,
    dueDate: null,
    memberName: "",
    productName: "",
    outstandingAmount: 0,
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Summary state for totals
  const [summary, setSummary] = useState({
    totalPending: 0,
    totalApproved: 0,
    totalRejected: 0,
    countPending: 0,
    countApproved: 0,
    countRejected: 0,
  });

  // Filter state
  const [filterStatus, setFilterStatus] = useState("");
  const [filterMember, setFilterMember] = useState("");

  // Fetch data
  const fetchLoanPayments = async () => {
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage,
      });
      
      if (filterStatus) params.append("status", filterStatus);
      if (filterMember) params.append("memberId", filterMember);
      
      const response = await axios.get(
        `${API_URL}/api/admin/loan-payments?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setLoanPayments(response.data.data.payments || []);
        setSummary(response.data.data.summary || {});
      }
    } catch (error) {
      console.error("Error fetching loan payments:", error);
      toast.error("Gagal memuat data cicilan pinjaman");
    }
  };

  const fetchActiveLoans = async () => {
    try {
      const token = localStorage.getItem("token");
      // Fetch both Active and Approved status loans
      const response = await axios.get(
        `${API_URL}/api/admin/loans?limit=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        const allLoans = response.data.data.loans || [];
        // Filter only Active or Approved loans for payment
        const activeLoans = allLoans.filter(loan => 
          loan.status === 'Active' || loan.status === 'Approved'
        );
        setLoans(activeLoans);
        console.log("Active loans loaded:", activeLoans);
      }
    } catch (error) {
      console.error("Error fetching loans:", error);
      toast.error("Gagal memuat data pinjaman");
    }
  };

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/admin/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data?.data || response.data || [];
      setMembers(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Gagal memuat data anggota");
      setMembers([]);
    }
  };

  const fetchLoanDetail = async (loanId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_URL}/api/admin/loan-payments/loan/${loanId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        setSelectedLoan(response.data.data.loan);
        setPaymentSchedule(response.data.data.paymentSchedule || []);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error("Error fetching loan detail:", error);
      toast.error("Gagal memuat detail pinjaman");
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchLoanPayments(),
        fetchActiveLoans(),
        fetchMembers()
      ]);
      setLoading(false);
    };
    loadData();
  }, [currentPage, filterStatus, filterMember]);

  // Auto-fill loan info when member is selected
  useEffect(() => {
    if (formData.memberId) {
      // Find active loans for this member
      const memberLoans = loans.filter(loan => {
        if (!loan.memberId) return false;
        const memberId = typeof loan.memberId === 'object' ? loan.memberId._id : loan.memberId;
        return memberId === formData.memberId;
      });
      
      console.log("Member loans found:", memberLoans);
      
      if (memberLoans.length === 1) {
        // Auto-select if only one loan
        setFormData(prev => ({ ...prev, loanId: memberLoans[0]._id }));
      } else if (memberLoans.length === 0) {
        // Reset loan selection if no loans found
        setFormData(prev => ({ ...prev, loanId: "" }));
        setLoanInfo({
          nextPeriod: 1,
          expectedAmount: 0,
          dueDate: null,
          memberName: "",
          productName: "",
          outstandingAmount: 0,
        });
      }
    }
  }, [formData.memberId, loans]);

  // Update loan info when loan is selected
  useEffect(() => {
    if (formData.loanId) {
      const loan = loans.find(l => l._id === formData.loanId);
      if (loan) {
        const nextPeriod = (loan.paidPeriods || 0) + 1;
        setLoanInfo({
          nextPeriod,
          expectedAmount: loan.monthlyInstallment,
          dueDate: loan.nextDueDate,
          memberName: loan.memberId?.name || "",
          productName: loan.loanProductId?.title || "",
          outstandingAmount: loan.outstandingAmount || 0,
        });
        
        setFormData(prev => ({
          ...prev,
          amount: loan.monthlyInstallment.toString(),
          description: `Pembayaran cicilan periode ${nextPeriod}`,
          memberId: loan.memberId?._id || loan.memberId,
        }));
      }
    }
  }, [formData.loanId, loans]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem("token");
      const formDataToSend = new FormData();
      
      formDataToSend.append("loanId", formData.loanId);
      formDataToSend.append("memberId", formData.memberId);
      formDataToSend.append("amount", formData.amount);
      formDataToSend.append("paymentDate", formData.paymentDate);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("notes", formData.notes);
      
      if (formData.proofFile) {
        formDataToSend.append("proofFile", formData.proofFile);
      }
      
      const response = await axios.post(
        `${API_URL}/api/admin/loan-payments`,
        formDataToSend,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      
      if (response.data.success) {
        toast.success("Pembayaran cicilan berhasil dibuat");
        setShowModal(false);
        resetForm();
        fetchLoanPayments();
        fetchActiveLoans();
      }
    } catch (error) {
      console.error("Error creating payment:", error);
      toast.error(error.response?.data?.message || "Gagal membuat pembayaran");
    }
  };

  const handleApprove = async (paymentId) => {
    if (!window.confirm("Apakah Anda yakin ingin menyetujui pembayaran ini?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/api/admin/loan-payments/${paymentId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success("Pembayaran berhasil disetujui");
        fetchLoanPayments();
        fetchActiveLoans();
      }
    } catch (error) {
      console.error("Error approving payment:", error);
      toast.error(error.response?.data?.message || "Gagal menyetujui pembayaran");
    }
  };

  const handleReject = async (paymentId) => {
    const reason = window.prompt("Alasan penolakan:");
    if (!reason) return;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/api/admin/loan-payments/${paymentId}/reject`,
        { rejectionReason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success("Pembayaran berhasil ditolak");
        fetchLoanPayments();
      }
    } catch (error) {
      console.error("Error rejecting payment:", error);
      toast.error(error.response?.data?.message || "Gagal menolak pembayaran");
    }
  };

  const resetForm = () => {
    setFormData({
      loanId: "",
      memberId: "",
      amount: "",
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      description: "",
      notes: "",
      proofFile: null,
    });
    setLoanInfo({
      nextPeriod: 1,
      expectedAmount: 0,
      dueDate: null,
      memberName: "",
      productName: "",
      outstandingAmount: 0,
    });
  };

  const getStatusBadge = (status) => {
    const badges = {
      Pending: "bg-yellow-100 text-yellow-800",
      Approved: "bg-green-100 text-green-800",
      Rejected: "bg-red-100 text-red-800",
      Partial: "bg-orange-100 text-orange-800",
    };
    return badges[status] || "bg-gray-100 text-gray-800";
  };

  const getPaymentTypeBadge = (type) => {
    const badges = {
      Full: "bg-blue-100 text-blue-800",
      Partial: "bg-orange-100 text-orange-800",
      Late: "bg-red-100 text-red-800",
    };
    return badges[type] || "bg-gray-100 text-gray-800";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">💳 Memuat data cicilan pinjaman...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">💳 Pembayaran Cicilan Pinjaman</h1>
        <p className="text-gray-600 mt-2">Kelola pembayaran cicilan pinjaman anggota</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <h3 className="text-sm font-medium text-gray-500">Pending</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {formatCurrency(summary.totalPending)}
          </p>
          <p className="text-sm text-gray-500 mt-1">{summary.countPending} transaksi</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <h3 className="text-sm font-medium text-gray-500">Approved</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(summary.totalApproved)}
          </p>
          <p className="text-sm text-gray-500 mt-1">{summary.countApproved} transaksi</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <h3 className="text-sm font-medium text-gray-500">Rejected</h3>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(summary.totalRejected)}
          </p>
          <p className="text-sm text-gray-500 mt-1">{summary.countRejected} transaksi</p>
        </div>
      </div>

      {/* Actions and Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Bayar Cicilan
          </button>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
            
            <select
              value={filterMember}
              onChange={(e) => setFilterMember(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Anggota</option>
              {members.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name} - {member.uuid}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Anggota
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Produk
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Periode
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Jumlah
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Tipe
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loanPayments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p>Tidak ada data pembayaran cicilan</p>
                    </div>
                  </td>
                </tr>
              ) : (
                loanPayments.map((payment) => (
                  <tr key={payment._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(payment.paymentDate), "dd MMM yyyy", { locale: id })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {payment.memberId?.name || "Unknown"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {payment.memberId?.uuid || "-"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.loanId?.loanProductId?.title || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Periode {payment.period}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentTypeBadge(payment.paymentType)}`}>
                        {payment.paymentType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        {payment.status === "Pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(payment._id)}
                              className="text-green-600 hover:text-green-900"
                              title="Setujui"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleReject(payment._id)}
                              className="text-red-600 hover:text-red-900"
                              title="Tolak"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => fetchLoanDetail(payment.loanId?._id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Lihat Detail"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {payment.proofFile && (
                          <a
                            href={`${API_URL}${payment.proofFile}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-600 hover:text-purple-900"
                            title="Lihat Bukti"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(summary.countPending / itemsPerPage)}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={summary.countPending + summary.countApproved + summary.countRejected}
          />
        </div>
      </div>

      {/* Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-xl font-bold text-gray-800">💰 Bayar Cicilan Pinjaman</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              {/* Member Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anggota <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.memberId}
                  onChange={(e) => setFormData({ ...formData, memberId: e.target.value, loanId: "" })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Pilih Anggota</option>
                  {members.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.name} - {member.uuid}
                    </option>
                  ))}
                </select>
              </div>

              {/* Loan Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pinjaman <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.loanId}
                  onChange={(e) => setFormData({ ...formData, loanId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={!formData.memberId}
                >
                  <option value="">Pilih Pinjaman</option>
                  {loans
                    .filter(loan => {
                      // Debug logging
                      if (!loan.memberId) return false;
                      const loanMemberId = typeof loan.memberId === 'object' ? loan.memberId._id : loan.memberId;
                      const isMatch = loanMemberId === formData.memberId;
                      if (isMatch) {
                        console.log("Matched loan:", loan);
                      }
                      return isMatch;
                    })
                    .map((loan) => (
                      <option key={loan._id} value={loan._id}>
                        {loan.loanProductId?.title || "Produk Tidak Diketahui"} - Sisa: {formatCurrency(loan.outstandingAmount || 0)}
                      </option>
                    ))}
                </select>
                {formData.memberId && loans.filter(loan => {
                  if (!loan.memberId) return false;
                  const loanMemberId = typeof loan.memberId === 'object' ? loan.memberId._id : loan.memberId;
                  return loanMemberId === formData.memberId;
                }).length === 0 && (
                  <p className="text-sm text-red-500 mt-1">Member ini belum memiliki pinjaman aktif</p>
                )}
              </div>

              {/* Loan Info Display */}
              {loanInfo.productName && (
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-2">Informasi Pinjaman</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Produk:</span>
                      <span className="ml-2 font-medium">{loanInfo.productName}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Periode:</span>
                      <span className="ml-2 font-medium">{loanInfo.nextPeriod}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Cicilan:</span>
                      <span className="ml-2 font-medium">{formatCurrency(loanInfo.expectedAmount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Jatuh Tempo:</span>
                      <span className="ml-2 font-medium">
                        {loanInfo.dueDate ? format(new Date(loanInfo.dueDate), "dd MMM yyyy", { locale: id }) : "-"}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">Sisa Pinjaman:</span>
                      <span className="ml-2 font-medium text-orange-600">
                        {formatCurrency(loanInfo.outstandingAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Amount */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jumlah Pembayaran <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  min="0"
                />
              </div>

              {/* Payment Date */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tanggal Pembayaran <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Proof File */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bukti Pembayaran
                </label>
                <input
                  type="file"
                  onChange={(e) => setFormData({ ...formData, proofFile: e.target.files[0] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  accept="image/*,application/pdf"
                />
                <p className="text-xs text-gray-500 mt-1">Format: JPG, PNG, PDF (Max. 5MB)</p>
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deskripsi
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                />
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Simpan Pembayaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loan Detail Modal */}
      {showDetailModal && selectedLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <h2 className="text-xl font-bold text-gray-800">📋 Detail Pinjaman</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedLoan(null);
                  setPaymentSchedule([]);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {/* Loan Information */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-800 mb-3">Informasi Pinjaman</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Anggota</p>
                    <p className="font-medium">{selectedLoan.memberId?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Produk</p>
                    <p className="font-medium">{selectedLoan.loanProductId?.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                      selectedLoan.status === "Active" ? "bg-green-100 text-green-800" :
                      selectedLoan.status === "Completed" ? "bg-blue-100 text-blue-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>
                      {selectedLoan.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total Pinjaman</p>
                    <p className="font-medium">{formatCurrency(selectedLoan.loanAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cicilan/Bulan</p>
                    <p className="font-medium">{formatCurrency(selectedLoan.monthlyInstallment)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Sisa Pinjaman</p>
                    <p className="font-medium text-orange-600">{formatCurrency(selectedLoan.outstandingAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Progress</p>
                    <p className="font-medium">{selectedLoan.paidPeriods}/{selectedLoan.totalPeriods} periode</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tanggal Mulai</p>
                    <p className="font-medium">
                      {selectedLoan.startDate ? format(new Date(selectedLoan.startDate), "dd MMM yyyy", { locale: id }) : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tanggal Selesai</p>
                    <p className="font-medium">
                      {selectedLoan.endDate ? format(new Date(selectedLoan.endDate), "dd MMM yyyy", { locale: id }) : "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Schedule */}
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Jadwal Pembayaran</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Periode</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Jatuh Tempo</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Jumlah</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">Tanggal Bayar</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {paymentSchedule.map((schedule) => (
                        <tr key={schedule.period} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">
                            Periode {schedule.period}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {format(new Date(schedule.dueDate), "dd MMM yyyy", { locale: id })}
                          </td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">
                            {formatCurrency(schedule.expectedAmount)}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              schedule.status === "Approved" ? "bg-green-100 text-green-800" :
                              schedule.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                              schedule.status === "Rejected" ? "bg-red-100 text-red-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {schedule.status}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {schedule.actualPayment ? 
                              format(new Date(schedule.actualPayment.paymentDate), "dd MMM yyyy", { locale: id }) : 
                              "-"
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedLoan(null);
                    setPaymentSchedule([]);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Loans;
