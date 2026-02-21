import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  getReconciliation,
  startReconciliation,
  processReconciliation,
  toggleMatch,
  completeReconciliation,
  cancelReconciliation,
  removeReconciliationItems,
  updateClosingBalance,
  viewReconciliation,
  getAssetsAccounts,
} from "../../api/accountingApi";

export default function ReconciliationPage() {
  const [assetsAccounts, setAssetsAccounts] = useState({});
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [reconData, setReconData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Process view
  const [processData, setProcessData] = useState(null);
  const [viewData, setViewData] = useState(null);

  // Start form
  const [showStartForm, setShowStartForm] = useState(false);
  const [startForm, setStartForm] = useState({ statementEndDate: "", closingBalance: "" });

  const fetchAssets = useCallback(async () => {
    try {
      const res = await getAssetsAccounts();
      if (res.success) setAssetsAccounts(res.data || {});
    } catch { /* ignore */ }
  }, []);

  const fetchReconData = useCallback(async () => {
    if (!selectedAccountId) { setReconData(null); return; }
    setLoading(true);
    try {
      const res = await getReconciliation(selectedAccountId);
      if (res.success) setReconData(res);
    } catch (err) {
      toast.error("Gagal memuat data rekonsiliasi");
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);
  useEffect(() => { fetchReconData(); }, [fetchReconData]);

  const handleStart = async () => {
    if (!startForm.statementEndDate || !startForm.closingBalance) {
      return toast.error("Semua field wajib diisi");
    }
    try {
      const res = await startReconciliation({
        accountId: selectedAccountId,
        statementEndDate: startForm.statementEndDate,
        closingBalance: parseFloat(startForm.closingBalance),
      });
      if (res.success) {
        toast.success("Reconciliation started");
        setShowStartForm(false);
        setStartForm({ statementEndDate: "", closingBalance: "" });
        fetchReconData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal memulai rekonsiliasi");
    }
  };

  const handleProcess = async (reconId) => {
    setLoading(true);
    try {
      const res = await processReconciliation(reconId);
      if (res.success) setProcessData(res);
    } catch (err) {
      toast.error("Gagal memuat process data");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMatch = async (reconciliationId, transactionId) => {
    try {
      const res = await toggleMatch({ reconciliationId, transactionId });
      if (res.success && processData) {
        // Update local state
        setProcessData((prev) => ({
          ...prev,
          matchedBalance: res.matchedBalance,
          unmatchedCount: res.unmatchedCount,
          reconciliation: { ...prev.reconciliation, difference: res.difference, matchedBalance: res.matchedBalance },
          transactions: prev.transactions.map((t) =>
            t._id === transactionId ? { ...t, isMatched: !t.isMatched } : t
          ),
        }));
      }
    } catch (err) {
      toast.error("Gagal update match status");
    }
  };

  const handleComplete = async (reconId) => {
    if (!confirm("Yakin ingin menyelesaikan rekonsiliasi?")) return;
    try {
      const res = await completeReconciliation(reconId);
      if (res.success) {
        toast.success("Reconciliation completed!");
        setProcessData(null);
        fetchReconData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menyelesaikan");
    }
  };

  const handleCancel = async (reconId) => {
    if (!confirm("Yakin ingin membatalkan rekonsiliasi?")) return;
    try {
      const res = await cancelReconciliation(reconId);
      if (res.success) {
        toast.success("Reconciliation cancelled");
        setProcessData(null);
        fetchReconData();
      }
    } catch (err) {
      toast.error("Gagal membatalkan");
    }
  };

  const handleView = async (reconId) => {
    setLoading(true);
    try {
      const res = await viewReconciliation(reconId);
      if (res.success) setViewData(res);
    } catch { toast.error("Gagal memuat detail"); }
    finally { setLoading(false); }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  // If viewing a process page
  if (processData) {
    const { reconciliation: recon, account, transactions, matchedBalance, unmatchedCount } = processData;
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <button onClick={() => setProcessData(null)} className="text-pink-600 hover:underline text-sm mb-4">&larr; Back</button>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Reconciliation in Progress</h1>
        <p className="text-gray-500 text-sm mb-6">Account: <strong>{account?.accountName}</strong></p>

        {/* Balance Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500">Starting Balance</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(recon.startingBalance)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500">Closing Balance</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(recon.closingBalance)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500">Matched Balance</p>
            <p className="text-lg font-bold text-blue-600">{formatCurrency(matchedBalance)}</p>
          </div>
          <div className={`bg-white rounded-xl p-4 border shadow-sm ${Math.abs(recon.difference) < 0.01 ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"}`}>
            <p className="text-xs text-gray-500">Difference</p>
            <p className={`text-lg font-bold ${Math.abs(recon.difference) < 0.01 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(recon.difference)}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => handleComplete(recon._id)} disabled={Math.abs(recon.difference) > 0.01}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
            Complete Reconciliation
          </button>
          <button onClick={() => handleCancel(recon._id)}
            className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm">
            Cancel
          </button>
          <span className="text-sm text-gray-400 self-center ml-2">{unmatchedCount} unmatched</span>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-center px-4 py-3 w-12">Match</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Description</th>
                  <th className="text-center px-4 py-3 font-medium">Type</th>
                  <th className="text-right px-4 py-3 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((txn) => (
                  <tr key={txn._id} className={`hover:bg-gray-50 transition ${txn.isMatched ? "bg-green-50" : ""}`}>
                    <td className="px-4 py-3 text-center">
                      <input type="checkbox" checked={txn.isMatched}
                        onChange={() => handleToggleMatch(recon._id, txn._id)}
                        className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500" />
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {new Date(txn.transactionDate).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{txn.description || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        txn.transactionType === "Deposit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>{txn.transactionType}</span>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono ${
                      txn.transactionType === "Deposit" ? "text-green-600" : "text-red-600"
                    }`}>
                      {txn.transactionType === "Withdrawal" ? "-" : "+"}{formatCurrency(txn.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // If viewing completed reconciliation detail
  if (viewData) {
    const { reconciliation: recon, account, transactions } = viewData;
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <button onClick={() => setViewData(null)} className="text-pink-600 hover:underline text-sm mb-4">&larr; Back</button>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Reconciliation Details</h1>
        <p className="text-gray-500 text-sm mb-4">Account: <strong>{account?.accountName}</strong> | Completed: {recon.reconciledOn ? new Date(recon.reconciledOn).toLocaleDateString("id-ID") : "-"}</p>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200"><p className="text-xs text-gray-500">Starting Balance</p><p className="font-bold">{formatCurrency(recon.startingBalance)}</p></div>
          <div className="bg-white rounded-xl p-4 border border-gray-200"><p className="text-xs text-gray-500">Closing Balance</p><p className="font-bold">{formatCurrency(recon.closingBalance)}</p></div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-200"><p className="text-xs text-gray-500">Matched Balance</p><p className="font-bold text-green-600">{formatCurrency(recon.matchedBalance)}</p></div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-gray-600">
              <th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Description</th>
              <th className="text-center px-4 py-3">Type</th><th className="text-right px-4 py-3">Amount</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((txn) => (
                <tr key={txn._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{new Date(txn.transactionDate).toLocaleDateString("id-ID")}</td>
                  <td className="px-4 py-3 text-gray-900">{txn.description || "-"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${txn.transactionType === "Deposit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{txn.transactionType}</span>
                  </td>
                  <td className={`px-4 py-3 text-right font-mono ${txn.transactionType === "Deposit" ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(txn.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Main reconciliation page
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Bank Reconciliation</h1>

      {/* Account selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">Select Account</label>
        <select value={selectedAccountId} onChange={(e) => { setSelectedAccountId(e.target.value); setShowStartForm(false); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-72 focus:ring-2 focus:ring-pink-500">
          <option value="">Choose an account...</option>
          {Object.entries(assetsAccounts).map(([group, accounts]) => (
            <optgroup key={group} label={group}>
              {accounts.map((a) => <option key={a._id} value={a._id}>{a.accountName}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      {selectedAccountId && loading && <div className="text-center py-12 text-gray-500">Loading...</div>}

      {selectedAccountId && !loading && reconData && (
        <div className="space-y-6">
          {/* Active reconciliation */}
          {reconData.activeReconciliation ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
              <h3 className="font-semibold text-yellow-800 mb-2">Active Reconciliation</h3>
              <p className="text-sm text-yellow-700 mb-3">
                Statement end date: {new Date(reconData.activeReconciliation.statementEndDate).toLocaleDateString("id-ID")}
                {" | "}Closing balance: {formatCurrency(reconData.activeReconciliation.closingBalance)}
              </p>
              <button onClick={() => handleProcess(reconData.activeReconciliation._id)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium">
                Continue Reconciliation
              </button>
            </div>
          ) : (
            <div>
              {!showStartForm ? (
                <button onClick={() => setShowStartForm(true)}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm font-medium">
                  Start New Reconciliation
                </button>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-5 max-w-md">
                  <h3 className="font-semibold text-gray-800 mb-4">Start New Reconciliation</h3>
                  <p className="text-xs text-gray-400 mb-3">Starting balance: {formatCurrency(reconData.startingBalance)}</p>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Statement End Date *</label>
                      <input type="date" value={startForm.statementEndDate}
                        onChange={(e) => setStartForm({ ...startForm, statementEndDate: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Closing Balance *</label>
                      <input type="number" step="0.01" value={startForm.closingBalance}
                        onChange={(e) => setStartForm({ ...startForm, closingBalance: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-pink-500" />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={handleStart} className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm font-medium">Start</button>
                      <button onClick={() => setShowStartForm(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm">Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* History */}
          {reconData.history && reconData.history.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-800 mb-3">Reconciliation History</h3>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 text-gray-600">
                    <th className="text-left px-4 py-3">Statement End Date</th>
                    <th className="text-right px-4 py-3">Starting Balance</th>
                    <th className="text-right px-4 py-3">Closing Balance</th>
                    <th className="text-left px-4 py-3">Reconciled On</th>
                    <th className="text-center px-4 py-3">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-100">
                    {reconData.history.map((h) => (
                      <tr key={h._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{new Date(h.statementEndDate).toLocaleDateString("id-ID")}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(h.startingBalance)}</td>
                        <td className="px-4 py-3 text-right font-mono">{formatCurrency(h.closingBalance)}</td>
                        <td className="px-4 py-3 text-gray-500">{h.reconciledOn ? new Date(h.reconciledOn).toLocaleDateString("id-ID") : "-"}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => handleView(h._id)} className="text-blue-600 hover:underline text-xs">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
