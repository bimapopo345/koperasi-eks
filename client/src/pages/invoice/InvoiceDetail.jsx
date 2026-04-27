import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  addInvoicePayment,
  deleteInvoice,
  deleteInvoicePayment,
  getInvoice,
} from "../../api/invoiceApi.jsx";
import "./invoice.css";

const companyProfile = {
  name: "PT SAKURA MITRA INTERNASIONAL",
  address: [
    "Ruko Dalton Utara No. 05",
    "Jl. Scientia Square Selatan, Kel. Curug Sangereng,",
    "Kec. Kelapa Dua, Tangerang, Banten 15810 Indonesia",
  ],
  phone: "+622159995428",
  website: "www.sakuramitra.com",
};

const formatMoney = (amount, currency = "IDR") => {
  const locale = currency === "IDR" ? "id-ID" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "IDR" ? 0 : 2,
    maximumFractionDigits: currency === "IDR" ? 0 : 2,
  }).format(Number(amount || 0));
};

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const formatPaymentDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  });
};

const statusLabel = {
  draft: "Draft",
  sent: "Sent",
  partial: "Partial",
  paid: "Paid",
  overdue: "Overdue",
  Paid: "Paid",
  Partial: "Partial",
  Unpaid: "Unpaid",
};

function HtmlBlock({ html, empty = "Tidak ada catatan" }) {
  if (!html) return <i>{empty}</i>;
  return (
    <div className="inv-rich-text" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

export default function InvoiceDetail() {
  const navigate = useNavigate();
  const { invoiceNumber } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invoice, setInvoice] = useState(null);
  const [addingPayment, setAddingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    amount: "",
    method: "Bank",
    notes: "",
  });

  const loadInvoice = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getInvoice(invoiceNumber);
      if (!res?.success)
        throw new Error(res?.message || "Failed to load invoice");
      setInvoice(res.data);
    } catch (err) {
      setError(
        err?.response?.data?.message || err.message || "Failed to load invoice",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [invoiceNumber]);

  const projectionTotal = useMemo(
    () =>
      (invoice?.projections || []).reduce(
        (sum, projection) => sum + Number(projection.amount || 0),
        0,
      ),
    [invoice],
  );

  const submitPayment = async () => {
    try {
      const res = await addInvoicePayment(invoiceNumber, paymentForm);
      if (!res?.success)
        throw new Error(res?.message || "Failed to add payment");
      toast.success("Payment added");
      setInvoice(res.data);
      setPaymentForm({
        paymentDate: new Date().toISOString().slice(0, 10),
        amount: "",
        method: "Bank",
        notes: "",
      });
      setAddingPayment(false);
    } catch (err) {
      setError(
        err?.response?.data?.message || err.message || "Failed to add payment",
      );
    }
  };

  const removePayment = async (paymentId) => {
    if (!window.confirm("Hapus pembayaran ini?")) return;
    try {
      const res = await deleteInvoicePayment(invoiceNumber, paymentId);
      if (!res?.success)
        throw new Error(res?.message || "Failed to delete payment");
      toast.success("Payment deleted");
      setInvoice(res.data);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to delete payment",
      );
    }
  };

  const removeInvoice = async () => {
    if (!window.confirm(`Hapus invoice ${invoiceNumber}?`)) return;
    try {
      const res = await deleteInvoice(invoiceNumber);
      if (!res?.success)
        throw new Error(res?.message || "Failed to delete invoice");
      toast.success("Invoice deleted");
      navigate("/invoice");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to delete invoice",
      );
    }
  };

  return (
    <div className="inv-page inv-invoice-page">
      <div className="inv-card inv-detail-head inv-no-print">
        <div>
          <div className={`inv-status ${invoice?.status || "draft"}`}>
            {statusLabel[invoice?.status] || invoice?.status || "Draft"}
          </div>
          <h1 style={{ marginTop: 10 }}>{invoiceNumber}</h1>
          <div className="inv-sub">
            Invoice detail, projection, realization, dan print view.
          </div>
        </div>
        <div className="inv-actions">
          <button
            type="button"
            className="inv-btn-ghost"
            onClick={() => navigate("/invoice")}
          >
            Back to Invoice
          </button>
          <button
            type="button"
            className="inv-btn-ghost"
            onClick={() => navigate(`/invoice/${invoiceNumber}/edit`)}
          >
            Edit
          </button>
          <button
            type="button"
            className="inv-btn-secondary"
            onClick={() => window.print()}
          >
            Print
          </button>
          <button
            type="button"
            className="inv-btn-danger"
            onClick={removeInvoice}
          >
            Delete
          </button>
        </div>
      </div>

      {error ? <div className="inv-error inv-no-print">{error}</div> : null}
      {loading ? (
        <div className="inv-card inv-sub inv-no-print">
          Loading invoice detail...
        </div>
      ) : null}

      {!loading && invoice ? (
        <>
          <div className="inv-print-shell">
            <section className="inv-print-sheet" id="printableArea">
              <div className="inv-print-top">
                <div className="inv-print-logo">
                  <img src="/logo-samit.png" alt="SAMIT" />
                </div>
                <address className="inv-print-from">
                  <h2>INVOICE</h2>
                  <h6>From,</h6>
                  <strong>{companyProfile.name}</strong>
                  {companyProfile.address.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                  <span>{companyProfile.phone}</span>
                  <span>{companyProfile.website}</span>
                </address>
              </div>

              <hr className="inv-print-divider" />

              <div className="inv-print-bill-row">
                <address className="inv-print-to">
                  <h6>To,</h6>
                  <h4>{invoice.customerSnapshot?.name || "-"}</h4>
                  <p>{invoice.customerSnapshot?.productTitle || "-"}</p>
                  <p>
                    {invoice.customerSnapshot?.completeAddress ||
                      "Alamat belum diisi"}
                  </p>
                  <strong>{invoice.customerSnapshot?.phone || "-"}</strong>
                  <strong>{invoice.customerSnapshot?.email || "-"}</strong>
                </address>

                <table className="inv-print-meta">
                  <tbody>
                    <tr>
                      <td>Invoice Number</td>
                      <td>:</td>
                      <td>{invoice.invoiceNumber}</td>
                    </tr>
                    <tr>
                      <td>Sales Code</td>
                      <td>:</td>
                      <td>{invoice.salesCode || "-"}</td>
                    </tr>
                    <tr>
                      <td>Invoice Date</td>
                      <td>:</td>
                      <td>{formatDate(invoice.issuedDate)}</td>
                    </tr>
                    <tr>
                      <td>Payment Due</td>
                      <td>:</td>
                      <td>{formatDate(invoice.dueDate)}</td>
                    </tr>
                    <tr>
                      <td>Amount Due</td>
                      <td>:</td>
                      <td>
                        {formatMoney(invoice.amountDue, invoice.currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="inv-table-wrap inv-print-items-wrap">
                <table className="inv-print-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th className="center">Quantity</th>
                      <th className="right">Price</th>
                      <th className="right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice.items || []).map((item) => (
                      <tr key={item._id}>
                        <td>
                          <strong>{item.title}</strong>
                          <div>{item.description || "-"}</div>
                        </td>
                        <td className="center">{item.quantity}</td>
                        <td className="right">
                          {formatMoney(item.price, invoice.currency)}
                        </td>
                        <td className="right">
                          {formatMoney(item.amount, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="inv-print-summary-row">
                <table className="inv-print-summary">
                  <tbody>
                    <tr>
                      <td>Subtotal</td>
                      <td>:</td>
                      <td>{formatMoney(invoice.subtotal, invoice.currency)}</td>
                    </tr>
                    {(invoice.discounts || []).map((discount) => (
                      <tr className="discount" key={discount._id}>
                        <td>{discount.label}</td>
                        <td>:</td>
                        <td>
                          <i>
                            {discount.type === "percentage"
                              ? `${discount.value}%`
                              : formatMoney(discount.value, invoice.currency)}
                          </i>
                        </td>
                      </tr>
                    ))}
                    <tr className="total">
                      <td>Total</td>
                      <td>:</td>
                      <td>{formatMoney(invoice.total, invoice.currency)}</td>
                    </tr>
                    {(invoice.payments || []).map((payment) => (
                      <tr className="payment" key={payment._id}>
                        <td>
                          Payment on {formatPaymentDate(payment.paymentDate)} by{" "}
                          {payment.method}
                        </td>
                        <td>:</td>
                        <td>
                          ({formatMoney(payment.amount, invoice.currency)})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <hr className="inv-print-divider" />

              <div className="inv-print-amount-due">
                <span>Amount due</span>
                <strong
                  className={Number(invoice.amountDue) < 0 ? "negative" : ""}
                >
                  {Number(invoice.amountDue) < 0
                    ? `(${formatMoney(Math.abs(invoice.amountDue), invoice.currency)})`
                    : formatMoney(invoice.amountDue, invoice.currency)}
                </strong>
              </div>

              <div className="inv-print-projection">
                <h3>Payment Projection</h3>
                <table className="inv-print-table compact">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Due Date</th>
                      <th className="right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice.projections || []).length ? (
                      (invoice.projections || []).map((projection) => (
                        <tr key={projection._id}>
                          <td>{projection.description}</td>
                          <td>{formatDate(projection.estimateDate)}</td>
                          <td className="right">
                            {formatMoney(projection.amount, invoice.currency)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="center">
                          No payment projection
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="2">Total Projection</td>
                      <td className="right">
                        {formatMoney(projectionTotal, invoice.currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="inv-print-terms inv-print-page-break">
                <h3>Notes/Terms</h3>
                <HtmlBlock html={invoice.terms} />
              </div>
            </section>
          </div>

          <div className="inv-grid inv-no-print">
            <div className="inv-grid-6">
              <div className="inv-projection-card">
                <div className="inv-projection-head blue">
                  Payment Projection
                </div>
                <div className="inv-table-wrap">
                  <table className="inv-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Due Date</th>
                        <th className="right">Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(invoice.projections || []).length ? (
                        (invoice.projections || []).map((projection, index) => (
                          <tr key={projection._id}>
                            <td>
                              <span className="inv-row-badge blue">
                                {index + 1}
                              </span>
                              {projection.description}
                            </td>
                            <td>{formatDate(projection.estimateDate)}</td>
                            <td className="right">
                              {formatMoney(projection.amount, invoice.currency)}
                            </td>
                            <td>
                              <span
                                className={`inv-status ${String(projection.status || "Unpaid").toLowerCase()}`}
                              >
                                {statusLabel[projection.status] ||
                                  projection.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="center">
                            No payment projection
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="2">Total Projection</td>
                        <td className="right">
                          {formatMoney(projectionTotal, invoice.currency)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <div className="inv-grid-6">
              <div className="inv-projection-card">
                <div className="inv-projection-head pink">Realization</div>
                <div className="inv-table-wrap">
                  <table className="inv-table">
                    <thead>
                      <tr>
                        <th>Payment Date</th>
                        <th className="right">Amount</th>
                        <th>Method</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(invoice.payments || []).length ? (
                        (invoice.payments || []).map((payment, index) => (
                          <tr key={payment._id}>
                            <td>
                              <span className="inv-row-badge pink">
                                {index + 1}
                              </span>
                              <strong>{formatDate(payment.paymentDate)}</strong>
                              {payment.notes ? (
                                <div className="inv-customer-meta">
                                  {payment.notes}
                                </div>
                              ) : null}
                            </td>
                            <td className="right">
                              {formatMoney(payment.amount, invoice.currency)}
                            </td>
                            <td>{payment.method || "-"}</td>
                            <td>
                              <button
                                type="button"
                                className="inv-mini-danger"
                                onClick={() => removePayment(payment._id)}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="center">
                            No payment recorded
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td>Total Received</td>
                        <td className="right">
                          {formatMoney(invoice.totalPaid, invoice.currency)}
                        </td>
                        <td colSpan="2" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div className="inv-card inv-no-print">
            <div
              className="inv-inline-actions"
              style={{ justifyContent: "space-between", marginBottom: 10 }}
            >
              <div className="inv-section-title" style={{ marginBottom: 0 }}>
                Record Payment
              </div>
              <button
                type="button"
                className="inv-btn-secondary"
                onClick={() => setAddingPayment((prev) => !prev)}
              >
                {addingPayment ? "Cancel" : "New Payment"}
              </button>
            </div>

            {addingPayment ? (
              <div className="inv-line-card">
                <div className="inv-grid">
                  <div className="inv-grid-3">
                    <label className="inv-label">Payment Date</label>
                    <input
                      className="inv-input"
                      type="date"
                      value={paymentForm.paymentDate}
                      onChange={(event) =>
                        setPaymentForm((prev) => ({
                          ...prev,
                          paymentDate: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="inv-grid-3">
                    <label className="inv-label">Amount</label>
                    <input
                      className="inv-input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentForm.amount}
                      onChange={(event) =>
                        setPaymentForm((prev) => ({
                          ...prev,
                          amount: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="inv-grid-3">
                    <label className="inv-label">Method</label>
                    <select
                      className="inv-select"
                      value={paymentForm.method}
                      onChange={(event) =>
                        setPaymentForm((prev) => ({
                          ...prev,
                          method: event.target.value,
                        }))
                      }
                    >
                      <option value="Bank">Bank</option>
                      <option value="Cash">Cash</option>
                      <option value="Transfer">Transfer</option>
                      <option value="QRIS">QRIS</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="inv-grid-12">
                    <label className="inv-label">Notes</label>
                    <textarea
                      className="inv-textarea"
                      value={paymentForm.notes}
                      onChange={(event) =>
                        setPaymentForm((prev) => ({
                          ...prev,
                          notes: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="inv-inline-actions" style={{ marginTop: 12 }}>
                  <button
                    type="button"
                    className="inv-btn"
                    onClick={submitPayment}
                  >
                    Save Payment
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="inv-grid inv-no-print">
            <div className="inv-grid-8">
              <div className="inv-card">
                <div className="inv-section-title">Note/Term of Services</div>
                <HtmlBlock html={invoice.terms} />
              </div>
            </div>
            <div className="inv-grid-4">
              <div className="inv-card">
                <div className="inv-section-title">Personal Note</div>
                <div className="inv-muted">{invoice.notes || "-"}</div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
