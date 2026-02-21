import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import {
  getAccountsByType,
  createAccount,
  updateAccount,
  deleteAccount,
  getSubmenusByMasterType,
} from "../../api/accountingApi";

const TABS = ["Assets", "Liabilities", "Equity", "Income", "Expenses"];
const TAB_DISPLAY = { Assets: "Assets", Liabilities: "Liabilities & Credit Cards", Equity: "Equity", Income: "Income", Expenses: "Expenses" };

export default function ChartOfAccounts() {
  const [currentType, setCurrentType] = useState("Assets");
  const [accountCounts, setAccountCounts] = useState({});
  const [accountsBySubtype, setAccountsBySubtype] = useState({});
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [submenus, setSubmenus] = useState([]);
  const [form, setForm] = useState({ accountName: "", submenuId: "", accountCode: "", currency: "Rp", description: "" });
  const [preSelectedSubmenu, setPreSelectedSubmenu] = useState("");

  // Dropdown state
  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAccountsByType(currentType);
      if (res.success) {
        setAccountCounts(res.accountCounts || {});
        setAccountsBySubtype(res.accountsBySubtype || {});
      }
    } catch {
      toast.error("Failed to load chart of accounts");
    } finally {
      setLoading(false);
    }
  }, [currentType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpenDropdown(null);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const openCreateModal = async (submenuId = "") => {
    setEditingAccount(null);
    setPreSelectedSubmenu(submenuId);
    setForm({ accountName: "", submenuId: submenuId, accountCode: "", currency: "Rp", description: "" });
    try {
      const res = await getSubmenusByMasterType(currentType);
      setSubmenus(res.data || []);
    } catch { setSubmenus([]); }
    setShowModal(true);
  };

  const openEditModal = async (acc) => {
    setEditingAccount(acc);
    setPreSelectedSubmenu("");
    setForm({
      accountName: acc.accountName,
      submenuId: acc.submenuId?._id || acc.submenuId,
      accountCode: acc.accountCode || "",
      currency: acc.currency || "Rp",
      description: acc.description || "",
    });
    try {
      const res = await getSubmenusByMasterType(currentType);
      setSubmenus(res.data || []);
    } catch { setSubmenus([]); }
    setOpenDropdown(null);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        const res = await updateAccount(editingAccount._id, form);
        if (res.success) toast.success("Account updated");
      } else {
        const res = await createAccount(form);
        if (res.success) toast.success("Account created");
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this account?")) return;
    try {
      const res = await deleteAccount(id);
      if (res.success) { toast.success("Account deleted"); setOpenDropdown(null); fetchData(); }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete");
    }
  };

  const formatBalance = (balance, currency = "Rp") => {
    const num = parseFloat(balance) || 0;
    return `${currency} ${num.toLocaleString("id-ID", { minimumFractionDigits: 0 })}`;
  };

  // Check if an account code indicates a child (e.g. "1001.1")
  const isChildAccount = (code) => code && code.includes(".");

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Breadcrumb header card */}
      <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl px-6 py-4 mb-6 border border-pink-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <nav className="text-xs text-gray-500 mb-1">
              <span>Accounting</span>
              <span className="mx-1.5">/</span>
              <span className="text-pink-700 font-medium">Chart of Accounts</span>
            </nav>
            <h1 className="text-xl font-bold text-gray-900">Chart of Accounts</h1>
          </div>
          <button onClick={() => openCreateModal()}
            className="px-5 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition text-sm font-medium shadow-sm">
            + Add a New Account
          </button>
        </div>
      </div>

      {/* Centered Pill Tabs */}
      <div className="flex justify-center mb-8">
        <div className="relative flex items-center">
          {/* Decorative lines */}
          <div className="hidden sm:block w-12 h-px bg-gray-300 mr-3" />
          <div className="inline-flex bg-pink-50 rounded-full p-1 gap-0.5">
            {TABS.map((tab) => (
              <button key={tab} onClick={() => setCurrentType(tab)}
                className={`relative px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  currentType === tab
                    ? "bg-white text-pink-700 shadow-[0_0_9px_1px_rgba(236,72,153,0.2)]"
                    : "text-pink-600 hover:text-pink-800"
                }`}>
                {TAB_DISPLAY[tab] || tab}
                <span className={`ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold ${
                  currentType === tab
                    ? "bg-pink-100 text-pink-700"
                    : "bg-pink-100/60 text-pink-500"
                }`}>
                  {accountCounts[tab] || 0}
                </span>
              </button>
            ))}
          </div>
          <div className="hidden sm:block w-12 h-px bg-gray-300 ml-3" />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
        </div>
      ) : Object.keys(accountsBySubtype).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">No accounts for {currentType}</h3>
          <p className="text-sm text-gray-500 mb-4">Start by adding your first account in this category.</p>
          <button onClick={() => openCreateModal()}
            className="px-5 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition text-sm font-medium shadow-sm">
            + Add a New Account
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(accountsBySubtype).map(([submenuName, data]) => (
            <div key={submenuName} className="bg-white rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden">
              {/* Section Header */}
              <div className="bg-gray-50 px-6 py-3.5 border-b border-gray-100">
                <h3 className="font-bold text-gray-800 text-[15px]">{submenuName}</h3>
              </div>

              {/* Account Items */}
              {data.accounts && data.accounts.length > 0 ? (
                <div>
                  {data.accounts.map((acc, idx) => {
                    const isChild = isChildAccount(acc.accountCode);
                    return (
                      <div key={acc._id}
                        className={`flex items-center justify-between px-6 py-4 border-b border-gray-50 last:border-b-0 hover:bg-pink-50/20 transition ${
                          isChild ? "pl-12 bg-gray-50/50" : ""
                        }`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            {isChild && <span className="text-gray-300 text-sm font-mono select-none">└─</span>}
                            <span className="font-mono text-xs text-gray-400 shrink-0">{acc.accountCode || "-"}</span>
                            <span className="font-semibold text-gray-900">{acc.accountName}</span>
                            <span className="text-xs text-gray-400">({acc.currency || "Rp"})</span>
                          </div>
                          <p className={`text-xs text-gray-400 mt-0.5 ${isChild ? "ml-9" : "ml-0"}`}>No transactions for this account</p>
                          {acc.description && (
                            <p className={`text-xs text-gray-400 mt-0.5 line-clamp-1 ${isChild ? "ml-9" : "ml-0"}`}>{acc.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-4 ml-4 shrink-0">
                          {/* Balance */}
                          <span className={`font-mono text-sm ${(acc.balance || 0) < 0 ? "text-red-600" : "text-gray-700"}`}>
                            {formatBalance(acc.balance, acc.currency)}
                          </span>

                          {/* Action Dropdown */}
                          <div className="relative" ref={openDropdown === acc._id ? dropdownRef : null}>
                            <button onClick={() => setOpenDropdown(openDropdown === acc._id ? null : acc._id)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>
                            {openDropdown === acc._id && (
                              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-20 min-w-[140px]">
                                <button onClick={() => openEditModal(acc)}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">Edit</button>
                                <div className="border-t border-gray-100 my-1" />
                                <button onClick={() => handleDelete(acc._id)}
                                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">Delete</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-6 py-5 text-gray-400 text-sm">No accounts in this category yet.</div>
              )}

              {/* Add account link at bottom of section */}
              <div className="px-6 py-3 border-t border-gray-50">
                <button onClick={() => openCreateModal(data.submenuId || "")}
                  className="text-sm text-pink-600 hover:text-pink-800 font-medium transition">
                  + Add a new account
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editingAccount ? "Edit Account" : "Add a New Account"}</h2>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Account Name <span className="text-red-500">*</span>
                </label>
                <input type="text" value={form.accountName}
                  onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition"
                  required minLength={3} placeholder="e.g. Cash on Hand" />
              </div>
              {!editingAccount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Category (Submenu) <span className="text-red-500">*</span>
                  </label>
                  <select value={form.submenuId}
                    onChange={(e) => setForm({ ...form, submenuId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition"
                    required>
                    <option value="">Select a category...</option>
                    {submenus.map((s) => <option key={s._id} value={s._id}>{s.submenuName}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Code</label>
                  <input type="text" value={form.accountCode}
                    onChange={(e) => setForm({ ...form, accountCode: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition"
                    placeholder="Auto-generated" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Currency</label>
                  <input type="text" value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none transition resize-y"
                  rows={3} placeholder="Optional description" />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                <button type="submit"
                  className="px-5 py-2.5 text-sm font-medium text-white bg-pink-600 rounded-lg hover:bg-pink-700 transition shadow-sm">
                  {editingAccount ? "Save Changes" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
