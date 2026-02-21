import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  toggleTransactionReviewed,
  uploadTransactions,
  getAllCategories,
  getAssetsAccounts,
} from "../../api/accountingApi";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [assetsAccounts, setAssetsAccounts] = useState({});
  const [categories, setCategories] = useState([]);

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);
  const [form, setForm] = useState({
    transactionDate: new Date().toISOString().split("T")[0],
    description: "",
    accountId: "",
    transactionType: "Deposit",
    amount: "",
    categoryId: "",
    categoryType: "",
    notes: "",
    senderName: "",
  });

  // Split state
  const [splits, setSplits] = useState([]);
  const [isSplitMode, setIsSplitMode] = useState(false);

  // Upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({ accountId: "", csvText: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [txnRes, assetsRes, catRes] = await Promise.all([
        getTransactions(selectedAccountId || null),
        getAssetsAccounts(),
        getAllCategories(),
      ]);
      if (txnRes.success) setTransactions(txnRes.data || []);
      if (assetsRes.success) setAssetsAccounts(assetsRes.data || {});
      if (catRes.success) setCategories(catRes.data || []);
    } catch (err) {
      toast.error("Gagal memuat data transaksi");
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Flatten assets accounts for select
  const allAssetsAccounts = Object.values(assetsAccounts).flat();

  const openCreateModal = () => {
    setEditingTxn(null);
    setForm({
      transactionDate: new Date().toISOString().split("T")[0],
      description: "", accountId: selectedAccountId || "", transactionType: "Deposit",
      amount: "", categoryId: "", categoryType: "", notes: "", senderName: "",
    });
    setSplits([]);
    setIsSplitMode(false);
    setShowModal(true);
  };

  const openEditModal = (txn) => {
    setEditingTxn(txn);
    setForm({
      transactionDate: txn.transactionDate ? new Date(txn.transactionDate).toISOString().split("T")[0] : "",
      description: txn.description || "",
      accountId: txn.accountId?._id || txn.accountId || "",
      transactionType: txn.transactionType || "Deposit",
      amount: txn.amount || "",
      categoryId: txn.categoryId || "",
      categoryType: txn.categoryType || "",
      notes: txn.notes || "",
      senderName: txn.senderName || "",
    });
    if (txn.isSplit && txn.splitCategories) {
      setSplits(txn.splitCategories.map((s) => ({
        amount: s.amount, categoryId: s.categoryId || "", categoryType: s.categoryType || "account", description: s.description || "",
      })));
      setIsSplitMode(true);
    } else {
      setSplits([]);
      setIsSplitMode(false);
    }
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      if (isSplitMode && splits.length > 0) {
        payload.splits = splits;
      }

      if (editingTxn) {
        const res = await updateTransaction(editingTxn._id, payload);
        if (res.success) toast.success("Transaction updated");
      } else {
        const res = await createTransaction(payload);
        if (res.success) toast.success("Transaction created");
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menyimpan");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin ingin menghapus transaksi ini?")) return;
    try {
      await deleteTransaction(id);
      toast.success("Transaction deleted");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus");
    }
  };

  const handleToggleReviewed = async (id) => {
    try {
      await toggleTransactionReviewed(id);
      fetchData();
    } catch { toast.error("Gagal update status"); }
  };

  const addSplitRow = () => {
    setSplits([...splits, { amount: "", categoryId: "", categoryType: "account", description: "" }]);
  };

  const removeSplitRow = (idx) => {
    setSplits(splits.filter((_, i) => i !== idx));
  };

  const updateSplit = (idx, field, value) => {
    const updated = [...splits];
    updated[idx] = { ...updated[idx], [field]: value };
    setSplits(updated);
  };

  const handleUpload = async () => {
    try {
      const lines = uploadData.csvText.trim().split("\n");
      if (lines.length < 2) return toast.error("CSV minimal 2 baris (header + data)");

      const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const vals = line.split(",").map((v) => v.trim());
        const obj = {};
        header.forEach((h, i) => { obj[h] = vals[i] || ""; });
        return obj;
      });

      const res = await uploadTransactions({ accountId: uploadData.accountId, transactions: rows });
      if (res.success) {
        toast.success(res.message);
        setShowUploadModal(false);
        setUploadData({ accountId: "", csvText: "" });
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload gagal");
    }
  };

  const formatCurrency = (amount, currency = "Rp") => {
    const num = parseFloat(amount) || 0;
    return `${currency} ${num.toLocaleString("id-ID")}`;
  };

  const getCategoryOption = (cat) => {
    const prefix = cat.type === "master" ? "▸ " : cat.type === "submenu" ? "  ▹ " : "    ";
    const code = cat.code ? ` (${cat.code})` : "";
    return `${prefix}${cat.name}${code}`;
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowUploadModal(true)} className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm">
            CSV Upload
          </button>
          <button onClick={openCreateModal} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm font-medium">
            + Add Transaction
          </button>
        </div>
      </div>

      {/* Account filter */}
      <div className="mb-4">
        <select
          value={selectedAccountId}
          onChange={(e) => setSelectedAccountId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-72 focus:ring-2 focus:ring-pink-500"
        >
          <option value="">All Accounts</option>
          {Object.entries(assetsAccounts).map(([group, accounts]) => (
            <optgroup key={group} label={group}>
              {accounts.map((a) => (
                <option key={a._id} value={a._id}>{a.accountName} ({a.accountCode})</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Transactions Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">Belum ada transaksi</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Description</th>
                  <th className="text-left px-4 py-3 font-medium">Account</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-center px-4 py-3 font-medium">Type</th>
                  <th className="text-right px-4 py-3 font-medium">Amount</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-center px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((txn) => (
                  <tr key={txn._id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(txn.transactionDate).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-gray-900 max-w-xs truncate">
                      {txn.description || "-"}
                      {txn.senderName && <span className="text-gray-400 text-xs ml-1">({txn.senderName})</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {txn.accountId?.accountName || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {txn.isSplit ? (
                        <span className="text-purple-600 font-medium">Split ({txn.splitCategories?.length || 0})</span>
                      ) : (
                        txn.categoryName || "-"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        txn.transactionType === "Deposit"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {txn.transactionType}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono text-sm ${
                      txn.transactionType === "Deposit" ? "text-green-600" : "text-red-600"
                    }`}>
                      {txn.transactionType === "Withdrawal" ? "-" : "+"}
                      {formatCurrency(txn.amount, txn.accountId?.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleToggleReviewed(txn._id)} title={txn.reviewed ? "Reviewed" : "Unreviewed"}>
                          {txn.reviewed ? <span className="text-green-500">&#10003;</span> : <span className="text-gray-300">&#9675;</span>}
                        </button>
                        {txn.isReconciled && <span className="text-blue-500 text-xs ml-1" title="Reconciled">R</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <button onClick={() => openEditModal(txn)} className="text-blue-600 hover:text-blue-800 text-xs mr-2">Edit</button>
                      <button onClick={() => handleDelete(txn._id)} className="text-red-600 hover:text-red-800 text-xs">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">{editingTxn ? "Edit Transaction" : "Add Transaction"}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input type="date" value={form.transactionDate} onChange={(e) => setForm({ ...form, transactionDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select value={form.transactionType} onChange={(e) => setForm({ ...form, transactionType: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500">
                    <option value="Deposit">Deposit</option>
                    <option value="Withdrawal">Withdrawal</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account *</label>
                <select value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500" required>
                  <option value="">Select account...</option>
                  {Object.entries(assetsAccounts).map(([group, accounts]) => (
                    <optgroup key={group} label={group}>
                      {accounts.map((a) => <option key={a._id} value={a._id}>{a.accountName}</option>)}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500" />
              </div>

              {/* Category or Split */}
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-gray-700">Category</label>
                <button type="button" onClick={() => { setIsSplitMode(!isSplitMode); if (!isSplitMode) addSplitRow(); }}
                  className="text-xs text-purple-600 hover:underline ml-2">
                  {isSplitMode ? "Single Category" : "Split Transaction"}
                </button>
              </div>

              {!isSplitMode ? (
                <select value={`${form.categoryType}|${form.categoryId}`}
                  onChange={(e) => {
                    const [type, id] = e.target.value.split("|");
                    setForm({ ...form, categoryType: type, categoryId: id });
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500">
                  <option value="|">Select category...</option>
                  {categories.map((cat) => (
                    <option key={`${cat.type}-${cat.id}`} value={`${cat.type}|${cat.id}`}>{getCategoryOption(cat)}</option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2 border border-purple-200 rounded-lg p-3 bg-purple-50">
                  {splits.map((sp, idx) => (
                    <div key={idx} className="flex gap-2 items-start">
                      <input type="number" step="0.01" placeholder="Amount" value={sp.amount}
                        onChange={(e) => updateSplit(idx, "amount", e.target.value)}
                        className="w-24 border border-gray-300 rounded px-2 py-1.5 text-sm" />
                      <select value={`${sp.categoryType}|${sp.categoryId}`}
                        onChange={(e) => {
                          const [type, id] = e.target.value.split("|");
                          updateSplit(idx, "categoryType", type);
                          updateSplit(idx, "categoryId", id);
                        }}
                        className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm">
                        <option value="|">Select...</option>
                        {categories.filter((c) => c.type === "account").map((cat) => (
                          <option key={cat.id} value={`${cat.type}|${cat.id}`}>{cat.name}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => removeSplitRow(idx)} className="text-red-500 hover:text-red-700 text-lg px-1">&times;</button>
                    </div>
                  ))}
                  <button type="button" onClick={addSplitRow} className="text-xs text-purple-600 hover:underline">+ Add split row</button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sender Name</label>
                  <input type="text" value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500" />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm font-medium">
                  {editingTxn ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowUploadModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Upload Transactions (CSV)</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account *</label>
                <select value={uploadData.accountId} onChange={(e) => setUploadData({ ...uploadData, accountId: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500" required>
                  <option value="">Select account...</option>
                  {allAssetsAccounts.map((a) => <option key={a._id} value={a._id}>{a.accountName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CSV Data *</label>
                <p className="text-xs text-gray-400 mb-1">Format: date,description,amount,type (header row required)</p>
                <textarea value={uploadData.csvText} onChange={(e) => setUploadData({ ...uploadData, csvText: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-pink-500" rows={8}
                  placeholder={"date,description,amount,type\n2025-01-15,Payment received,500000,Deposit\n2025-01-16,Office rent,-1000000,Withdrawal"} />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button onClick={handleUpload} disabled={!uploadData.accountId || !uploadData.csvText}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm font-medium disabled:opacity-50">
                  Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
