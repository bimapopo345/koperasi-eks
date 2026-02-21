import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  getAccountsByType,
  createAccount,
  updateAccount,
  deleteAccount,
  getSubmenusByMasterType,
} from "../../api/accountingApi";

const TABS = ["Assets", "Liabilities", "Equity", "Income", "Expenses"];

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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAccountsByType(currentType);
      if (res.success) {
        setAccountCounts(res.accountCounts || {});
        setAccountsBySubtype(res.accountsBySubtype || {});
      }
    } catch (err) {
      toast.error("Gagal memuat data COA");
    } finally {
      setLoading(false);
    }
  }, [currentType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreateModal = async () => {
    setEditingAccount(null);
    setForm({ accountName: "", submenuId: "", accountCode: "", currency: "Rp", description: "" });
    try {
      const res = await getSubmenusByMasterType(currentType);
      setSubmenus(res.data || []);
    } catch { setSubmenus([]); }
    setShowModal(true);
  };

  const openEditModal = async (acc) => {
    setEditingAccount(acc);
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
      toast.error(err.response?.data?.message || "Gagal menyimpan");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus akun ini?")) return;
    try {
      const res = await deleteAccount(id);
      if (res.success) { toast.success("Account deleted"); fetchData(); }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus");
    }
  };

  const formatBalance = (balance, currency = "Rp") => {
    const num = parseFloat(balance) || 0;
    return `${currency} ${num.toLocaleString("id-ID", { minimumFractionDigits: 0 })}`;
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Chart of Accounts</h1>
        <button onClick={openCreateModal} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition text-sm font-medium">
          + Add Account
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setCurrentType(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${
              currentType === tab
                ? "bg-pink-600 text-white"
                : "text-gray-600 hover:text-pink-600 hover:bg-pink-50"
            }`}
          >
            {tab} <span className="ml-1 text-xs opacity-75">({accountCounts[tab] || 0})</span>
          </button>
        ))}
      </div>

      {/* Accounts Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : Object.keys(accountsBySubtype).length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">Belum ada akun untuk {currentType}</p>
          <button onClick={openCreateModal} className="mt-3 text-pink-600 hover:underline text-sm">+ Tambah akun pertama</button>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(accountsBySubtype).map(([submenuName, data]) => (
            <div key={submenuName} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-pink-50 to-rose-50 px-5 py-3 border-b border-pink-100">
                <h3 className="font-semibold text-gray-800">{submenuName}</h3>
              </div>
              {data.accounts && data.accounts.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-gray-600">
                        <th className="text-left px-5 py-3 font-medium">Code</th>
                        <th className="text-left px-5 py-3 font-medium">Account Name</th>
                        <th className="text-left px-5 py-3 font-medium">Currency</th>
                        <th className="text-right px-5 py-3 font-medium">Balance</th>
                        <th className="text-left px-5 py-3 font-medium">Last Transaction</th>
                        <th className="text-center px-5 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.accounts.map((acc) => (
                        <tr key={acc._id} className="hover:bg-gray-50 transition">
                          <td className="px-5 py-3 font-mono text-xs text-gray-500">{acc.accountCode || "-"}</td>
                          <td className="px-5 py-3 font-medium text-gray-900">{acc.accountName}</td>
                          <td className="px-5 py-3 text-gray-500">{acc.currency || "Rp"}</td>
                          <td className={`px-5 py-3 text-right font-mono ${(acc.balance || 0) < 0 ? "text-red-600" : "text-green-600"}`}>
                            {formatBalance(acc.balance, acc.currency)}
                          </td>
                          <td className="px-5 py-3 text-gray-400 text-xs">
                            {acc.lastTransaction ? new Date(acc.lastTransaction).toLocaleDateString("id-ID") : "-"}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <button onClick={() => openEditModal(acc)} className="text-blue-600 hover:text-blue-800 text-xs mr-3">Edit</button>
                            <button onClick={() => handleDelete(acc._id)} className="text-red-600 hover:text-red-800 text-xs">Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-5 py-4 text-gray-400 text-sm">No accounts in this category</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editingAccount ? "Edit Account" : "Add New Account"}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name *</label>
                <input type="text" value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500" required minLength={3} />
              </div>
              {!editingAccount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Submenu (Category) *</label>
                  <select value={form.submenuId} onChange={(e) => setForm({ ...form, submenuId: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500" required>
                    <option value="">Select submenu...</option>
                    {submenus.map((s) => <option key={s._id} value={s._id}>{s.submenuName}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Code</label>
                  <input type="text" value={form.accountCode} onChange={(e) => setForm({ ...form, accountCode: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500" placeholder="Auto-generated" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <input type="text" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500" rows={2} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm font-medium">
                  {editingAccount ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
