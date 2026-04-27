import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { getMembers } from "../../api/accountingApi.jsx";
import {
  createInvoice,
  getInvoice,
  getInvoiceMeta,
  updateInvoice,
} from "../../api/invoiceApi.jsx";
import { getTosList } from "../../api/tosApi.jsx";
import "./invoice.css";

const formatMoney = (amount, currency = "IDR") => {
  const locale = currency === "IDR" ? "id-ID" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "IDR" ? 0 : 2,
    maximumFractionDigits: currency === "IDR" ? 0 : 2,
  }).format(Number(amount || 0));
};

const normalizeNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const toDateInput = (value) => {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
};

const emptyItem = () => ({ title: "", description: "", quantity: 1, price: 0 });
const emptyDiscount = () => ({ label: "", type: "fixed", value: 0 });
const emptyProjection = (date = "") => ({
  description: "",
  estimateDate: date,
  amount: 0,
});

export default function InvoiceForm() {
  const navigate = useNavigate();
  const { invoiceNumber } = useParams();
  const isEdit = Boolean(invoiceNumber);
  const today = new Date().toISOString().slice(0, 10);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [members, setMembers] = useState([]);
  const [tosTemplates, setTosTemplates] = useState([]);
  const [currencies, setCurrencies] = useState([
    "IDR",
    "JPY",
    "USD",
    "AUD",
    "EUR",
    "GBP",
  ]);
  const [invoiceNumberLocked, setInvoiceNumberLocked] = useState(false);
  const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState(
    invoiceNumber || "",
  );
  const [form, setForm] = useState({
    invoiceNumber: "",
    memberId: "",
    salesCode: "",
    issuedDate: today,
    dueDate: today,
    currency: "IDR",
    exchangeRate: 1,
    notes: "",
    terms: "",
    tosId: "",
    termsTitle: "",
  });
  const [items, setItems] = useState([emptyItem()]);
  const [discounts, setDiscounts] = useState([]);
  const [projections, setProjections] = useState([emptyProjection(today)]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [membersRes, metaRes, invoiceRes, tosRes] = await Promise.all([
          getMembers(),
          getInvoiceMeta({ issuedDate: today }),
          isEdit ? getInvoice(invoiceNumber) : Promise.resolve(null),
          getTosList({ filter: "active" }),
        ]);

        if (membersRes?.success) {
          setMembers(
            [...(membersRes.data || [])].sort((a, b) =>
              String(a.name || "").localeCompare(String(b.name || "")),
            ),
          );
        }
        if (metaRes?.success) {
          setCurrencies(metaRes.data?.currencies || currencies);
        }
        if (tosRes?.success) {
          setTosTemplates(tosRes.data?.tos || []);
        }

        if (isEdit) {
          if (!invoiceRes?.success)
            throw new Error(invoiceRes?.message || "Failed to load invoice");
          const invoice = invoiceRes.data;
          setOriginalInvoiceNumber(invoice.invoiceNumber);
          setForm({
            invoiceNumber: invoice.invoiceNumber || "",
            memberId: invoice.memberId || "",
            salesCode: invoice.salesCode || "",
            issuedDate: toDateInput(invoice.issuedDate),
            dueDate: toDateInput(invoice.dueDate),
            currency: invoice.currency || "IDR",
            exchangeRate: invoice.exchangeRate || 1,
            notes: invoice.notes || "",
            terms: invoice.terms || "",
            tosId: invoice.tosId || "",
            termsTitle: invoice.termsTitle || "",
          });
          setItems(
            (invoice.items || []).length
              ? invoice.items.map((item) => ({
                  title: item.title || "",
                  description: item.description || "",
                  quantity: item.quantity || 1,
                  price: item.price || 0,
                }))
              : [emptyItem()],
          );
          setDiscounts(
            (invoice.discounts || []).map((discount) => ({
              label: discount.label || "",
              type: discount.type || "fixed",
              value:
                discount.type === "percentage"
                  ? discount.value || 0
                  : discount.amount || discount.value || 0,
            })),
          );
          setProjections(
            (invoice.projections || []).length
              ? invoice.projections.map((projection) => ({
                  description: projection.description || "",
                  estimateDate: toDateInput(projection.estimateDate),
                  amount: projection.amount || 0,
                }))
              : [emptyProjection(toDateInput(invoice.dueDate))],
          );
        } else {
          setForm((prev) => ({
            ...prev,
            invoiceNumber:
              metaRes?.data?.nextInvoiceNumber || prev.invoiceNumber,
          }));
        }
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err.message ||
            "Failed to load form references",
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [invoiceNumber, isEdit, today]);

  useEffect(() => {
    if (isEdit || invoiceNumberLocked || !form.issuedDate) return;

    let ignore = false;
    getInvoiceMeta({ issuedDate: form.issuedDate })
      .then((res) => {
        if (!ignore && res?.success) {
          setForm((prev) => ({
            ...prev,
            invoiceNumber: res.data?.nextInvoiceNumber || prev.invoiceNumber,
          }));
        }
      })
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [form.issuedDate, invoiceNumberLocked, isEdit]);

  const selectedMember = useMemo(
    () =>
      members.find((member) => String(member._id) === String(form.memberId)) ||
      null,
    [members, form.memberId],
  );

  const subtotal = useMemo(
    () =>
      items.reduce(
        (sum, item) =>
          sum + normalizeNumber(item.quantity) * normalizeNumber(item.price),
        0,
      ),
    [items],
  );

  const normalizedDiscounts = useMemo(
    () =>
      discounts.map((discount) => {
        const value = normalizeNumber(discount.value);
        const amount =
          discount.type === "percentage" ? (subtotal * value) / 100 : value;
        return {
          ...discount,
          amount,
        };
      }),
    [discounts, subtotal],
  );

  const discountTotal = useMemo(
    () =>
      normalizedDiscounts.reduce(
        (sum, discount) => sum + normalizeNumber(discount.amount),
        0,
      ),
    [normalizedDiscounts],
  );

  const total = Math.max(subtotal - discountTotal, 0);

  const setItemValue = (index, key, value) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [key]: value } : item,
      ),
    );
  };

  const setDiscountValue = (index, key, value) => {
    setDiscounts((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [key]: value } : item,
      ),
    );
  };

  const setProjectionValue = (index, key, value) => {
    setProjections((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [key]: value } : item,
      ),
    );
  };

  const buildPayload = () => ({
    invoiceNumber: form.invoiceNumber,
    memberId: form.memberId,
    salesCode: form.salesCode,
    issuedDate: form.issuedDate,
    dueDate: form.dueDate,
    currency: form.currency,
    exchangeRate: normalizeNumber(form.exchangeRate) || 1,
    items: items.map((item) => ({
      title: item.title,
      description: item.description,
      quantity: normalizeNumber(item.quantity),
      price: normalizeNumber(item.price),
    })),
    discounts: discounts
      .map((discount) => ({
        label: discount.label,
        type: discount.type,
        value: normalizeNumber(discount.value),
      }))
      .filter((discount) => discount.label),
    projections: projections
      .map((projection, index) => ({
        description: projection.description || `Cicilan ${index + 1}`,
        estimateDate: projection.estimateDate,
        amount: normalizeNumber(projection.amount),
      }))
      .filter((projection) => projection.estimateDate && projection.amount > 0),
    notes: form.notes,
    terms: form.terms,
    tosId: form.tosId,
    termsTitle: form.termsTitle,
  });

  const submitForm = async (statusTarget) => {
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        ...buildPayload(),
        status: statusTarget,
      };

      if (!payload.memberId) {
        throw new Error("Customer anggota wajib dipilih.");
      }
      if (!payload.items.some((item) => item.title && item.quantity > 0)) {
        throw new Error("Minimal 1 item invoice wajib diisi.");
      }

      const response = isEdit
        ? await updateInvoice(originalInvoiceNumber, payload)
        : await createInvoice(payload);

      if (!response?.success) {
        throw new Error(response?.message || "Failed to save invoice");
      }

      toast.success(isEdit ? "Invoice updated" : "Invoice created");
      navigate(
        `/invoice/${response.data?.invoiceNumber || payload.invoiceNumber}`,
      );
    } catch (err) {
      setError(
        err?.response?.data?.message || err.message || "Failed to save invoice",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="inv-page">
      <div className="inv-card inv-header">
        <div>
          <h1>
            {isEdit ? `Edit Invoice ${originalInvoiceNumber}` : "New Invoice"}
          </h1>
          <div className="inv-sub">
            Bentuk invoice koperasi yang mengikuti alur invoice di samitbank.
          </div>
        </div>
        <div className="inv-actions">
          <button
            type="button"
            className="inv-btn-ghost"
            onClick={() =>
              navigate(
                isEdit ? `/invoice/${originalInvoiceNumber}` : "/invoice",
              )
            }
          >
            Back
          </button>
        </div>
      </div>

      {error ? <div className="inv-error">{error}</div> : null}
      {loading ? (
        <div className="inv-card inv-sub">Loading invoice form...</div>
      ) : null}

      {!loading ? (
        <div className="inv-grid">
          <div className="inv-grid-8">
            <div className="inv-card">
              <div className="inv-section-title">Customer</div>
              <div className="inv-grid">
                <div className="inv-grid-12">
                  <label className="inv-label">Anggota</label>
                  <select
                    className="inv-select"
                    value={form.memberId}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        memberId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select Customer</option>
                    {members.map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.name} {member.uuid ? `• ${member.uuid}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {selectedMember ? (
                <div className="inv-customer-card" style={{ marginTop: 12 }}>
                  <div className="inv-customer-name">{selectedMember.name}</div>
                  <div className="inv-customer-meta">
                    {selectedMember.uuid || "-"}
                  </div>
                  <div className="inv-customer-meta">
                    {selectedMember.phone || "-"} •{" "}
                    {selectedMember.email || "-"}
                  </div>
                  <div className="inv-customer-meta">
                    {selectedMember.completeAddress || "Alamat belum diisi"}
                  </div>
                  <div className="inv-customer-meta">
                    Produk: {selectedMember.product?.title || "-"}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="inv-card">
              <div className="inv-section-title">Invoice Information</div>
              <div className="inv-grid">
                <div className="inv-grid-6">
                  <label className="inv-label">Invoice Number</label>
                  <input
                    className="inv-input"
                    value={form.invoiceNumber}
                    onChange={(event) => {
                      setInvoiceNumberLocked(true);
                      setForm((prev) => ({
                        ...prev,
                        invoiceNumber: event.target.value.toUpperCase(),
                      }));
                    }}
                  />
                </div>
                <div className="inv-grid-6">
                  <label className="inv-label">Sales Code</label>
                  <input
                    className="inv-input"
                    value={form.salesCode}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        salesCode: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="inv-grid-4">
                  <label className="inv-label">Issued Date</label>
                  <input
                    className="inv-input"
                    type="date"
                    value={form.issuedDate}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        issuedDate: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="inv-grid-4">
                  <label className="inv-label">Due Date</label>
                  <input
                    className="inv-input"
                    type="date"
                    value={form.dueDate}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        dueDate: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="inv-grid-2">
                  <label className="inv-label">Currency</label>
                  <select
                    className="inv-select"
                    value={form.currency}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        currency: event.target.value,
                      }))
                    }
                  >
                    {currencies.map((currency) => (
                      <option key={currency} value={currency}>
                        {currency}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="inv-grid-2">
                  <label className="inv-label">Exchange Rate</label>
                  <input
                    className="inv-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.exchangeRate}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        exchangeRate: event.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="inv-card">
              <div
                className="inv-inline-actions"
                style={{ justifyContent: "space-between", marginBottom: 10 }}
              >
                <div className="inv-section-title" style={{ marginBottom: 0 }}>
                  Items
                </div>
                <button
                  type="button"
                  className="inv-btn-secondary"
                  onClick={() => setItems((prev) => [...prev, emptyItem()])}
                >
                  Add Item
                </button>
              </div>
              <div className="inv-page">
                {items.map((item, index) => (
                  <div key={`item-${index}`} className="inv-line-card">
                    <div className="inv-line-top">
                      <div
                        className="inv-section-title"
                        style={{ marginBottom: 0 }}
                      >
                        Item {index + 1}
                      </div>
                      {items.length > 1 ? (
                        <button
                          type="button"
                          className="inv-remove"
                          onClick={() =>
                            setItems((prev) =>
                              prev.filter((_, idx) => idx !== index),
                            )
                          }
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <div className="inv-grid">
                      <div className="inv-grid-6">
                        <label className="inv-label">Title</label>
                        <input
                          className="inv-input"
                          value={item.title}
                          onChange={(event) =>
                            setItemValue(index, "title", event.target.value)
                          }
                        />
                      </div>
                      <div className="inv-grid-2">
                        <label className="inv-label">Quantity</label>
                        <input
                          className="inv-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.quantity}
                          onChange={(event) =>
                            setItemValue(index, "quantity", event.target.value)
                          }
                        />
                      </div>
                      <div className="inv-grid-4">
                        <label className="inv-label">Price</label>
                        <input
                          className="inv-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.price}
                          onChange={(event) =>
                            setItemValue(index, "price", event.target.value)
                          }
                        />
                      </div>
                      <div className="inv-grid-12">
                        <label className="inv-label">Description</label>
                        <textarea
                          className="inv-textarea"
                          value={item.description}
                          onChange={(event) =>
                            setItemValue(
                              index,
                              "description",
                              event.target.value,
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="inv-card">
              <div
                className="inv-inline-actions"
                style={{ justifyContent: "space-between", marginBottom: 10 }}
              >
                <div className="inv-section-title" style={{ marginBottom: 0 }}>
                  Discounts
                </div>
                <button
                  type="button"
                  className="inv-btn-secondary"
                  onClick={() =>
                    setDiscounts((prev) => [...prev, emptyDiscount()])
                  }
                >
                  Add Discount
                </button>
              </div>
              {!discounts.length ? (
                <div className="inv-empty">Belum ada discount.</div>
              ) : null}
              <div className="inv-page">
                {discounts.map((discount, index) => (
                  <div key={`discount-${index}`} className="inv-line-card">
                    <div className="inv-line-top">
                      <div
                        className="inv-section-title"
                        style={{ marginBottom: 0 }}
                      >
                        Discount {index + 1}
                      </div>
                      <button
                        type="button"
                        className="inv-remove"
                        onClick={() =>
                          setDiscounts((prev) =>
                            prev.filter((_, idx) => idx !== index),
                          )
                        }
                      >
                        Remove
                      </button>
                    </div>
                    <div className="inv-grid">
                      <div className="inv-grid-6">
                        <label className="inv-label">Label</label>
                        <input
                          className="inv-input"
                          value={discount.label}
                          onChange={(event) =>
                            setDiscountValue(index, "label", event.target.value)
                          }
                        />
                      </div>
                      <div className="inv-grid-3">
                        <label className="inv-label">Type</label>
                        <select
                          className="inv-select"
                          value={discount.type}
                          onChange={(event) =>
                            setDiscountValue(index, "type", event.target.value)
                          }
                        >
                          <option value="fixed">Fixed</option>
                          <option value="percentage">Percentage</option>
                        </select>
                      </div>
                      <div className="inv-grid-3">
                        <label className="inv-label">
                          {discount.type === "percentage"
                            ? "Percent"
                            : "Amount"}
                        </label>
                        <input
                          className="inv-input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={discount.value}
                          onChange={(event) =>
                            setDiscountValue(index, "value", event.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="inv-card">
              <div
                className="inv-inline-actions"
                style={{ justifyContent: "space-between", marginBottom: 10 }}
              >
                <div className="inv-section-title" style={{ marginBottom: 0 }}>
                  Payment Projection
                </div>
                <button
                  type="button"
                  className="inv-btn-secondary"
                  onClick={() =>
                    setProjections((prev) => [
                      ...prev,
                      emptyProjection(form.dueDate),
                    ])
                  }
                >
                  Add Projection
                </button>
              </div>
              <div className="inv-page">
                {projections.map((projection, index) => (
                  <div key={`projection-${index}`} className="inv-line-card">
                    <div className="inv-line-top">
                      <div
                        className="inv-section-title"
                        style={{ marginBottom: 0 }}
                      >
                        Projection {index + 1}
                      </div>
                      {projections.length > 1 ? (
                        <button
                          type="button"
                          className="inv-remove"
                          onClick={() =>
                            setProjections((prev) =>
                              prev.filter((_, idx) => idx !== index),
                            )
                          }
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <div className="inv-grid">
                      <div className="inv-grid-6">
                        <label className="inv-label">Description</label>
                        <input
                          className="inv-input"
                          value={projection.description}
                          onChange={(event) =>
                            setProjectionValue(
                              index,
                              "description",
                              event.target.value,
                            )
                          }
                          placeholder={`Cicilan ${index + 1}`}
                        />
                      </div>
                      <div className="inv-grid-3">
                        <label className="inv-label">Estimate Date</label>
                        <input
                          className="inv-input"
                          type="date"
                          value={projection.estimateDate}
                          onChange={(event) =>
                            setProjectionValue(
                              index,
                              "estimateDate",
                              event.target.value,
                            )
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
                          value={projection.amount}
                          onChange={(event) =>
                            setProjectionValue(
                              index,
                              "amount",
                              event.target.value,
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="inv-card">
              <div className="inv-section-title">Notes & Terms</div>
              <div className="inv-grid">
                <div className="inv-grid-6">
                  <label className="inv-label">Notes</label>
                  <textarea
                    className="inv-textarea"
                    value={form.notes}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        notes: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="inv-grid-6">
                  <label className="inv-label">Term of Services Template</label>
                  <select
                    className="inv-select"
                    value={form.tosId}
                    onChange={(event) => {
                      const selected = tosTemplates.find(
                        (item) => item._id === event.target.value,
                      );
                      setForm((prev) => ({
                        ...prev,
                        tosId: selected?._id || "",
                        termsTitle: selected?.title || "",
                        terms: selected?.content || prev.terms,
                      }));
                    }}
                  >
                    <option value="">Select ToS Templates</option>
                    {tosTemplates.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                  <label className="inv-label" style={{ marginTop: 12 }}>
                    Note/Term of Services
                  </label>
                  <textarea
                    className="inv-textarea inv-tos-editor"
                    value={form.terms}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        terms: event.target.value,
                        tosId: "",
                        termsTitle: "",
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="inv-grid-4">
            <div className="inv-summary-box">
              <div className="inv-section-title">Summary</div>
              <div className="inv-summary-row">
                <span>Subtotal</span>
                <span>{formatMoney(subtotal, form.currency)}</span>
              </div>
              <div className="inv-summary-row">
                <span>Total Discount</span>
                <span>{formatMoney(discountTotal, form.currency)}</span>
              </div>
              <div className="inv-summary-row total">
                <strong>Total</strong>
                <strong>{formatMoney(total, form.currency)}</strong>
              </div>
              <div className="inv-summary-row">
                <span>Total Projection</span>
                <span>
                  {formatMoney(
                    projections.reduce(
                      (sum, item) => sum + normalizeNumber(item.amount),
                      0,
                    ),
                    form.currency,
                  )}
                </span>
              </div>
              <div className="inv-summary-row">
                <span>Exchange Rate</span>
                <span>{normalizeNumber(form.exchangeRate) || 1}</span>
              </div>
              <div className="inv-inline-actions" style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="inv-btn-ghost"
                  disabled={submitting}
                  onClick={() => submitForm("draft")}
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  className="inv-btn"
                  disabled={submitting}
                  onClick={() => submitForm("sent")}
                >
                  Save & Send
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
