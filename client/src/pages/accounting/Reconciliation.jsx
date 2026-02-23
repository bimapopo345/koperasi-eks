import { useState, useEffect, useCallback, useRef } from "react";
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

  // Custom account dropdown
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const accountDropdownRef = useRef(null);

  // Process view: selections, search, sort
  const [selectedTxns, setSelectedTxns] = useState(new Set());
  const [processSearch, setProcessSearch] = useState("");
  const [processSort, setProcessSort] = useState("date_desc");
  const [editingClosingBalance, setEditingClosingBalance] = useState(null);

  // Success modal
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const allAssetsAccounts = Object.values(assetsAccounts).flat();
  const selectedAccount = allAssetsAccounts.find((a) => a._id === selectedAccountId);

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
    } catch {
      toast.error("Failed to load reconciliation data");
    } finally {
      setLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);
  useEffect(() => { fetchReconData(); }, [fetchReconData]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (accountDropdownRef.current && !accountDropdownRef.current.contains(e.target)) setShowAccountDropdown(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleStart = async () => {
    if (!startForm.statementEndDate || !startForm.closingBalance) return toast.error("All fields are required");
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
      toast.error(err.response?.data?.message || "Failed to start reconciliation");
    }
  };

  const handleProcess = async (reconId) => {
    setLoading(true);
    try {
      const res = await processReconciliation(reconId);
      if (res.success) {
        setProcessData(res);
        setEditingClosingBalance(res.reconciliation?.closingBalance);
      }
    } catch { toast.error("Failed to load process data"); }
    finally { setLoading(false); }
  };

  const handleToggleMatch = async (reconciliationId, transactionId) => {
    try {
      const res = await toggleMatch({ reconciliationId, transactionId });
      if (res.success && processData) {
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
    } catch { toast.error("Failed to update match status"); }
  };

  const handleComplete = async (reconId) => {
    if (!confirm("Are you sure you want to complete this reconciliation?")) return;
    try {
      const res = await completeReconciliation(reconId);
      if (res.success) {
        setShowSuccessModal(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to complete reconciliation");
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    setProcessData(null);
    fetchReconData();
  };

  const handleCancel = async (reconId) => {
    if (!confirm("Are you sure you want to cancel this reconciliation?")) return;
    try {
      const res = await cancelReconciliation(reconId);
      if (res.success) {
        toast.success("Reconciliation cancelled");
        setProcessData(null);
        fetchReconData();
      }
    } catch { toast.error("Failed to cancel"); }
  };

  const handleRemoveItems = async (reconId) => {
    if (selectedTxns.size === 0) return;
    try {
      const res = await removeReconciliationItems({
        reconciliationId: reconId,
        transactionIds: Array.from(selectedTxns),
      });
      if (res.success) {
        toast.success("Items removed");
        setSelectedTxns(new Set());
        handleProcess(reconId);
      }
    } catch { toast.error("Failed to remove items"); }
  };

  const handleUpdateClosingBalance = async (reconId) => {
    try {
      const res = await updateClosingBalance({
        reconciliationId: reconId,
        closingBalance: parseFloat(editingClosingBalance),
      });
      if (res.success && processData) {
        setProcessData((prev) => ({
          ...prev,
          reconciliation: { ...prev.reconciliation, closingBalance: parseFloat(editingClosingBalance), difference: res.difference },
        }));
        toast.success("Closing balance updated");
      }
    } catch { toast.error("Failed to update"); }
  };

  const handleView = async (reconId) => {
    setLoading(true);
    try {
      const res = await viewReconciliation(reconId);
      if (res.success) setViewData(res);
    } catch { toast.error("Failed to load details"); }
    finally { setLoading(false); }
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return `Rp ${num.toLocaleString("id-ID")}`;
  };

  // ==================== PROCESS VIEW ====================
  if (processData) {
    const { reconciliation: recon, account, transactions, matchedBalance, unmatchedCount } = processData;

    // Filter & sort process transactions
    const filteredTxns = (transactions || [])
      .filter((txn) => {
        if (!processSearch) return true;
        const q = processSearch.toLowerCase();
        return (txn.description || "").toLowerCase().includes(q) || String(txn.amount).includes(q);
      })
      .sort((a, b) => {
        switch (processSort) {
          case "date_asc": return new Date(a.transactionDate) - new Date(b.transactionDate);
          case "date_desc": return new Date(b.transactionDate) - new Date(a.transactionDate);
          case "amount_asc": return (a.amount || 0) - (b.amount || 0);
          case "amount_desc": return (b.amount || 0) - (a.amount || 0);
          default: return 0;
        }
      });

    const toggleSelectAll = () => {
      if (selectedTxns.size === filteredTxns.length) setSelectedTxns(new Set());
      else setSelectedTxns(new Set(filteredTxns.map((t) => t._id)));
    };

    const toggleTxnSelect = (id) => {
      const next = new Set(selectedTxns);
      if (next.has(id)) next.delete(id); else next.add(id);
      setSelectedTxns(next);
    };

    // Running balance calculation
    let runningBalance = parseFloat(recon.startingBalance) || 0;

    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Title bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
          <div>
            <button onClick={() => setProcessData(null)}
              className="inline-flex items-center gap-1.5 text-sm text-pink-600 hover:text-pink-800 font-medium mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Back to Reconciliation
            </button>
            <h1 className="text-xl font-bold text-gray-900">Reconciliation Process</h1>
            <p className="text-sm text-gray-500 mt-0.5">Account: <strong>{account?.accountName}</strong></p>
          </div>
          <button onClick={() => handleCancel(recon._id)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium transition">
            Cancel Reconciliation
          </button>
        </div>

        {/* Stats Strip */}
        <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 items-center">
            <div className="text-center">
              <p className="text-[10px] font-bold text-pink-500 uppercase tracking-wider mb-1">Unmatched</p>
              <p className="text-2xl font-bold text-gray-900">{unmatchedCount || 0}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-pink-500 uppercase tracking-wider mb-1">Closing Balance</p>
              <input type="number" step="0.01" value={editingClosingBalance ?? ""}
                onChange={(e) => setEditingClosingBalance(e.target.value)}
                onBlur={() => handleUpdateClosingBalance(recon._id)}
                className="w-full max-w-[140px] mx-auto text-center border border-pink-300 rounded-lg px-2 py-1.5 text-sm font-mono font-bold focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none bg-white" />
            </div>
            <div className="text-center hidden sm:block">
              <p className="text-2xl font-bold text-gray-400">=</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-pink-500 uppercase tracking-wider mb-1">Matched Balance</p>
              <p className="text-lg font-bold text-gray-900 font-mono">{formatCurrency(matchedBalance)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-bold text-pink-500 uppercase tracking-wider mb-1">Difference</p>
              <p className={`text-lg font-bold font-mono ${Math.abs(recon.difference || 0) < 0.01 ? "text-emerald-600" : "text-red-600"}`}>
                {formatCurrency(recon.difference)}
              </p>
            </div>
            <div className="text-center">
              <button onClick={() => handleComplete(recon._id)}
                disabled={Math.abs(recon.difference || 0) > 0.01}
                className="px-5 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm font-medium transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                End Reconciliation
              </button>
            </div>
          </div>
        </div>

        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <input type="checkbox" checked={selectedTxns.size === filteredTxns.length && filteredTxns.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 text-pink-600 rounded border-gray-300 focus:ring-pink-500" />
            <span className="text-sm text-gray-500">{selectedTxns.size} selected</span>
            {selectedTxns.size > 0 && (
              <button onClick={() => handleRemoveItems(recon._id)}
                className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-xs font-medium transition">
                Remove Selected
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <select value={processSort} onChange={(e) => setProcessSort(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-600 focus:ring-2 focus:ring-pink-500 outline-none">
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="amount_desc">Highest amount</option>
              <option value="amount_asc">Lowest amount</option>
            </select>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={processSearch} onChange={(e) => setProcessSearch(e.target.value)}
                placeholder="Search..."
                className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-44 focus:ring-2 focus:ring-pink-500 outline-none" />
            </div>
          </div>
        </div>

        {/* Process Table */}
        <div className="bg-white rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={selectedTxns.size === filteredTxns.length && filteredTxns.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-pink-600 rounded border-gray-300 focus:ring-pink-500" />
                  </th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Deposit</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Withdrawal</th>
                  <th className="text-right px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Match</th>
                </tr>
              </thead>
              <tbody>
                {filteredTxns.map((txn) => {
                  const isDeposit = txn.transactionType === "Deposit";
                  const amt = parseFloat(txn.amount) || 0;
                  runningBalance += isDeposit ? amt : -amt;

                  return (
                    <tr key={txn._id}
                      className={`border-b border-gray-50 hover:bg-pink-50/20 transition ${
                        txn.isMatched ? "bg-emerald-50/50 shadow-[inset_3px_0_0_theme(colors.pink.500)]" : ""
                      }`}>
                      <td className="px-4 py-3.5">
                        <input type="checkbox" checked={selectedTxns.has(txn._id)}
                          onChange={() => toggleTxnSelect(txn._id)}
                          className="w-4 h-4 text-pink-600 rounded border-gray-300 focus:ring-pink-500" />
                      </td>
                      <td className="px-3 py-3.5 text-gray-600 whitespace-nowrap text-xs">
                        {new Date(txn.transactionDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-3 py-3.5">
                        <div className="text-gray-900 font-medium">{txn.description || "-"}</div>
                        {txn.isMatched && (
                          <span className="inline-block mt-0.5 text-[10px] font-semibold text-pink-600 bg-pink-100 px-1.5 py-0.5 rounded">Matched</span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono text-sm text-emerald-600">
                        {isDeposit ? formatCurrency(amt) : ""}
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono text-sm text-red-600">
                        {!isDeposit ? formatCurrency(amt) : ""}
                      </td>
                      <td className="px-3 py-3.5 text-right font-mono text-sm text-gray-700">
                        {formatCurrency(runningBalance)}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <button onClick={() => handleToggleMatch(recon._id, txn._id)}
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition ${
                            txn.isMatched
                              ? "border-pink-600 bg-pink-600 text-white"
                              : "border-gray-300 text-transparent hover:border-pink-400"
                          }`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm text-center p-8">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Your books are now reconciled!</h3>
              <p className="text-sm text-gray-500 mb-6">The reconciliation has been completed successfully.</p>
              <button onClick={handleCloseSuccess}
                className="px-6 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm font-medium transition shadow-sm">
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== VIEW DETAIL ====================
  if (viewData) {
    const { reconciliation: recon, account, transactions } = viewData;
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <button onClick={() => setViewData(null)}
          className="inline-flex items-center gap-1.5 text-sm text-pink-600 hover:text-pink-800 font-medium mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          Back to Reconciliation
        </button>

        <h1 className="text-xl font-bold text-gray-900 mb-1">Reconciliation Details</h1>
        <p className="text-sm text-gray-500 mb-6">
          Account: <strong>{account?.accountName}</strong> | Completed: {recon.reconciledOn ? new Date(recon.reconciledOn).toLocaleDateString("id-ID") : "-"}
        </p>

        {/* Balance Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Starting Balance</p>
            <p className="text-xl font-bold text-gray-900 font-mono">{formatCurrency(recon.startingBalance)}</p>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Closing Balance</p>
            <p className="text-xl font-bold text-gray-900 font-mono">{formatCurrency(recon.closingBalance)}</p>
          </div>
          <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-100 shadow-sm">
            <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider mb-1">Matched Balance</p>
            <p className="text-xl font-bold text-emerald-700 font-mono">{formatCurrency(recon.matchedBalance)}</p>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(transactions || []).map((txn) => (
                  <tr key={txn._id} className="border-b border-gray-50 hover:bg-pink-50/20 transition">
                    <td className="px-4 py-3.5 text-gray-600 text-xs">{new Date(txn.transactionDate).toLocaleDateString("id-ID")}</td>
                    <td className="px-4 py-3.5 text-gray-900 font-medium">{txn.description || "-"}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        txn.transactionType === "Deposit" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                      }`}>{txn.transactionType}</span>
                    </td>
                    <td className={`px-4 py-3.5 text-right font-mono font-semibold ${
                      txn.transactionType === "Deposit" ? "text-emerald-600" : "text-red-600"
                    }`}>{formatCurrency(txn.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ==================== MAIN VIEW ====================
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Bank Reconciliation</h1>

      {/* Top Row: Account Dropdown + Status */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Custom Account Dropdown */}
        <div className="relative flex-1" ref={accountDropdownRef}>
          <button onClick={() => setShowAccountDropdown(!showAccountDropdown)}
            className="w-full sm:w-80 flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-3.5 shadow-sm hover:border-pink-300 transition text-left">
            <div>
              <div className="text-sm font-semibold text-gray-900">
                {selectedAccount ? selectedAccount.accountName : "Select an account"}
              </div>
              {selectedAccount && (
                <div className="text-xs text-gray-500 mt-0.5">{formatCurrency(selectedAccount.balance)}</div>
              )}
            </div>
            <svg className={`w-5 h-5 text-gray-400 transition ${showAccountDropdown ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAccountDropdown && (
            <div className="absolute top-full left-0 mt-2 w-full sm:w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-30 py-2 max-h-80 overflow-y-auto">
              {Object.entries(assetsAccounts).map(([group, accounts]) => (
                <div key={group}>
                  <div className="px-5 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{group}</div>
                  {accounts.map((a) => (
                    <button key={a._id}
                      onClick={() => { setSelectedAccountId(a._id); setShowAccountDropdown(false); setShowStartForm(false); }}
                      className={`w-full text-left px-5 py-2.5 text-sm hover:bg-pink-50 transition flex justify-between ${
                        selectedAccountId === a._id ? "text-pink-700 font-semibold bg-pink-50/50" : "text-gray-700"
                      }`}>
                      <span>{a.accountName}</span>
                      <span className="text-xs text-gray-400 font-mono">{formatCurrency(a.balance)}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recon Status Pill */}
        {selectedAccountId && reconData && (
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
              reconData.activeReconciliation
                ? "bg-pink-100 text-pink-700"
                : reconData.history?.length > 0
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-600"
            }`}>
              {reconData.activeReconciliation ? "In Progress" : reconData.history?.length > 0 ? "Reconciled" : "Not Reconciled"}
            </span>
          </div>
        )}
      </div>

      {selectedAccountId && loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
        </div>
      )}

      {selectedAccountId && !loading && reconData && (
        <div className="space-y-6">
          {/* Active Reconciliation Card */}
          {reconData.activeReconciliation ? (
            <div className="bg-white rounded-xl border border-pink-200 shadow-sm p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center shrink-0">
                  <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 text-lg">Reconciliation in progress</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Statement end date: <strong>{new Date(reconData.activeReconciliation.statementEndDate).toLocaleDateString("id-ID")}</strong>
                    {" | "}Closing balance: <strong>{formatCurrency(reconData.activeReconciliation.closingBalance)}</strong>
                  </p>
                  <button onClick={() => handleProcess(reconData.activeReconciliation._id)}
                    className="mt-3 px-5 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm font-medium transition shadow-sm">
                    Continue Reconciling
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Start Form or Button */
            <div>
              {!showStartForm ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="block text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5">Starting Balance</label>
                      <div className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-mono bg-gray-50 text-gray-600">
                        {formatCurrency(reconData.startingBalance)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5">Statement End Date <span className="text-red-500">*</span></label>
                      <input type="date" value={startForm.statementEndDate}
                        onChange={(e) => setStartForm({ ...startForm, statementEndDate: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5">Closing Balance <span className="text-red-500">*</span></label>
                      <input type="number" step="0.01" value={startForm.closingBalance}
                        onChange={(e) => setStartForm({ ...startForm, closingBalance: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none"
                        placeholder="0.00" />
                    </div>
                    <button onClick={handleStart}
                      className="px-5 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-sm font-medium transition shadow-sm h-[42px]">
                      Start Reconciliation
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* History Table */}
          {reconData.history && reconData.history.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wider">Reconciliation History</h3>
              <div className="bg-white rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.06)] border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statement End Date</th>
                        <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reconciled On</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Starting Balance</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Closing Balance</th>
                        <th className="text-center px-5 py-3 w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {reconData.history.map((h) => (
                        <tr key={h._id} className="border-b border-gray-50 hover:bg-pink-50/20 transition">
                          <td className="px-5 py-3.5 text-gray-700">{new Date(h.statementEndDate).toLocaleDateString("id-ID")}</td>
                          <td className="px-5 py-3.5 text-gray-500">{h.reconciledOn ? new Date(h.reconciledOn).toLocaleDateString("id-ID") : "-"}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-gray-700">{formatCurrency(h.startingBalance)}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-gray-700">{formatCurrency(h.closingBalance)}</td>
                          <td className="px-5 py-3.5 text-center">
                            <button onClick={() => handleView(h._id)}
                              className="w-8 h-8 rounded-full bg-pink-50 text-pink-600 hover:bg-pink-100 flex items-center justify-center transition mx-auto">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Empty state for no history and no active */}
          {!reconData.activeReconciliation && (!reconData.history || reconData.history.length === 0) && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-1">No reconciliation history</h3>
              <p className="text-sm text-gray-500">Start your first reconciliation by filling out the form above.</p>
            </div>
          )}
        </div>
      )}

      {/* No account selected state */}
      {!selectedAccountId && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Select an account to begin</h3>
          <p className="text-sm text-gray-500">Choose a bank or asset account from the dropdown above to start reconciling.</p>
        </div>
      )}
    </div>
  );
}
