import { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "react-toastify";
import { API_URL } from "../api/config";
import Pagination from "../components/Pagination.jsx";

const Savings = () => {
  const [savings, setSavings] = useState([]);
  const [members, setMembers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    installmentPeriod: 1,
    memberId: "",
    productId: "",
    amount: "",
    savingsDate: format(new Date(), "yyyy-MM-dd"),
    type: "Setoran",
    description: "",
    status: "Pending",
    paymentType: "Full",
    notes: "",
    proofFile: null,
  });

  const [lastPeriod, setLastPeriod] = useState(0);
  const [periodInfo, setPeriodInfo] = useState({
    incompletePeriods: [],
    rejectedPeriods: [],
    pendingTransactions: [],
    transactionsByPeriod: {},
    nextPeriod: 1,
    suggestedAmount: 0,
    isPartialPayment: false,
    remainingAmount: 0,
    hasUpgrade: false,
    upgradeInfo: null
  });
  const [originalSelection, setOriginalSelection] = useState({
    memberId: "",
    productId: "",
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Summary state for totals
  const [summary, setSummary] = useState({
    totalSetoran: 0,
    totalPenarikan: 0,
    saldo: 0
  });

  // Fetch data
  const fetchSavings = async () => {
    try {
      const token = localStorage.getItem("token");
      // Fetch with higher limit to get all records
      const response = await axios.get(`${API_URL}/api/admin/savings?limit=100&page=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      let allSavings = [];
      const firstPageData = response.data?.data?.savings || response.data?.savings || response.data?.data || response.data || [];
      allSavings = Array.isArray(firstPageData) ? [...firstPageData] : [];
      
      // Check if there are more pages
      const totalItems = response.data?.data?.pagination?.totalItems;
      const totalPages = response.data?.data?.pagination?.totalPages;
      
      if (totalPages && totalPages > 1) {
        // Fetch remaining pages
        const pagePromises = [];
        for (let page = 2; page <= totalPages; page++) {
          pagePromises.push(
            axios.get(`${API_URL}/api/admin/savings?limit=100&page=${page}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
          );
        }
        
        const additionalResponses = await Promise.all(pagePromises);
        additionalResponses.forEach(resp => {
          const pageData = resp.data?.data?.savings || resp.data?.savings || resp.data?.data || resp.data || [];
          if (Array.isArray(pageData)) {
            allSavings.push(...pageData);
          }
        });
      }
      
      setSavings(allSavings);
      
      // Set summary from backend response
      if (response.data?.data?.summary) {
        setSummary(response.data.data.summary);
      }
    } catch (error) {
      console.error("Error fetching savings:", error);
      toast.error("Gagal memuat data simpanan");
      setSavings([]);
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

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/admin/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data?.data || response.data || [];
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Gagal memuat data produk");
      setProducts([]);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchSavings(), fetchMembers(), fetchProducts()]);
      setLoading(false);
    };
    loadData();
  }, []);

  // Auto-fill product when member is selected
  useEffect(() => {
    if (formData.memberId && !editingId) {
      // Only auto-fill when creating new savings (not editing)
      const selectedMember = members.find(member => member._id === formData.memberId);
      if (selectedMember && selectedMember.productId) {
        setFormData(prev => ({ ...prev, productId: selectedMember.productId }));
      } else if (selectedMember && !selectedMember.productId) {
        setFormData(prev => ({ ...prev, productId: "" }));
      }
    }
  }, [formData.memberId, members, editingId]);

  // Auto-update installmentPeriod when member/product change
  useEffect(() => {
    if (formData.memberId && formData.productId && products.length > 0) {
      checkLastInstallmentPeriod(formData.memberId, formData.productId);
    } else {
      // Reset when either field empty
      setLastPeriod(0);
      if (!editingId) {
        setFormData((prev) => ({ ...prev, installmentPeriod: 1, description: "Pembayaran Simpanan Periode - 1" }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.memberId, formData.productId, products.length, editingId]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Auto-calc next installment period based on last saved period
  const checkLastInstallmentPeriod = async (memberId, productId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_URL}/api/admin/savings/check-period/${memberId}/${productId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = response.data?.data || response.data || {};
      
      console.log("=== Check Period Response ===", data);
      console.log("Next Period:", data.nextPeriod);
      console.log("Expected Amount:", data.expectedAmount);
      console.log("Has Upgrade:", data.hasUpgrade);
      console.log("Upgrade Info:", data.upgradeInfo);
      
      // Update period info state
      setPeriodInfo({
        incompletePeriods: data.incompletePeriods || [],
        pendingTransactions: data.pendingTransactions || [],
        transactionsByPeriod: data.transactionsByPeriod || {},
        nextPeriod: data.nextPeriod || 1,
        suggestedAmount: data.expectedAmount || data.remainingAmount || data.depositAmount || 0,
        isPartialPayment: data.isPartialPayment || false,
        remainingAmount: data.remainingAmount || 0,
        depositAmount: data.depositAmount || 0,
        hasUpgrade: data.hasUpgrade || false,
        upgradeInfo: data.upgradeInfo || null
      });

      const last = data.lastPeriod ?? 0;
      const next = data.nextPeriod || 1;
      setLastPeriod(last);
      
      // Get rejected periods for this member/product
      await fetchRejectedPeriods(memberId, productId);
      
      // Auto-fill based on intelligent detection
      const selectedProduct = products.find(p => p._id === productId);
      
      // Use setTimeout to ensure state updates properly
      setTimeout(() => {
        if (!editingId) {
          let suggestedAmount = data.expectedAmount || selectedProduct?.depositAmount || 0;
          let description = `Pembayaran Simpanan Periode - ${next}`;
          
          // Check if member has upgraded
          if (data.hasUpgrade && data.upgradeInfo) {
            // IMPORTANT: Use expectedAmount from API which already includes compensation
            suggestedAmount = data.expectedAmount || data.upgradeInfo.newPaymentWithCompensation;
            description = `Pembayaran Simpanan Periode - ${next} (Upgrade: Rp ${data.upgradeInfo.newMonthlyDeposit?.toLocaleString()} + Kompensasi: Rp ${data.upgradeInfo.compensationPerMonth?.toLocaleString()})`;
            
            console.log("Setting amount for upgraded member:", suggestedAmount);
          }
          // Check if this is partial payment continuation
          else if (data.isPartialPayment && data.remainingAmount > 0) {
            suggestedAmount = data.remainingAmount;
            description = `Pembayaran Sisa Periode - ${next} (Rp ${data.remainingAmount.toLocaleString()})`;
          }
          
          setFormData((prev) => ({ 
            ...prev, 
            amount: suggestedAmount,
            installmentPeriod: next,
            description: description
          }));
        }
      }, 100);
    } catch (error) {
      console.error("Error checking last period:", error);
      setLastPeriod(0);
      setPeriodInfo({
        incompletePeriods: [],
        rejectedPeriods: [],
        pendingTransactions: [],
        transactionsByPeriod: {},
        nextPeriod: 1,
        suggestedAmount: 0,
        isPartialPayment: false,
        remainingAmount: 0
      });
      if (!editingId) {
        setFormData((prev) => ({ 
          ...prev, 
          installmentPeriod: 1,
          description: "Pembayaran Simpanan Periode - 1"
        }));
      }
    }
  };

  const fetchRejectedPeriods = async (memberId, productId) => {
    try {
      if (!memberId || !productId) {
        return; // Skip if params are missing
      }
      
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${API_URL}/api/admin/savings`,
        { 
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data) {
        const savingsData = response.data.data?.savings || response.data.data || response.data.savings || [];
        const rejectedPeriods = [...new Set(savingsData
          .filter(s => 
            s.status === 'Rejected' && 
            (s.memberId?._id === memberId || s.memberId === memberId) &&
            (s.productId?._id === productId || s.productId === productId)
          )
          .map(s => s.installmentPeriod)
        )];
        setPeriodInfo(prev => ({
          ...prev,
          rejectedPeriods: rejectedPeriods
        }));
      }
    } catch (error) {
      console.error("Error fetching rejected periods:", error);
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Debug: log form data before sending
    console.log("Form data being submitted:", formData);

    // Get token first
    const token = localStorage.getItem("token");
    
    // Check if we have a file to upload
    const hasFile = formData.proofFile && formData.proofFile instanceof File;
    
    let formDataToSend;
    let headers = {
      Authorization: `Bearer ${token}`,
    };

    if (hasFile) {
      // Use FormData for file upload
      formDataToSend = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== null && formData[key] !== undefined && formData[key] !== "") {
          formDataToSend.append(key, formData[key]);
        }
      });
      headers["Content-Type"] = "multipart/form-data";
    } else {
      // Use JSON for non-file submissions
      const dataToSend = { ...formData };
      delete dataToSend.proofFile; // Remove file field if null/undefined
      
      // Ensure numeric fields are numbers
      dataToSend.amount = Number(dataToSend.amount);
      dataToSend.installmentPeriod = Number(dataToSend.installmentPeriod);
      
      formDataToSend = dataToSend;
      headers["Content-Type"] = "application/json";
    }

    console.log("Data being sent:", formDataToSend);
    console.log("Headers:", headers);

    try {
      if (editingId) {
        // Update existing savings
        await axios.put(`${API_URL}/api/admin/savings/${editingId}`, formDataToSend, {
          headers: headers,
        });
        toast.success("Data simpanan berhasil diperbarui");
      } else {
        // Create new savings
        await axios.post(`${API_URL}/api/admin/savings`, formDataToSend, {
          headers: headers,
        });
        toast.success("Data simpanan berhasil ditambahkan");
      }

      setShowModal(false);
      setEditingId(null);
      resetForm();
      fetchSavings();
    } catch (error) {
      console.error("Submit error:", error);
      console.error("Error response:", error.response?.data);
      toast.error(error.response?.data?.message || error.message || "Gagal menyimpan data");
    }
  };

  const resetForm = () => {
    setFormData({
      installmentPeriod: 1,
      memberId: "",
      productId: "",
      amount: "",
      savingsDate: format(new Date(), "yyyy-MM-dd"),
      type: "Setoran",
      description: "",
      status: "Pending",
      paymentType: "Full",
      notes: "",
      proofFile: null,
    });
    setLastPeriod(0);
    setOriginalSelection({ memberId: "", productId: "" });
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.size > 5 * 1024 * 1024) {
      toast.error("File tidak boleh lebih dari 5MB");
      return;
    }
    setFormData({ ...formData, proofFile: file });
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus simpanan ini?\n\nFile bukti juga akan dihapus.")) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${API_URL}/api/admin/savings/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Simpanan dan bukti berhasil dihapus");
        fetchSavings();
      } catch {
        toast.error("Gagal menghapus simpanan");
      }
    }
  };

  const handleApprove = async (id) => {
    const notes = prompt("Catatan persetujuan (opsional):");
    if (notes !== null) { // User didn't cancel
      try {
        const token = localStorage.getItem("token");
        await axios.patch(`${API_URL}/api/admin/savings/${id}/approve`, 
          { notes }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Simpanan berhasil disetujui");
        fetchSavings();
      } catch {
        toast.error("Gagal menyetujui simpanan");
      }
    }
  };

  const handleReject = async (id) => {
    const rejectionReason = prompt("Alasan penolakan (wajib diisi):");
    if (rejectionReason && rejectionReason.trim()) {
      const notes = prompt("Catatan tambahan (opsional):");
      try {
        const token = localStorage.getItem("token");
        await axios.patch(`${API_URL}/api/admin/savings/${id}/reject`, 
          { rejectionReason: rejectionReason.trim(), notes }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Simpanan berhasil ditolak");
        fetchSavings();
      } catch {
        toast.error("Gagal menolak simpanan");
      }
    } else if (rejectionReason !== null) {
      toast.error("Alasan penolakan wajib diisi");
    }
  };


  // Handle edit
  const handleEdit = (saving) => {
    setEditingId(saving._id);
    setFormData({
      installmentPeriod: saving.installmentPeriod || 1,
      memberId: saving.memberId?._id || saving.memberId || "",
      productId: saving.productId?._id || saving.productId || "",
      amount: saving.amount || 0,
      savingsDate: format(new Date(saving.savingsDate), "yyyy-MM-dd"),
      type: saving.type || "Setoran",
      description: saving.description || "",
      status: saving.status || "Pending",
      proofFile: null,
    });
    setOriginalSelection({
      memberId: saving.memberId?._id || saving.memberId || "",
      productId: saving.productId?._id || saving.productId || "",
    });
    setLastPeriod(0);
    setShowModal(true);
  };

  // Get member name
  const getMemberName = (memberId) => {
    if (!memberId) return "Unknown";
    const member = members.find(
      (m) => m._id === memberId || m._id === memberId._id
    );
    if (member) return member.name;

    // Handle populated member object
    if (typeof memberId === "object" && memberId.name) {
      return memberId.name;
    }
    return "Unknown";
  };

  // Get product name
  const getProductName = (productId) => {
    if (!productId) return "Unknown";
    const product = products.find(
      (p) => p._id === productId || p._id === productId._id
    );
    if (product) return product.title;

    // Handle populated product object
    if (typeof productId === "object" && productId.title) {
      return productId.title;
    }
    return "Unknown";
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const badges = {
      Pending: "bg-yellow-100 text-yellow-800",
      Approved: "bg-green-100 text-green-800",
      Rejected: "bg-red-100 text-red-800",
    };
    return badges[status] || "bg-gray-100 text-gray-800";
  };

  // Pagination logic
  const totalPages = Math.ceil(savings.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSavings = savings.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 space-y-4 sm:space-y-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
          🌸 Data Simpanan
        </h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all duration-200 font-medium text-sm sm:text-base shadow-lg hover:shadow-xl"
        >
          ➕ Tambah Simpanan
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Setoran</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(summary.totalSetoran)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Penarikan</h3>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(summary.totalPenarikan)}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Saldo</h3>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(summary.saldo)}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden border border-pink-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-pink-50 to-rose-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                  Tanggal
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                  Anggota
                </th>
                <th className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                  Produk
                </th>
                <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                  Periode
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                  Jumlah
                </th>
                <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                  Tipe
                </th>
                <th className="hidden lg:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                  Keterangan
                </th>
                <th className="hidden md:table-cell px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                  Bukti
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-pink-700 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentSavings.map((saving) => (
                <tr key={saving._id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(saving.savingsDate), "dd MMM yyyy", {
                      locale: id,
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getMemberName(saving.memberId)}
                  </td>
                  <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getProductName(saving.productId)}
                  </td>
                  <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {saving.installmentPeriod || 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(saving.amount)}
                  </td>
                  <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        saving.type === "Setoran"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {saving.type}
                    </span>
                  </td>
                  <td className="hidden lg:table-cell px-6 py-4 text-sm text-gray-900 max-w-xs truncate" title={saving.description}>
                    {saving.description || "-"}
                  </td>
                  <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {saving.proofFile ? (
                      <button
                        onClick={() => window.open(`${API_URL}/uploads/simpanan/${saving.proofFile}`, '_blank')}
                        className="text-blue-600 hover:text-blue-800 underline"
                      >
                        Lihat Bukti
                      </button>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(
                          saving.status
                        )}`}
                        title={saving.status === 'Rejected' && saving.rejectionReason ? `Alasan: ${saving.rejectionReason}` : ''}
                      >
                        {saving.status}
                        {saving.status === 'Rejected' && (
                          <span className="ml-1">💬</span>
                        )}
                      </span>
                      {saving.paymentType === "Partial" && (
                        <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded-full">
                          Partial #{saving.partialSequence}
                        </span>
                      )}
                      {saving.status === 'Rejected' && saving.rejectionReason && (
                        <div className="text-red-600 text-xs italic max-w-xs truncate" title={saving.rejectionReason}>
                          💬 {saving.rejectionReason}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-1">
                      {saving.status === "Pending" && (
                        <>
                          <button
                            onClick={() => handleApprove(saving._id)}
                            className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                            title="Setujui"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => handleReject(saving._id)}
                            className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                            title="Tolak"
                          >
                            ✗
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleEdit(saving)}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => handleDelete(saving._id)}
                        className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                        title="Hapus"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Custom Pagination */}
        {savings.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4">
            <div className="flex-1 flex justify-between sm:hidden">
              {/* Mobile Pagination */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || totalPages <= 1}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === 1 || totalPages <= 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Previous
              </button>
              <div className="flex items-center">
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {Math.max(totalPages, 1)}
                </span>
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || totalPages <= 1}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                  currentPage === totalPages || totalPages <= 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Next
              </button>
            </div>
            
            {/* Desktop Pagination */}
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">
                    {Math.min((currentPage - 1) * itemsPerPage + 1, savings.length)}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, savings.length)}
                  </span>{' '}
                  of <span className="font-medium">{savings.length}</span> results
                </p>
              </div>
              
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  {/* Previous Button */}
                  <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                        currentPage === 1
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {/* Page Numbers */}
                    {(() => {
                      const pages = [];
                      
                      // If there's only 1 page or no pages, show just page 1
                      if (totalPages <= 1) {
                        pages.push(
                          <button
                            key={1}
                            onClick={() => handlePageChange(1)}
                            className="z-10 bg-pink-50 border-pink-500 text-pink-600 relative inline-flex items-center px-4 py-2 border text-sm font-medium cursor-default"
                          >
                            1
                          </button>
                        );
                        return pages;
                      }
                      
                      const maxPagesToShow = 7;
                      let startPage = Math.max(1, currentPage - 3);
                      let endPage = Math.min(totalPages, currentPage + 3);
                      
                      // Adjust if we're near the beginning or end
                      if (currentPage <= 4) {
                        endPage = Math.min(totalPages, maxPagesToShow);
                      }
                      if (currentPage >= totalPages - 3) {
                        startPage = Math.max(1, totalPages - maxPagesToShow + 1);
                      }
                      
                      // First page
                      if (startPage > 1) {
                        pages.push(
                          <button
                            key={1}
                            onClick={() => handlePageChange(1)}
                            className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium"
                          >
                            1
                          </button>
                        );
                        if (startPage > 2) {
                          pages.push(
                            <span key="dots1" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                              ...
                            </span>
                          );
                        }
                      }
                      
                      // Middle pages
                      for (let i = startPage; i <= endPage; i++) {
                        pages.push(
                          <button
                            key={i}
                            onClick={() => handlePageChange(i)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              i === currentPage
                                ? 'z-10 bg-pink-50 border-pink-500 text-pink-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {i}
                          </button>
                        );
                      }
                      
                      // Last page
                      if (endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                          pages.push(
                            <span key="dots2" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                              ...
                            </span>
                          );
                        }
                        pages.push(
                          <button
                            key={totalPages}
                            onClick={() => handlePageChange(totalPages)}
                            className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium"
                          >
                            {totalPages}
                          </button>
                        );
                      }
                      
                      return pages;
                    })()}
                    
                    {/* Next Button */}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                        currentPage === totalPages
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                {editingId ? "Edit Data Simpanan" : "Tambah Data Simpanan"}
              </h3>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Anggota
                  </label>
                  <select
                    value={formData.memberId}
                    onChange={(e) =>
                      setFormData({ ...formData, memberId: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="">Pilih Anggota</option>
                    {members.map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.uuid} - {member.name} {member.product ? `(${member.product.title})` : '(Belum pilih produk)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Produk Simpanan
                  </label>
                  <select
                    value={formData.productId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        productId: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    required
                  >
                    <option value="">Pilih Produk</option>
                    {products.map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.title} - Min: {formatCurrency(product.depositAmount)}
                      </option>
                    ))}
                  </select>
                  {formData.memberId && !editingId && (
                    <p className="mt-1 text-sm text-blue-600">
                      💡 Produk otomatis dipilih berdasarkan anggota yang dipilih
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Periode Angsuran
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.installmentPeriod}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          installmentPeriod: parseInt(e.target.value),
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                    
                    {/* Enhanced Period Information Panel */}
                    {formData.memberId && formData.productId && (
                      <div className="mt-3 space-y-3">
                        {/* Main Status Row - Horizontal Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {/* Left: Status Overview */}
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <h4 className="text-sm font-semibold text-gray-800 mb-2">
                              📊 Status Periode
                            </h4>
                            
                            {lastPeriod > 0 && (
                              <p className="text-xs text-gray-600 mb-1">
                                Terakhir approved: <span className="font-semibold">Periode {lastPeriod}</span>
                              </p>
                            )}
                            
                            <p className="text-sm text-green-700 font-medium mb-1">
                              📍 Disarankan: <span className="font-semibold">Periode {periodInfo.nextPeriod}</span>
                              {periodInfo.isPartialPayment && (
                                <span className="ml-1 text-orange-600 text-xs">(Lanjutan)</span>
                              )}
                            </p>
                            
                            <p className="text-sm text-blue-700">
                              💰 <span className="font-semibold">
                                Rp {periodInfo.suggestedAmount?.toLocaleString() || '0'}
                              </span>
                              {periodInfo.isPartialPayment && (
                                <span className="text-orange-600 text-xs"> (Sisa)</span>
                              )}
                            </p>

                            {/* Upgrade Info */}
                            {periodInfo.hasUpgrade && periodInfo.upgradeInfo && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                <p className="text-xs text-purple-800 font-semibold">
                                  ✨ Member Sudah Upgrade
                                </p>
                                <div className="text-xs text-gray-600 mt-1 space-y-1">
                                  <p>Produk Lama: Rp {periodInfo.upgradeInfo.oldMonthlyDeposit?.toLocaleString()}/bulan</p>
                                  <p>Produk Baru: Rp {periodInfo.upgradeInfo.newMonthlyDeposit?.toLocaleString()}/bulan</p>
                                  <p>Kompensasi: Rp {periodInfo.upgradeInfo.compensationPerMonth?.toLocaleString()}/bulan</p>
                                  <p className="font-semibold text-purple-700">
                                    Total: Rp {periodInfo.upgradeInfo.newPaymentWithCompensation?.toLocaleString()}/bulan
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right: Transaction History + Alerts + Actions */}
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            {/* Header with Tooltip */}
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="text-sm font-semibold text-gray-800">
                                📋 Riwayat & Status
                              </h4>
                              <div className="group relative">
                                <button className="text-blue-600 hover:text-blue-800 text-xs underline">
                                  Detail →
                                </button>
                                <div className="absolute right-0 top-6 w-80 bg-white border border-gray-300 rounded-lg shadow-lg p-3 hidden group-hover:block z-50">
                                  <h5 className="font-semibold text-sm mb-2 text-gray-800">Riwayat Per Periode:</h5>
                                  <div className="max-h-60 overflow-y-auto">
                                    {Object.keys(periodInfo.transactionsByPeriod).length > 0 ? (
                                      Object.entries(periodInfo.transactionsByPeriod)
                                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                        .map(([period, transactions]) => (
                                          <div key={period} className="mb-3 pb-2 border-b border-gray-200 last:border-b-0">
                                            <div className="font-semibold text-xs text-gray-700 mb-1">
                                              Periode {period}:
                                            </div>
                                            {transactions.map((tx, idx) => (
                                              <div key={idx} className="text-xs text-gray-600 ml-2 mb-1">
                                                <span className={`inline-block px-2 py-0.5 rounded text-white text-xs mr-2 ${
                                                  tx.status === 'Approved' ? 'bg-green-500' :
                                                  tx.status === 'Pending' ? 'bg-yellow-500' :
                                                  tx.status === 'Rejected' ? 'bg-red-500' : 'bg-gray-500'
                                                }`}>
                                                  {tx.status}
                                                </span>
                                                Rp {tx.amount?.toLocaleString()} 
                                                <span className="text-gray-400 ml-1">
                                                  ({new Date(tx.date).toLocaleDateString('id-ID')})
                                                </span>
                                                {tx.status === 'Rejected' && tx.rejectionReason && (
                                                  <div className="text-red-600 text-xs italic ml-4 mt-1">
                                                    💬 "{tx.rejectionReason}"
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        ))
                                    ) : (
                                      <div className="text-xs text-gray-500">Belum ada transaksi</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Summary Info */}
                            <div className="text-xs text-gray-600 mb-3">
                              Total Periode: <span className="font-semibold">
                                {Object.keys(periodInfo.transactionsByPeriod).length || 0}
                              </span>
                            </div>

                            {/* Inline Alert Badges */}
                            <div className="flex flex-wrap gap-1 mb-3">
                              {/* Incomplete */}
                              {periodInfo.incompletePeriods && periodInfo.incompletePeriods.length > 0 && (
                                <div className="px-2 py-1 bg-orange-100 border border-orange-300 rounded text-xs">
                                  <span className="font-semibold text-orange-800">⚠️</span>
                                  <span className="text-orange-700 ml-1">
                                    P{periodInfo.incompletePeriods[0].period}
                                    {periodInfo.incompletePeriods.length > 1 && ` +${periodInfo.incompletePeriods.length - 1}`}
                                  </span>
                                </div>
                              )}

                              {/* Pending */}
                              {periodInfo.pendingTransactions && periodInfo.pendingTransactions.length > 0 && (
                                <div className="px-2 py-1 bg-yellow-100 border border-yellow-300 rounded text-xs">
                                  <span className="font-semibold text-yellow-800">⏳</span>
                                  <span className="text-yellow-700 ml-1">
                                    P{periodInfo.pendingTransactions[0].installmentPeriod}
                                    {periodInfo.pendingTransactions.length > 1 && ` +${periodInfo.pendingTransactions.length - 1}`}
                                  </span>
                                </div>
                              )}

                              {/* Rejected */}
                              {periodInfo.rejectedPeriods && periodInfo.rejectedPeriods.length > 0 && (
                                <div className="px-2 py-1 bg-red-100 border border-red-300 rounded text-xs">
                                  <span className="font-semibold text-red-800">❌</span>
                                  <span className="text-red-700 ml-1">
                                    P{periodInfo.rejectedPeriods.slice(0, 2).join(', P')}
                                    {periodInfo.rejectedPeriods.length > 2 && ` +${periodInfo.rejectedPeriods.length - 2}`}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Quick Action Buttons */}
                            <div className="border-t border-gray-300 pt-2">
                              <div className="flex flex-wrap gap-1">
                                <span className="text-xs text-gray-600 self-center mr-1">🚀</span>
                                
                                {/* Suggested Period */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    let description = '';
                                    if (periodInfo.isPartialPayment) {
                                      description = `Pembayaran Sisa Periode - ${periodInfo.nextPeriod} (Rp ${periodInfo.remainingAmount?.toLocaleString() || '0'})`;
                                    } else if (periodInfo.hasUpgrade && periodInfo.upgradeInfo) {
                                      description = `Pembayaran Simpanan Periode - ${periodInfo.nextPeriod} (Upgrade: Rp ${periodInfo.upgradeInfo.newMonthlyDeposit?.toLocaleString()} + Kompensasi: Rp ${periodInfo.upgradeInfo.compensationPerMonth?.toLocaleString()})`;
                                    } else {
                                      description = `Pembayaran Simpanan Periode - ${periodInfo.nextPeriod}`;
                                    }
                                    
                                    setFormData(prev => ({
                                      ...prev,
                                      installmentPeriod: periodInfo.nextPeriod,
                                      amount: periodInfo.suggestedAmount || 0,
                                      description
                                    }));
                                  }}
                                  className="px-2 py-1 text-xs bg-green-100 text-green-800 border border-green-300 rounded hover:bg-green-200 transition-colors"
                                >
                                  📍 P{periodInfo.nextPeriod}
                                  {periodInfo.isPartialPayment ? ' (Sisa)' : periodInfo.hasUpgrade ? ' (Upgrade)' : ''}
                                </button>
                                
                                {/* Rejected Period Buttons */}
                                {periodInfo.rejectedPeriods && periodInfo.rejectedPeriods.slice(0, 2).map(period => (
                                  <button
                                    key={period}
                                    type="button"
                                    onClick={() => {
                                      setFormData(prev => ({
                                        ...prev,
                                        installmentPeriod: period,
                                        amount: periodInfo.depositAmount || 0,
                                        description: `Submit Ulang Periode - ${period}`
                                      }));
                                    }}
                                    className="px-2 py-1 text-xs bg-red-100 text-red-800 border border-red-300 rounded hover:bg-red-200 transition-colors"
                                  >
                                    🔄 P{period}
                                  </button>
                                ))}
                                
                                {periodInfo.rejectedPeriods && periodInfo.rejectedPeriods.length > 2 && (
                                  <span className="text-xs text-gray-500 self-center">
                                    +{periodInfo.rejectedPeriods.length - 2}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Jumlah
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          amount: parseInt(e.target.value),
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                    {periodInfo.suggestedAmount > 0 && !editingId && (
                      <p className="mt-1 text-sm text-blue-600">
                        💡 Jumlah yang diharapkan: Rp {periodInfo.suggestedAmount.toLocaleString()}
                        {periodInfo.hasUpgrade && ' (termasuk kompensasi)'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Tanggal
                    </label>
                    <input
                      type="date"
                      value={formData.savingsDate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          savingsDate: e.target.value,
                        })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Tipe
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({ ...formData, type: e.target.value })
                      }
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="Setoran">Setoran</option>
                      <option value="Penarikan">Penarikan</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Keterangan
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows="3"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    value={formData.status || "Pending"}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Bukti Pembayaran
                  </label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Maksimal 5MB, format gambar
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Savings;
