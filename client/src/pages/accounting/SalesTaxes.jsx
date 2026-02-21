import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  getSalesTaxes,
  createSalesTax,
  updateSalesTax,
  deleteSalesTaxApi,
  toggleSalesTax,
} from "../../api/accountingApi";

export default function SalesTaxes() {
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingTax, setEditingTax] = useState(null);
  const [form, setForm] = useState({
    taxName: "", abbreviation: "", description: "", taxNumber: "",
    taxRate: "", showTaxNumberOnInvoices: false, isRecoverable: false, isCompoundTax: false,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSalesTaxes(filter);
      if (res.success) setTaxes(res.data || []);
    } catch (err) {
      toast.error("Gagal memuat data pajak");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreateModal = () => {
    setEditingTax(null);
    setForm({
      taxName: "", abbreviation: "", description: "", taxNumber: "",
      taxRate: "", showTaxNumberOnInvoices: false, isRecoverable: false, isCompoundTax: false,
    });
    setShowModal(true);
  };

  const openEditModal = (tax) => {
    setEditingTax(tax);
    setForm({
      taxName: tax.taxName || "",
      abbreviation: tax.abbreviation || "",
      description: tax.description || "",
      taxNumber: tax.taxNumber || "",
      taxRate: tax.taxRate ?? "",
      showTaxNumberOnInvoices: !!tax.showTaxNumberOnInvoices,
      isRecoverable: !!tax.isRecoverable,
      isCompoundTax: !!tax.isCompoundTax,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, taxRate: parseFloat(form.taxRate) };
      if (editingTax) {
        const res = await updateSalesTax(editingTax._id, payload);
        if (res.success) toast.success("Sales tax updated");
      } else {
        const res = await createSalesTax(payload);
        if (res.success) toast.success("Sales tax created");
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menyimpan");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus pajak ini?")) return;
    try {
      await deleteSalesTaxApi(id);
      toast.success("Sales tax deleted");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus");
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await toggleSalesTax(id);
      if (res.success) { toast.success(res.message); fetchData(); }
    } catch (err) {
      toast.error("Gagal update status");
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Sales Taxes</h1>
        <button onClick={openCreateModal} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition text-sm font-medium">
          + Add Sales Tax
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {["active", "inactive", "all"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === f ? "bg-pink-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : taxes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">Belum ada sales tax</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-left px-5 py-3 font-medium">Tax Name</th>
                  <th className="text-left px-5 py-3 font-medium">Abbreviation</th>
                  <th className="text-right px-5 py-3 font-medium">Rate (%)</th>
                  <th className="text-left px-5 py-3 font-medium">Tax Number</th>
                  <th className="text-center px-5 py-3 font-medium">Options</th>
                  <th className="text-center px-5 py-3 font-medium">Status</th>
                  <th className="text-center px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {taxes.map((tax) => (
                  <tr key={tax._id} className={`hover:bg-gray-50 transition ${!tax.isActive ? "opacity-50" : ""}`}>
                    <td className="px-5 py-3 font-medium text-gray-900">{tax.taxName}</td>
                    <td className="px-5 py-3">
                      <span className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-mono font-medium">
                        {tax.abbreviation}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono">{tax.taxRate}%</td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{tax.taxNumber || "-"}</td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex justify-center gap-1">
                        {tax.isRecoverable && <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded">Recoverable</span>}
                        {tax.isCompoundTax && <span className="text-xs bg-yellow-100 text-yellow-600 px-1.5 py-0.5 rounded">Compound</span>}
                        {tax.showTaxNumberOnInvoices && <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Show #</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button onClick={() => handleToggle(tax._id)}
                        className={`px-2 py-0.5 rounded text-xs font-medium ${tax.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {tax.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-center whitespace-nowrap">
                      <button onClick={() => openEditModal(tax)} className="text-blue-600 hover:text-blue-800 text-xs mr-3">Edit</button>
                      <button onClick={() => handleDelete(tax._id)} className="text-red-600 hover:text-red-800 text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editingTax ? "Edit Sales Tax" : "Add Sales Tax"}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Name *</label>
                <input type="text" value={form.taxName} onChange={(e) => setForm({ ...form, taxName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500" required maxLength={150} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Abbreviation *</label>
                  <input type="text" value={form.abbreviation} onChange={(e) => setForm({ ...form, abbreviation: e.target.value.toUpperCase() })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-pink-500" required maxLength={10} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%) *</label>
                  <input type="number" step="0.01" min="0" max="100" value={form.taxRate}
                    onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500" maxLength={255} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Number</label>
                <input type="text" value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500" maxLength={255} />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={form.showTaxNumberOnInvoices}
                    onChange={(e) => setForm({ ...form, showTaxNumberOnInvoices: e.target.checked })}
                    className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500" />
                  Show tax number on invoices
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={form.isRecoverable}
                    onChange={(e) => setForm({ ...form, isRecoverable: e.target.checked })}
                    className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500" />
                  Is recoverable
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={form.isCompoundTax}
                    onChange={(e) => setForm({ ...form, isCompoundTax: e.target.checked })}
                    className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500" />
                  Is compound tax
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm font-medium">
                  {editingTax ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
