import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createExpenseApi,
  getAccountsByType,
  getAssetsAccounts,
  getMembers,
} from "../../api/accountingApi";
import { formatMoney } from "./utils";
import "./expense-common.css";
import "./expense-form.css";

function normalizeAmount(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function ExpenseCreate() {
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);

  const [loadingRefs, setLoadingRefs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [memberOptions, setMemberOptions] = useState([]);
  const [expenseGroups, setExpenseGroups] = useState([]);
  const [assetGroups, setAssetGroups] = useState([]);

  const [attachments, setAttachments] = useState([]);

  const [form, setForm] = useState({
    applicantType: "staff",
    applicantMemberId: "",
    applicantName: "",
    title: "",
    dateStart: today,
    dateEnd: today,
    seller: "",
    amount: "",
    description: "",
    accountId: "",
  });

  const [lines, setLines] = useState([
    { categoryId: "", description: "", amount: "" },
  ]);

  useEffect(() => {
    const loadRefs = async () => {
      setLoadingRefs(true);
      setError("");
      try {
        const [membersRes, expenseAccountsRes, assetAccountsRes] = await Promise.all([
          getMembers("true"),
          getAccountsByType("Expenses"),
          getAssetsAccounts(),
        ]);

        if (membersRes?.success) {
          setMemberOptions(
            (membersRes.data || []).map((member) => ({
              id: member._id,
              name: member.name || "-",
              uuid: member.uuid || "",
            }))
          );
        }

        if (expenseAccountsRes?.success) {
          const grouped = Object.entries(expenseAccountsRes.accountsBySubtype || {}).map(([submenu, payload]) => ({
            label: submenu,
            accounts: payload?.accounts || [],
          }));
          setExpenseGroups(grouped);
        }

        if (assetAccountsRes?.success) {
          const grouped = Object.entries(assetAccountsRes.data || {}).map(([submenu, accounts]) => ({
            label: submenu,
            accounts: accounts || [],
          }));
          setAssetGroups(grouped);
        }
      } catch (err) {
        setError(err?.response?.data?.message || err.message || "Failed to load expense references");
      } finally {
        setLoadingRefs(false);
      }
    };

    loadRefs();
  }, []);

  const totalLines = useMemo(
    () => lines.reduce((sum, line) => sum + normalizeAmount(line.amount), 0),
    [lines]
  );

  const totalAmount = normalizeAmount(form.amount);
  const isBalanced = Math.abs(totalAmount - totalLines) <= 0.01;

  const canSubmit = useMemo(() => {
    if (submitting || loadingRefs) return false;
    if (!form.title.trim()) return false;
    if (!form.dateStart || !form.dateEnd) return false;
    if (totalAmount <= 0) return false;
    if (!isBalanced) return false;

    const hasLine = lines.some((line) => line.categoryId && normalizeAmount(line.amount) > 0);
    if (!hasLine) return false;

    if (form.applicantType === "member") return !!form.applicantMemberId;
    return !!form.applicantName.trim();
  }, [
    form.title,
    form.dateStart,
    form.dateEnd,
    form.amount,
    form.applicantType,
    form.applicantMemberId,
    form.applicantName,
    isBalanced,
    lines,
    submitting,
    loadingRefs,
    totalAmount,
  ]);

  const setLineValue = (index, key, value) => {
    setLines((prev) => prev.map((line, idx) => (idx === index ? { ...line, [key]: value } : line)));
  };

  const addLine = () => {
    setLines((prev) => [...prev, { categoryId: "", description: "", amount: "" }]);
  };

  const removeLine = (index) => {
    setLines((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setInfo("");

    try {
      const cleanLines = lines
        .map((line) => ({
          categoryId: line.categoryId,
          description: line.description || "",
          amount: normalizeAmount(line.amount),
        }))
        .filter((line) => line.categoryId && line.amount > 0);

      if (!cleanLines.length) {
        throw new Error("Minimal 1 line category wajib diisi.");
      }

      if (!isBalanced) {
        throw new Error("Total line category harus sama dengan total amount.");
      }

      const fd = new FormData();
      fd.append("applicant_type", form.applicantType);
      if (form.applicantType === "member") {
        fd.append("applicant_member_id", form.applicantMemberId);
      } else {
        fd.append("applicant_name", form.applicantName.trim());
      }

      fd.append("title", form.title.trim());
      fd.append("date_start", form.dateStart);
      fd.append("date_end", form.dateEnd || form.dateStart);
      fd.append("seller", form.seller.trim());
      fd.append("amount", String(totalAmount));
      fd.append("description", form.description.trim());
      if (form.accountId) fd.append("account_id", form.accountId);
      fd.append("expense_lines", JSON.stringify(cleanLines));

      attachments.forEach((file) => {
        fd.append("attachments", file);
      });

      const res = await createExpenseApi(fd);
      if (!res?.success) throw new Error(res?.message || "Failed to create expense");

      const createdId = res?.data?.id;
      if (createdId) {
        navigate(`/expense/detail/${createdId}`);
      } else {
        setInfo("Expense berhasil dibuat.");
        navigate("/expense/report");
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to create expense");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="exp-page">
      <div className="exp-card exp-header">
        <div>
          <h1>Create Expense</h1>
          <div className="exp-sub">Buat expense baru dengan line-item kategorisasi.</div>
        </div>
        <div className="exp-actions">
          <button type="button" className="exp-btn-ghost" onClick={() => navigate("/expense/report")}>
            Back to Report
          </button>
        </div>
      </div>

      {error ? <div className="exp-error">{error}</div> : null}
      {info ? <div className="exp-info">{info}</div> : null}
      {loadingRefs ? <div className="exp-card exp-sub">Loading references...</div> : null}

      {!loadingRefs ? (
        <form className="exp-card" onSubmit={handleSubmit}>
          <div className="exp-grid">
            <div className="exp-grid-4">
              <label className="exp-label">Applicant Type</label>
              <div className="exp-radio-wrap">
                <label>
                  <input
                    type="radio"
                    name="applicantType"
                    value="staff"
                    checked={form.applicantType === "staff"}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        applicantType: event.target.value,
                        applicantMemberId: "",
                      }))
                    }
                  />
                  Staff
                </label>
                <label>
                  <input
                    type="radio"
                    name="applicantType"
                    value="member"
                    checked={form.applicantType === "member"}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        applicantType: event.target.value,
                        applicantName: "",
                      }))
                    }
                  />
                  Member
                </label>
              </div>
            </div>

            <div className="exp-grid-8">
              {form.applicantType === "member" ? (
                <>
                  <label className="exp-label" htmlFor="member-id">
                    Member
                  </label>
                  <select
                    id="member-id"
                    className="exp-select"
                    value={form.applicantMemberId}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        applicantMemberId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Pilih Member</option>
                    {memberOptions.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.uuid})
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <label className="exp-label" htmlFor="staff-name">
                    Staff Name
                  </label>
                  <input
                    id="staff-name"
                    className="exp-input"
                    value={form.applicantName}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        applicantName: event.target.value,
                      }))
                    }
                    placeholder="Nama staff pengaju"
                  />
                </>
              )}
            </div>

            <div className="exp-grid-6">
              <label className="exp-label" htmlFor="expense-title">
                Title
              </label>
              <input
                id="expense-title"
                className="exp-input"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Contoh: Transport meeting supplier"
              />
            </div>

            <div className="exp-grid-3">
              <label className="exp-label" htmlFor="expense-start">
                Date Start
              </label>
              <input
                id="expense-start"
                type="date"
                className="exp-input"
                value={form.dateStart}
                onChange={(event) => setForm((prev) => ({ ...prev, dateStart: event.target.value }))}
              />
            </div>

            <div className="exp-grid-3">
              <label className="exp-label" htmlFor="expense-end">
                Date End
              </label>
              <input
                id="expense-end"
                type="date"
                className="exp-input"
                value={form.dateEnd}
                onChange={(event) => setForm((prev) => ({ ...prev, dateEnd: event.target.value }))}
              />
            </div>

            <div className="exp-grid-4">
              <label className="exp-label" htmlFor="expense-seller">
                Seller / Vendor
              </label>
              <input
                id="expense-seller"
                className="exp-input"
                value={form.seller}
                onChange={(event) => setForm((prev) => ({ ...prev, seller: event.target.value }))}
              />
            </div>

            <div className="exp-grid-4">
              <label className="exp-label" htmlFor="expense-amount">
                Total Amount
              </label>
              <input
                id="expense-amount"
                type="number"
                min="0"
                step="0.01"
                className="exp-input"
                value={form.amount}
                onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
              />
            </div>

            <div className="exp-grid-4">
              <label className="exp-label" htmlFor="expense-account">
                Payment Account (Optional)
              </label>
              <select
                id="expense-account"
                className="exp-select"
                value={form.accountId}
                onChange={(event) => setForm((prev) => ({ ...prev, accountId: event.target.value }))}
              >
                <option value="">Pilih akun pembayaran</option>
                {assetGroups.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.accounts.map((account) => (
                      <option key={account._id} value={account._id}>
                        {account.accountName} ({account.accountCode || "-"})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="exp-grid-12">
              <label className="exp-label" htmlFor="expense-notes">
                Description
              </label>
              <textarea
                id="expense-notes"
                className="exp-textarea"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Catatan tambahan"
              />
            </div>

            <div className="exp-grid-12">
              <label className="exp-label">Expense Lines</label>
              <div className="exp-lines-wrap">
                <table className="exp-lines-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => (
                      <tr key={`line-${index}`}>
                        <td>
                          <select
                            className="exp-select"
                            value={line.categoryId}
                            onChange={(event) => setLineValue(index, "categoryId", event.target.value)}
                          >
                            <option value="">Pilih category account</option>
                            {expenseGroups.map((group) => (
                              <optgroup key={group.label} label={group.label}>
                                {group.accounts.map((account) => (
                                  <option key={account._id} value={account._id}>
                                    {account.accountName} ({account.accountCode || "-"})
                                  </option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            className="exp-input"
                            value={line.description}
                            onChange={(event) => setLineValue(index, "description", event.target.value)}
                            placeholder="Opsional"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="exp-input"
                            value={line.amount}
                            onChange={(event) => setLineValue(index, "amount", event.target.value)}
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="exp-btn-danger"
                            onClick={() => removeLine(index)}
                            disabled={lines.length === 1}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <button type="button" className="exp-btn-secondary" onClick={addLine}>
                  + Add Line
                </button>
              </div>

              <div className={`exp-balance-box ${isBalanced ? "ok" : "warn"}`}>
                <div>Total Expense: {formatMoney(totalAmount)}</div>
                <div>Total Categorized: {formatMoney(totalLines)}</div>
                <div>Difference: {formatMoney(totalAmount - totalLines)}</div>
              </div>
            </div>

            <div className="exp-grid-12">
              <label className="exp-label" htmlFor="expense-attachments">
                Attachments
              </label>
              <input
                id="expense-attachments"
                type="file"
                multiple
                className="exp-input"
                onChange={(event) => setAttachments(Array.from(event.target.files || []))}
              />
              {attachments.length > 0 ? (
                <div className="exp-sub">{attachments.length} file siap diupload</div>
              ) : null}
            </div>
          </div>

          <div className="exp-actions">
            <button type="button" className="exp-btn-ghost" onClick={() => navigate("/expense/report")}>
              Cancel
            </button>
            <button type="submit" className="exp-btn" disabled={!canSubmit}>
              {submitting ? "Saving..." : "Create Expense"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
