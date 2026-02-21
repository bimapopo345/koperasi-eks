import { useState, useEffect, useCallback, useRef } from "react";
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
  const [view, setView] = useState("list"); // "list" | "form"
  const [editingTax, setEditingTax] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  const emptyForm = {
    taxName: "", abbreviation: "", description: "", taxNumber: "",
    taxRate: "", showTaxNumberOnInvoices: false, isRecoverable: true, isCompoundTax: false,
  };
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSalesTaxes(filter);
      if (res.success) setTaxes(res.data || []);
    } catch {
      toast.error("Failed to load sales taxes");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const openCreateForm = () => {
    setEditingTax(null);
    setForm(emptyForm);
    setView("form");
  };

  const openEditForm = (tax) => {
    setEditingTax(tax);
    setForm({
      taxName: tax.taxName || "",
      abbreviation: tax.abbreviation || "",
      description: tax.description || "",
      taxNumber: tax.taxNumber || "",
      taxRate: tax.taxRate != null ? String(tax.taxRate) : "",
      showTaxNumberOnInvoices: !!tax.showTaxNumberOnInvoices,
      isRecoverable: !!tax.isRecoverable,
      isCompoundTax: !!tax.isCompoundTax,
    });
    setOpenDropdown(null);
    setView("form");
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
      setView("list");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this sales tax?")) return;
    try {
      await deleteSalesTaxApi(id);
      toast.success("Sales tax deleted");
      setOpenDropdown(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await toggleSalesTax(id);
      if (res.success) { toast.success(res.message); setOpenDropdown(null); fetchData(); }
    } catch {
      toast.error("Failed to update status");
    }
  };

  // ==================== FORM VIEW ====================
  if (view === "form") {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        {/* Back link */}
        <button onClick={() => setView("list")} className="inline-flex items-center gap-1.5 text-sm text-pink-600 hover:text-pink-800 mb-5 font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Sales Taxes
        </button>

        <div className="bg-white rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.08)] border border-gray-100">
          <div className="px-6 py-5 border-b border-gray-100">
            <h1 className="text-xl font-bold text-gray-900">{editingTax ? "Edit Sales Tax" : "Create a Sales Tax"}</h1>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-5">
            {/* Tax Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tax Name <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.taxName}
                onChange={(e) => setForm({ ...form, taxName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition"
                placeholder="e.g. Value Added Tax" required maxLength={150} />
            </div>

            {/* Abbreviation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Abbreviation <span className="text-red-500">*</span>
              </label>
              <input type="text" value={form.abbreviation}
                onChange={(e) => setForm({ ...form, abbreviation: e.target.value.toUpperCase() })}
                className="max-w-[200px] border border-gray-300 rounded-lg px-4 py-2 text-sm font-mono uppercase focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition"
                placeholder="e.g. VAT" required maxLength={10} />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
              <textarea value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition resize-y"
                rows={4} placeholder="Optional description for this tax" maxLength={500} />
            </div>

            {/* Tax Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tax Number</label>
              <input type="text" value={form.taxNumber}
                onChange={(e) => setForm({ ...form, taxNumber: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition"
                placeholder="Your tax registration number" maxLength={255} />
            </div>

            {/* Checkboxes */}
            <div className="space-y-3 py-1">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={form.showTaxNumberOnInvoices}
                  onChange={(e) => setForm({ ...form, showTaxNumberOnInvoices: e.target.checked })}
                  className="w-4 h-4 text-pink-600 rounded border-gray-300 focus:ring-pink-500" />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">Show tax number on invoices</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={form.isRecoverable}
                  onChange={(e) => setForm({ ...form, isRecoverable: e.target.checked })}
                  className="w-4 h-4 text-pink-600 rounded border-gray-300 focus:ring-pink-500" />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">This tax is recoverable</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={form.isCompoundTax}
                  onChange={(e) => setForm({ ...form, isCompoundTax: e.target.checked })}
                  className="w-4 h-4 text-pink-600 rounded border-gray-300 focus:ring-pink-500" />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">This is a compound tax</span>
              </label>
            </div>

            {/* Tax Rate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tax Rate (%) <span className="text-red-500">*</span>
              </label>
              <input type="number" step="0.0001" min="0" max="100" value={form.taxRate}
                onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                className="max-w-[200px] border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition"
                placeholder="0.0000" required />
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button type="button" onClick={() => setView("list")}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                Cancel
              </button>
              <button type="submit"
                className="px-5 py-2.5 text-sm font-medium text-white bg-pink-600 rounded-lg hover:bg-pink-700 transition shadow-sm">
                {editingTax ? "Save Changes" : "Save Sales Tax"}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ==================== LIST VIEW ====================
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.08)] border border-gray-100">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-6 py-5 border-b border-gray-100 gap-3">
          <h1 className="text-xl font-bold text-gray-900">Sales Taxes</h1>
          <button onClick={openCreateForm}
            className="px-5 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition text-sm font-medium shadow-sm">
            + Create a Sales Tax
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 px-6 pt-5 pb-2">
          {[
            { key: "active", label: "Active" },
            { key: "inactive", label: "Inactive" },
            { key: "all", label: "All" },
          ].map((f) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                filter === f.key
                  ? "bg-pink-600 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="px-6 pb-6 pt-3">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
            </div>
          ) : taxes.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">Create a sales tax</h3>
              <p className="text-sm text-gray-500 mb-4 text-center max-w-sm">
                Sales taxes will be available for use on invoices, bills, and other transactions.
              </p>
              <button onClick={openCreateForm}
                className="px-5 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition text-sm font-medium shadow-sm">
                Create a Sales Tax
              </button>
            </div>
          ) : (
            /* Table */
            <div className="overflow-x-auto -mx-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tax Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Abbreviation</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tax Rate</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tax Number</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {taxes.map((tax) => (
                    <tr key={tax._id} className={`border-b border-gray-50 hover:bg-pink-50/30 transition ${!tax.isActive ? "opacity-60" : ""}`}>
                      {/* Tax Name + description */}
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{tax.taxName}</div>
                        {tax.description && <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{tax.description}</div>}
                      </td>

                      {/* Abbreviation badge */}
                      <td className="px-4 py-4">
                        <span className="inline-block bg-pink-100 text-pink-700 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold">
                          {tax.abbreviation}
                        </span>
                      </td>

                      {/* Tax Rate + flags */}
                      <td className="px-4 py-4 text-right">
                        <div className="font-mono text-gray-900">{parseFloat(tax.taxRate || 0).toFixed(4)}%</div>
                        <div className="flex justify-end gap-1 mt-1">
                          {tax.isCompoundTax && <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">Compound</span>}
                          {tax.isRecoverable && <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">Recoverable</span>}
                        </div>
                      </td>

                      {/* Tax Number */}
                      <td className="px-4 py-4">
                        {tax.taxNumber ? (
                          <div>
                            <div className="text-gray-700 text-sm">{tax.taxNumber}</div>
                            {tax.showTaxNumberOnInvoices && (
                              <div className="text-[10px] text-gray-400 mt-0.5">Shown on invoices</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>

                      {/* Status badge */}
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          tax.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}>
                          {tax.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Actions dropdown */}
                      <td className="px-4 py-4 text-center relative" ref={openDropdown === tax._id ? dropdownRef : null}>
                        <button onClick={() => setOpenDropdown(openDropdown === tax._id ? null : tax._id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
                          </svg>
                        </button>

                        {openDropdown === tax._id && (
                          <div className="absolute right-4 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[160px]">
                            <button onClick={() => openEditForm(tax)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
                              Edit
                            </button>
                            <button onClick={() => { handleToggle(tax._id); }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
                              {tax.isActive ? "Mark as Inactive" : "Mark as Active"}
                            </button>
                            <div className="border-t border-gray-100 my-1" />
                            <button onClick={() => { handleDelete(tax._id); }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
