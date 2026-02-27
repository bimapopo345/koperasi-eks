import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getExpenseAdminDashboard } from "../../api/accountingApi";
import { formatMoney, expenseStatusClass, expenseStatusLabel } from "./utils";
import "./expense-common.css";
import "./expense-admin.css";

function StatCard({ label, value }) {
  return (
    <div className="exp-card exp-admin-stat">
      <div className="exp-label">{label}</div>
      <div className="exp-admin-stat-value">{formatMoney(value)}</div>
    </div>
  );
}

function ExpenseMiniCard({ expense, onClick }) {
  return (
    <button type="button" className="exp-mini" onClick={onClick}>
      <div className="exp-mini-top">
        <span className={expenseStatusClass(expense.status)}>{expenseStatusLabel(expense.status)}</span>
      </div>
      <div className="exp-mini-title">{expense.title || "-"}</div>
      <div className="exp-mini-meta">{expense.applicantName || "-"}</div>
      <div className="exp-mini-total">{formatMoney(expense.amount)}</div>
    </button>
  );
}

export default function ExpenseAdmin() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await getExpenseAdminDashboard({ year });
        if (!res?.success) throw new Error(res?.message || "Failed to load expense dashboard");
        setPayload(res.data);
      } catch (err) {
        setError(err?.response?.data?.message || err.message || "Failed to load expense dashboard");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [year]);

  const monthBars = useMemo(() => {
    const labels = payload?.monthLabels || [];
    const values = payload?.monthlyData || [];
    const max = Math.max(...values, 1);
    return labels.map((label, index) => ({
      label,
      value: Number(values[index] || 0),
      ratio: Number(values[index] || 0) / max,
    }));
  }, [payload]);

  const yearOptions = useMemo(() => {
    const options = [];
    for (let y = currentYear + 1; y >= currentYear - 4; y -= 1) options.push(y);
    return options;
  }, [currentYear]);

  return (
    <div className="exp-page">
      <div className="exp-card exp-header">
        <div>
          <h1>Expenses Management</h1>
          <div className="exp-sub">Ringkasan pengeluaran tahunan dan approval pipeline</div>
        </div>
        <div className="exp-actions">
          <select className="exp-select" value={year} onChange={(event) => setYear(Number(event.target.value))}>
            {yearOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <Link className="exp-btn" to="/expense/new">
            Create Expense
          </Link>
        </div>
      </div>

      {error ? <div className="exp-error">{error}</div> : null}
      {loading ? <div className="exp-card exp-sub">Loading expense dashboard...</div> : null}

      {!loading && payload ? (
        <>
          <div className="exp-grid">
            <div className="exp-grid-3"><StatCard label="Total Semua Expense" value={payload.totalAll} /></div>
            <div className="exp-grid-3"><StatCard label={`Disetujui ${year}`} value={payload.totalThisYear} /></div>
            <div className="exp-grid-3"><StatCard label="Menunggu Proses" value={payload.totalWaiting} /></div>
            <div className="exp-grid-3"><StatCard label="Rejected" value={payload.totalRejected} /></div>
          </div>

          <div className="exp-grid">
            <div className="exp-grid-8">
              <div className="exp-card">
                <div className="exp-admin-section-title">Monthly Trend ({year})</div>
                <div className="exp-bars">
                  {monthBars.map((item) => (
                    <div key={item.label} className="exp-bar-col" title={`${item.label}: ${formatMoney(item.value)}`}>
                      <div className="exp-bar-track">
                        <div className="exp-bar-fill" style={{ height: `${Math.max(item.ratio * 100, 3)}%` }} />
                      </div>
                      <div className="exp-bar-label">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="exp-grid-4">
              <div className="exp-card">
                <div className="exp-admin-section-title">Top Applicants (This Month)</div>
                {(payload.topApplicants || []).length === 0 ? (
                  <div className="exp-empty">Belum ada data applicant bulan ini.</div>
                ) : (
                  <div className="exp-admin-list">
                    {(payload.topApplicants || []).map((item, index) => (
                      <div key={`${item._id || item.applicantName || index}`} className="exp-admin-list-item">
                        <div>
                          <div className="exp-admin-name">{item._id || "Unknown"}</div>
                          <div className="exp-sub">{item.count || 0} reports</div>
                        </div>
                        <div className="exp-admin-money">{formatMoney(item.total)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="exp-grid">
            <div className="exp-grid-4">
              <div className="exp-card">
                <div className="exp-admin-section-title">Latest Uncategorized</div>
                <div className="exp-mini-wrap">
                  {(payload.latestPending || []).map((expense) => (
                    <ExpenseMiniCard
                      key={expense._id}
                      expense={expense}
                      onClick={() => navigate(`/expense/detail/${expense._id}`)}
                    />
                  ))}
                </div>
                {(payload.latestPending || []).length === 0 ? <div className="exp-empty">No uncategorized item.</div> : null}
              </div>
            </div>

            <div className="exp-grid-4">
              <div className="exp-card">
                <div className="exp-admin-section-title">Pending / Waiting</div>
                <div className="exp-mini-wrap">
                  {(payload.pendingExpenses || []).map((expense) => (
                    <ExpenseMiniCard
                      key={expense._id}
                      expense={expense}
                      onClick={() => navigate(`/expense/detail/${expense._id}`)}
                    />
                  ))}
                </div>
                {(payload.pendingExpenses || []).length === 0 ? <div className="exp-empty">No pending expense.</div> : null}
              </div>
            </div>

            <div className="exp-grid-4">
              <div className="exp-card">
                <div className="exp-admin-section-title">Approved / Paid</div>
                <div className="exp-mini-wrap">
                  {(payload.approvedExpenses || []).map((expense) => (
                    <ExpenseMiniCard
                      key={expense._id}
                      expense={expense}
                      onClick={() => navigate(`/expense/detail/${expense._id}`)}
                    />
                  ))}
                </div>
                {(payload.approvedExpenses || []).length === 0 ? <div className="exp-empty">No approved expense.</div> : null}
              </div>
            </div>
          </div>

          <div className="exp-card">
            <div className="exp-admin-section-title">Category Breakdown</div>
            {(payload.categoryBreakdown || []).length === 0 ? (
              <div className="exp-empty">Belum ada kategori expense yang tercatat.</div>
            ) : (
              <div className="exp-admin-list">
                {payload.categoryBreakdown.map((item) => (
                  <div key={String(item.categoryId)} className="exp-admin-list-item">
                    <div className="exp-admin-name">{item.categoryName}</div>
                    <div className="exp-admin-money">{formatMoney(item.total)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
