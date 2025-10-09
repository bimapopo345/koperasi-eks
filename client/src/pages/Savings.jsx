import { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "react-toastify";
import { API_URL } from "../api/config";

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
  const [originalSelection, setOriginalSelection] = useState({
    memberId: "",
    productId: "",
  });

  // Fetch data
  const fetchSavings = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/admin/savings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data =
        response.data?.data?.savings ||
        response.data?.savings ||
        response.data?.data ||
        response.data ||
        [];
      setSavings(Array.isArray(data) ? data : []);
    } catch {
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
      const last = data.lastPeriod ?? 0;
      const next = (last || 0) + 1;
      setLastPeriod(last);
      
      // Auto-fill amount berdasarkan deposit amount produk
      const selectedProduct = products.find(p => p._id === productId);
      if (selectedProduct && selectedProduct.depositAmount && !editingId) {
        setFormData((prev) => ({ 
          ...prev, 
          amount: selectedProduct.depositAmount,
          installmentPeriod: next,
          description: `Pembayaran Simpanan Periode - ${next}`
        }));
      } else if (!editingId) {
        setFormData((prev) => ({ 
          ...prev, 
          installmentPeriod: next,
          description: `Pembayaran Simpanan Periode - ${next}`
        }));
      }
    } catch (error) {
      console.error("Error checking last period:", error);
      setLastPeriod(0);
      if (!editingId) {
        setFormData((prev) => ({ 
          ...prev, 
          installmentPeriod: 1,
          description: "Pembayaran Simpanan Periode - 1"
        }));
      }
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

  const handlePartial = async (id) => {
    const notes = prompt("Catatan pembayaran partial (opsional):");
    if (notes !== null) { // User didn't cancel
      try {
        const token = localStorage.getItem("token");
        await axios.patch(`${API_URL}/api/admin/savings/${id}/partial`, 
          { notes }, 
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast.success("Simpanan ditandai sebagai pembayaran partial");
        fetchSavings();
      } catch {
        toast.error("Gagal menandai sebagai partial");
      }
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
            {formatCurrency(
              savings
                .filter((s) => s.type === "Setoran" && s.status === "Approved")
                .reduce((sum, s) => sum + s.amount, 0)
            )}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Penarikan</h3>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(
              savings
                .filter(
                  (s) => s.type === "Penarikan" && s.status === "Approved"
                )
                .reduce((sum, s) => sum + s.amount, 0)
            )}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Saldo</h3>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(
              savings
                .filter((s) => s.type === "Setoran" && s.status === "Approved")
                .reduce((sum, s) => sum + s.amount, 0) -
                savings
                  .filter(
                    (s) => s.type === "Penarikan" && s.status === "Approved"
                  )
                  .reduce((sum, s) => sum + s.amount, 0)
            )}
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
              {savings.map((saving) => (
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
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(
                        saving.status
                      )}`}
                    >
                      {saving.status}
                      {saving.paymentType === "Partial" && (
                        <span className="ml-1 text-xs">(#{saving.partialSequence})</span>
                      )}
                    </span>
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
                          <button
                            onClick={() => handlePartial(saving._id)}
                            className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded hover:bg-yellow-200"
                            title="Partial"
                          >
                            ◐
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
                    {lastPeriod > 0 && (
                      <p className="mt-1 text-sm text-gray-500">
                        Periode terakhir: {lastPeriod}, otomatis diisi periode
                        berikutnya
                      </p>
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
