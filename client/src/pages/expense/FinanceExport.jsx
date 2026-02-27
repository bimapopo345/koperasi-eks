import { useEffect, useMemo, useState } from "react";
import {
  exportFinanceExcelApi,
  exportFinancePdfApi,
  getFinanceExportData,
} from "../../api/accountingApi";
import { formatMoney, triggerBlobDownload } from "./utils";
import "./expense-common.css";
import "./finance-export.css";

function initialRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: now.toISOString().slice(0, 10),
    account_id: "",
  };
}

export default function FinanceExport() {
  const [filters, setFilters] = useState(initialRange());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  const loadData = async (query = filters) => {
    setLoading(true);
    setError("");
    try {
      const res = await getFinanceExportData(query);
      if (!res?.success) throw new Error(res?.message || "Failed to load finance export data");
      setPayload(res.data);
      if (res.data?.filters) {
        setFilters((prev) => ({
          ...prev,
          ...res.data.filters,
        }));
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to load finance export data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const previewRows = useMemo(() => (payload?.rows || []).slice(0, 200), [payload]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    await loadData(filters);
    setSubmitting(false);
  };

  const handleExportExcel = async () => {
    try {
      const res = await exportFinanceExcelApi(filters);
      triggerBlobDownload(res, `finance_transactions_${Date.now()}.xls`);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to export Excel");
    }
  };

  const handleExportPdf = async () => {
    try {
      const res = await exportFinancePdfApi(filters);
      triggerBlobDownload(res, `finance_transactions_${Date.now()}.pdf`);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to export PDF");
    }
  };

  return (
    <div className="exp-page">
      <div className="exp-card exp-header">
        <div>
          <h1>Export Transactions</h1>
          <div className="exp-sub">Filter transaksi accounting lalu export ke Excel atau PDF.</div>
        </div>
        <div className="exp-actions">
          <button type="button" className="exp-btn-secondary" onClick={handleExportExcel}>
            Export Excel
          </button>
          <button type="button" className="exp-btn" onClick={handleExportPdf}>
            Export PDF
          </button>
        </div>
      </div>

      <form className="exp-card exp-finance-filter" onSubmit={handleSubmit}>
        <div>
          <label className="exp-label" htmlFor="start-date">
            Start Date
          </label>
          <input
            id="start-date"
            type="date"
            className="exp-input"
            value={filters.start_date}
            onChange={(event) => setFilters((prev) => ({ ...prev, start_date: event.target.value }))}
          />
        </div>

        <div>
          <label className="exp-label" htmlFor="end-date">
            End Date
          </label>
          <input
            id="end-date"
            type="date"
            className="exp-input"
            value={filters.end_date}
            onChange={(event) => setFilters((prev) => ({ ...prev, end_date: event.target.value }))}
          />
        </div>

        <div>
          <label className="exp-label" htmlFor="account-id">
            Account
          </label>
          <select
            id="account-id"
            className="exp-select"
            value={filters.account_id}
            onChange={(event) => setFilters((prev) => ({ ...prev, account_id: event.target.value }))}
          >
            <option value="">All Accounts</option>
            {(payload?.accounts || []).map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.code || "-"})
              </option>
            ))}
          </select>
        </div>

        <div className="exp-finance-submit">
          <button type="submit" className="exp-btn" disabled={submitting || loading}>
            {submitting ? "Filtering..." : "Apply Filter"}
          </button>
        </div>
      </form>

      {error ? <div className="exp-error">{error}</div> : null}

      {payload ? (
        <div className="exp-grid">
          <div className="exp-grid-4 exp-card">
            <div className="exp-label">Rows</div>
            <div className="exp-finance-stat">{payload.summary?.rows || 0}</div>
          </div>
          <div className="exp-grid-4 exp-card">
            <div className="exp-label">Total Deposit</div>
            <div className="exp-finance-stat">{formatMoney(payload.summary?.total_deposit || 0)}</div>
          </div>
          <div className="exp-grid-4 exp-card">
            <div className="exp-label">Total Withdrawal</div>
            <div className="exp-finance-stat">{formatMoney(payload.summary?.total_withdrawal || 0)}</div>
          </div>
        </div>
      ) : null}

      <div className="exp-card">
        <div className="exp-detail-section-title">Preview ({previewRows.length} rows)</div>
        {loading ? (
          <div className="exp-sub">Loading transactions...</div>
        ) : previewRows.length === 0 ? (
          <div className="exp-empty">No transactions found for current filters.</div>
        ) : (
          <div className="exp-finance-table-wrap">
            <table className="exp-finance-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Account</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th className="num">Amount</th>
                  <th>Customer</th>
                  <th>Vendor</th>
                  <th>Reviewed</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, index) => (
                  <tr key={`${row.transaction_id}-${index}`}>
                    <td>{row.date}</td>
                    <td>{row.description || "-"}</td>
                    <td>{row.account_name || "-"}</td>
                    <td>{row.category_name || "-"}</td>
                    <td>{row.transaction_type || "-"}</td>
                    <td className="num">{formatMoney(row.amount)}</td>
                    <td>{row.customer_name || "-"}</td>
                    <td>{row.vendor_name || "-"}</td>
                    <td>{row.reviewed || "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
