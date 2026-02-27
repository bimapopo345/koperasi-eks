import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteExpenseAttachmentApi,
  deleteExpensePaymentProofApi,
  getAccountsByType,
  getAssetsAccounts,
  getExpenseDetailApi,
  getMembers,
  updateExpenseApi,
} from "../../api/accountingApi";
import { buildUploadUrl, expenseStatusClass, expenseStatusLabel, formatMoney, toDateInput } from "./utils";
import "./expense-common.css";
import "./expense-form.css";

function normalizeAmount(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const EDITABLE_STATUSES = [
  "uncategorized",
  "pending",
  "waiting_approval",
  "approved",
  "waiting_payment",
  "rejected",
  "paid",
];

export default function ExpenseEdit() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [memberOptions, setMemberOptions] = useState([]);
  const [expenseGroups, setExpenseGroups] = useState([]);
  const [assetGroups, setAssetGroups] = useState([]);

  const [attachments, setAttachments] = useState([]);
  const [paymentProofFiles, setPaymentProofFiles] = useState([]);

  const [existingAttachments, setExistingAttachments] = useState([]);
  const [existingPaymentProofs, setExistingPaymentProofs] = useState([]);
  const [existingStatus, setExistingStatus] = useState("uncategorized");

  const [form, setForm] = useState({
    applicantType: "staff",
    applicantMemberId: "",
    applicantName: "",
    title: "",
    dateStart: "",
    dateEnd: "",
    seller: "",
    amount: "",
    description: "",
    accountId: "",
    status: "uncategorized",
    paidByName: "",
    transferDate: "",
  });

  const [lines, setLines] = useState([{ categoryId: "", description: "", amount: "" }]);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError("");
      try {
        const [membersRes, expenseAccountsRes, assetAccountsRes, detailRes] = await Promise.all([
          getMembers("true"),
          getAccountsByType("Expenses"),
          getAssetsAccounts(),
          getExpenseDetailApi(id),
        ]);

        if (!detailRes?.success || !detailRes.data) {
          throw new Error(detailRes?.message || "Expense detail not found");
        }

        const detail = detailRes.data;
        setExistingStatus(detail.status || "uncategorized");
        setExistingAttachments(detail.attachments || []);
        setExistingPaymentProofs(detail.paymentProofs || []);

        setForm({
          applicantType: detail.applicantType || "staff",
          applicantMemberId: detail.applicantMemberId || "",
          applicantName: detail.applicantName || "",
          title: detail.title || "",
          dateStart: toDateInput(detail.dateStart),
          dateEnd: toDateInput(detail.dateEnd),
          seller: detail.seller || "",
          amount: String(detail.amount ?? ""),
          description: detail.description || "",
          accountId: detail.accountId || "",
          status: detail.status || "uncategorized",
          paidByName: detail.paidBy || "",
          transferDate: toDateInput(detail.transferDate),
        });

        const detailLines = (detail.lines || []).map((line) => ({
          categoryId: line.categoryId || "",
          description: line.description || "",
          amount: String(line.amount ?? ""),
        }));
        setLines(detailLines.length ? detailLines : [{ categoryId: "", description: "", amount: "" }]);

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
        setError(err?.response?.data?.message || err.message || "Failed to load expense edit data");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [id]);

  const totalLines = useMemo(
    () => lines.reduce((sum, line) => sum + normalizeAmount(line.amount), 0),
    [lines]
  );
  const totalAmount = normalizeAmount(form.amount);
  const isBalanced = Math.abs(totalAmount - totalLines) <= 0.01;

  const canEditStatus = existingStatus !== "paid";

  const canSubmit = useMemo(() => {
    if (loading || submitting) return false;
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
    lines,
    totalAmount,
    isBalanced,
    loading,
    submitting,
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

  const handleDeleteAttachment = async (attachmentId) => {
    const confirmed = window.confirm("Hapus attachment ini?");
    if (!confirmed) return;
    try {
      const res = await deleteExpenseAttachmentApi(attachmentId);
      if (!res?.success) throw new Error(res?.message || "Failed to delete attachment");
      setExistingAttachments((prev) => prev.filter((item) => item._id !== attachmentId));
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to delete attachment");
    }
  };

  const handleDeleteProof = async (proofId) => {
    const confirmed = window.confirm("Hapus bukti transfer ini?");
    if (!confirmed) return;
    try {
      const res = await deleteExpensePaymentProofApi(proofId);
      if (!res?.success) throw new Error(res?.message || "Failed to delete payment proof");
      setExistingPaymentProofs((prev) => prev.filter((item) => item._id !== proofId));
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to delete payment proof");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const cleanLines = lines
        .map((line) => ({
          categoryId: line.categoryId,
          description: line.description || "",
          amount: normalizeAmount(line.amount),
        }))
        .filter((line) => line.categoryId && line.amount > 0);

      if (!cleanLines.length) throw new Error("Minimal 1 line category wajib diisi.");
      if (!isBalanced) throw new Error("Total line category harus sama dengan total amount.");

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
      fd.append("account_id", form.accountId || "");
      fd.append("expense_lines", JSON.stringify(cleanLines));

      if (canEditStatus) {
        fd.append("status", form.status);
      }

      if (existingStatus === "paid") {
        if (form.transferDate) fd.append("transfer_date", form.transferDate);
        if (form.paidByName) fd.append("paid_by_name", form.paidByName);
        paymentProofFiles.forEach((file) => fd.append("payment_proofs", file));
      }

      attachments.forEach((file) => fd.append("attachments", file));

      const res = await updateExpenseApi(id, fd);
      if (!res?.success) throw new Error(res?.message || "Failed to update expense");

      navigate(`/expense/detail/${id}`);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Failed to update expense");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="exp-page">
      <div className="exp-card exp-header">
        <div>
          <h1>Edit Expense</h1>
          <div className="exp-sub">Update detail expense dan line-item categorization.</div>
        </div>
        <div className="exp-actions">
          <span className={expenseStatusClass(form.status)}>{expenseStatusLabel(form.status)}</span>
          <Link className="exp-btn-ghost" to={`/expense/detail/${id}`}>
            Back to Detail
          </Link>
        </div>
      </div>

      {error ? <div className="exp-error">{error}</div> : null}
      {loading ? <div className="exp-card exp-sub">Loading expense data...</div> : null}

      {!loading ? (
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
                      setForm((prev) => ({ ...prev, applicantType: event.target.value, applicantMemberId: "" }))
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
                      setForm((prev) => ({ ...prev, applicantType: event.target.value, applicantName: "" }))
                    }
                  />
                  Member
                </label>
              </div>
            </div>

            <div className="exp-grid-4">
              {form.applicantType === "member" ? (
                <>
                  <label className="exp-label">Member</label>
                  <select
                    className="exp-select"
                    value={form.applicantMemberId}
                    onChange={(event) => setForm((prev) => ({ ...prev, applicantMemberId: event.target.value }))}
                  >
                    <option value="">Pilih member</option>
                    {memberOptions.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.uuid})
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <label className="exp-label">Staff Name</label>
                  <input
                    className="exp-input"
                    value={form.applicantName}
                    onChange={(event) => setForm((prev) => ({ ...prev, applicantName: event.target.value }))}
                  />
                </>
              )}
            </div>

            <div className="exp-grid-4">
              <label className="exp-label">Status</label>
              <select
                className="exp-select"
                value={form.status}
                disabled={!canEditStatus}
                onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
              >
                {EDITABLE_STATUSES.map((status) => (
                  <option key={status} value={status} disabled={status === "paid" && existingStatus !== "paid"}>
                    {expenseStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>

            <div className="exp-grid-6">
              <label className="exp-label">Title</label>
              <input
                className="exp-input"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>

            <div className="exp-grid-3">
              <label className="exp-label">Date Start</label>
              <input
                type="date"
                className="exp-input"
                value={form.dateStart}
                onChange={(event) => setForm((prev) => ({ ...prev, dateStart: event.target.value }))}
              />
            </div>

            <div className="exp-grid-3">
              <label className="exp-label">Date End</label>
              <input
                type="date"
                className="exp-input"
                value={form.dateEnd}
                onChange={(event) => setForm((prev) => ({ ...prev, dateEnd: event.target.value }))}
              />
            </div>

            <div className="exp-grid-4">
              <label className="exp-label">Seller / Vendor</label>
              <input
                className="exp-input"
                value={form.seller}
                onChange={(event) => setForm((prev) => ({ ...prev, seller: event.target.value }))}
              />
            </div>

            <div className="exp-grid-4">
              <label className="exp-label">Total Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="exp-input"
                value={form.amount}
                onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
              />
            </div>

            <div className="exp-grid-4">
              <label className="exp-label">Payment Account</label>
              <select
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
              <label className="exp-label">Description</label>
              <textarea
                className="exp-textarea"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
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
              <label className="exp-label">Existing Attachments</label>
              {(existingAttachments || []).length === 0 ? (
                <div className="exp-sub">No attachments.</div>
              ) : (
                <div className="exp-file-grid">
                  {existingAttachments.map((attachment) => (
                    <div key={attachment._id} className="exp-file-card">
                      <a className="exp-link" href={buildUploadUrl("expenses", attachment.fileName)} target="_blank" rel="noreferrer">
                        {attachment.fileName}
                      </a>
                      <button type="button" className="exp-btn-danger" onClick={() => handleDeleteAttachment(attachment._id)}>
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="exp-grid-12">
              <label className="exp-label">Add New Attachments</label>
              <input
                type="file"
                multiple
                className="exp-input"
                onChange={(event) => setAttachments(Array.from(event.target.files || []))}
              />
              {attachments.length > 0 ? <div className="exp-sub">{attachments.length} file siap diupload</div> : null}
            </div>

            {existingStatus === "paid" ? (
              <>
                <div className="exp-grid-6">
                  <label className="exp-label">Paid By</label>
                  <input
                    className="exp-input"
                    value={form.paidByName}
                    onChange={(event) => setForm((prev) => ({ ...prev, paidByName: event.target.value }))}
                  />
                </div>

                <div className="exp-grid-6">
                  <label className="exp-label">Transfer Date</label>
                  <input
                    type="date"
                    className="exp-input"
                    value={form.transferDate}
                    onChange={(event) => setForm((prev) => ({ ...prev, transferDate: event.target.value }))}
                  />
                </div>

                <div className="exp-grid-12">
                  <label className="exp-label">Existing Payment Proofs</label>
                  {(existingPaymentProofs || []).length === 0 ? (
                    <div className="exp-sub">No payment proofs.</div>
                  ) : (
                    <div className="exp-file-grid">
                      {existingPaymentProofs.map((proof) => (
                        <div key={proof._id} className="exp-file-card">
                          <a
                            className="exp-link"
                            href={buildUploadUrl("expense-payment-proofs", proof.fileName)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {proof.fileName}
                          </a>
                          <button type="button" className="exp-btn-danger" onClick={() => handleDeleteProof(proof._id)}>
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="exp-grid-12">
                  <label className="exp-label">Add Payment Proofs</label>
                  <input
                    type="file"
                    multiple
                    className="exp-input"
                    onChange={(event) => setPaymentProofFiles(Array.from(event.target.files || []))}
                  />
                  {paymentProofFiles.length > 0 ? (
                    <div className="exp-sub">{paymentProofFiles.length} proof file siap diupload</div>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>

          <div className="exp-actions">
            <button type="button" className="exp-btn-ghost" onClick={() => navigate(`/expense/detail/${id}`)}>
              Cancel
            </button>
            <button type="submit" className="exp-btn" disabled={!canSubmit}>
              {submitting ? "Saving..." : "Update Expense"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
