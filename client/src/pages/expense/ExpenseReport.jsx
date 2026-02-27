import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { deleteExpenseApi, getExpenseReportData } from "../../api/accountingApi";
import {
  buildUploadUrl,
  expenseStatusClass,
  expenseStatusLabel,
  formatMoney,
  toDateInput,
} from "./utils";
import "./expense-common.css";
import "./expense-report.css";

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "uncategorized", label: "Uncategorized" },
  { value: "pending", label: "Pending" },
  { value: "waiting_approval", label: "Waiting Approval" },
  { value: "approved", label: "Approved" },
  { value: "waiting_payment", label: "Waiting Payment" },
  { value: "paid", label: "Paid" },
  { value: "rejected", label: "Rejected" },
];

export default function ExpenseReport() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  const status = searchParams.get("status") || "";
  const search = searchParams.get("search") || "";
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getExpenseReportData({ status, search });
        if (!res?.success) throw new Error(res?.message || "Failed to load expense report");
        setPayload(res.data);
      } catch (err) {
        setError(err?.response?.data?.message || err.message || "Failed to load expense report");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [status, search]);

  const items = useMemo(() => payload?.items || [], [payload]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const next = new URLSearchParams(searchParams);
    if (searchInput.trim()) next.set("search", searchInput.trim());
    else next.delete("search");
    setSearchParams(next);
  };

  const setStatusFilter = (nextStatus) => {
    const next = new URLSearchParams(searchParams);
    if (nextStatus) next.set("status", nextStatus);
    else next.delete("status");
    setSearchParams(next);
  };

  const handleDelete = async (event, expenseId, title) => {
    event.stopPropagation();
    const confirmed = window.confirm(`Hapus expense \"${title || "-"}\"?`);
    if (!confirmed) return;

    try {
      const res = await deleteExpenseApi(expenseId);
      if (!res?.success) throw new Error(res?.message || "Failed to delete expense");
      const refreshed = await getExpenseReportData({ status, search });
      if (refreshed?.success) setPayload(refreshed.data);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to delete expense");
    }
  };

  return (
    <div className="exp-page">
      <div className="exp-card exp-header">
        <div>
          <h1>Expense Report</h1>
          <div className="exp-sub">Filter status, cari report, dan buka detail expense.</div>
        </div>
        <div className="exp-actions">
          <button type="button" className="exp-btn" onClick={() => navigate("/expense/new")}>
            Create Expense
          </button>
        </div>
      </div>

      <div className="exp-card">
        <form className="exp-report-search" onSubmit={handleSearchSubmit}>
          <input
            className="exp-input"
            placeholder="Search by title, applicant, uuid, seller..."
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
          <button type="submit" className="exp-btn-secondary">
            Search
          </button>
          <button
            type="button"
            className="exp-btn-ghost"
            onClick={() => {
              setSearchInput("");
              const next = new URLSearchParams(searchParams);
              next.delete("search");
              setSearchParams(next);
            }}
          >
            Clear
          </button>
        </form>

        <div className="exp-status-tabs">
          {STATUS_FILTERS.map((item) => (
            <button
              key={item.value || "all"}
              type="button"
              className={`exp-tab ${status === item.value ? "active" : ""}`}
              onClick={() => setStatusFilter(item.value)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="exp-error">{error}</div> : null}
      {loading ? <div className="exp-card exp-sub">Loading expense report...</div> : null}

      {!loading && items.length === 0 ? <div className="exp-empty">Belum ada data expense.</div> : null}

      {!loading
        ? items.map((item) => {
          const attachmentUrl = item?.firstAttachment?.fileName
            ? buildUploadUrl("expenses", item.firstAttachment.fileName)
            : "";

          return (
            <article
              key={item._id}
              className="exp-card exp-report-card"
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/expense/detail/${item._id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(`/expense/detail/${item._id}`);
                }
              }}
            >
              <div className="exp-report-head">
                <div>
                  <div className="exp-report-code">ER-{String(item._id).slice(-6).toUpperCase()}</div>
                  <div className="exp-report-title">{item.title || "-"}</div>
                </div>
                <div className="exp-report-head-right">
                  <span className={expenseStatusClass(item.status)}>{expenseStatusLabel(item.status)}</span>
                  <button
                    type="button"
                    className="exp-btn-danger"
                    onClick={(event) => handleDelete(event, item._id, item.title)}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="exp-report-grid">
                <div>
                  <span className="exp-label">Applicant</span>
                  <div className="exp-report-value">{item.applicantName || "-"}</div>
                </div>
                <div>
                  <span className="exp-label">Duration</span>
                  <div className="exp-report-value">
                    {toDateInput(item.dateStart) || "-"} - {toDateInput(item.dateEnd) || "-"}
                  </div>
                </div>
                <div>
                  <span className="exp-label">Line Items</span>
                  <div className="exp-report-value">{item.productionCount || 0}</div>
                </div>
                <div>
                  <span className="exp-label">Total</span>
                  <div className="exp-report-value money">{formatMoney(item.amount)}</div>
                </div>
              </div>

              {attachmentUrl ? (
                <div className="exp-report-attachment">
                  <img src={attachmentUrl} alt={item.title || "Expense attachment"} loading="lazy" />
                  {(item.attachmentCount || 0) > 1 ? (
                    <span className="exp-report-attachment-count">+{item.attachmentCount - 1}</span>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })
        : null}
    </div>
  );
}
