import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  addInvoicePayment,
  deleteInvoice,
  deleteInvoicePayment,
  getInvoice,
} from "../../api/invoiceApi.jsx";
import {
  getAllCategories,
  getAssetsAccounts,
} from "../../api/accountingApi.jsx";
import { API_URL } from "../../api/config.js";
import "./invoice.css";

const companyProfile = {
  name: "KOPERASI SAKURA MITRA INTERNASIONAL",
  address: [
    "Ruko Dalton Utara No. 05",
    "Jl. Scientia Square Selatan, Kel. Curug Sangereng,",
    "Kec. Kelapa Dua, Tangerang, Banten 15810 Indonesia",
  ],
  phone: "+622159995428",
  website: "www.sakuramitra.com",
};

const invoiceLetterheadSrc = "/coop%20panjang.png";

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

const formatJapaneseDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
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

const normalizeWhatsAppPhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
};

function HtmlBlock({ html, empty = "Tidak ada catatan" }) {
  if (!html) return <i>{empty}</i>;
  return (
    <div className="inv-rich-text" dangerouslySetInnerHTML={{ __html: html }} />
  );
}

function InvoiceLetterhead({ title = "INVOICE", fromLabel = "From," }) {
  return (
    <header className="inv-print-top">
      <img
        className="inv-print-letterhead-img"
        src={invoiceLetterheadSrc}
        alt={companyProfile.name}
      />
      <div className="inv-print-title-row">
        <h2>{title}</h2>
        <address className="inv-print-from">
          <h6>{fromLabel}</h6>
          <strong>{companyProfile.name}</strong>
        </address>
      </div>
    </header>
  );
}

export default function InvoiceDetail({
  printOnly = false,
  initialPrintVariant = "standard",
}) {
  const navigate = useNavigate();
  const { invoiceNumber } = useParams();
  const autoPrintRef = useRef(false);
  const invoiceSectionRef = useRef(null);
  const paymentSectionRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [invoice, setInvoice] = useState(null);
  const [printVariant, setPrintVariant] = useState(initialPrintVariant);
  const [activeDetailTab, setActiveDetailTab] = useState("invoice");
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [addingPayment, setAddingPayment] = useState(false);
  const [assetsAccounts, setAssetsAccounts] = useState({});
  const [categories, setCategories] = useState([]);
  const [paymentSplits, setPaymentSplits] = useState([]);
  const [paymentAttachment, setPaymentAttachment] = useState(null);
  const [paymentSplitMode, setPaymentSplitMode] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paymentDate: new Date().toISOString().slice(0, 10),
    amount: "",
    accountId: "",
    categoryId: "",
    categoryType: "",
    method: "Bank",
    senderName: "",
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

  useEffect(() => {
    const loadAccountingOptions = async () => {
      try {
        const [accountsRes, categoriesRes] = await Promise.all([
          getAssetsAccounts(),
          getAllCategories(),
        ]);
        setAssetsAccounts(accountsRes?.data || {});
        setCategories(categoriesRes?.data || []);
      } catch (err) {
        console.error(
          "Failed to load invoice payment accounting options:",
          err,
        );
      }
    };

    loadAccountingOptions();
  }, []);

  useEffect(() => {
    if (!printOnly || !invoice || autoPrintRef.current) return;
    autoPrintRef.current = true;
    const timer = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(timer);
  }, [invoice, printOnly]);

  const handlePrint = (variant = "standard") => {
    setPrintVariant(variant);
    window.setTimeout(() => window.print(), 80);
  };

  const projectionTotal = useMemo(
    () =>
      (invoice?.projections || []).reduce(
        (sum, projection) => sum + Number(projection.amount || 0),
        0,
      ),
    [invoice],
  );

  const flatAssetAccounts = useMemo(
    () => Object.values(assetsAccounts).flatMap((items) => items || []),
    [assetsAccounts],
  );

  const assetAccountGroups = useMemo(
    () =>
      Object.entries(assetsAccounts)
        .map(([groupName, accounts]) => [groupName, accounts || []])
        .filter(([, accounts]) => accounts.length),
    [assetsAccounts],
  );

  const categoryOptions = useMemo(
    () =>
      (categories || []).map((category) => {
        const type = category.type || "account";
        const prefix =
          type === "master" ? "" : type === "submenu" ? "-- " : "---- ";
        const code = category.code ? ` (${category.code})` : "";
        return {
          key: `${type}-${category.id}`,
          value: `${type}|${category.id}`,
          label: `${prefix}${category.name}${code}`,
        };
      }),
    [categories],
  );

  const selectedAccount = useMemo(
    () =>
      flatAssetAccounts.find(
        (account) => String(account._id) === String(paymentForm.accountId),
      ),
    [flatAssetAccounts, paymentForm.accountId],
  );

  const paymentCurrencyPrefix =
    selectedAccount?.currency || invoice?.currency || "Rp";
  const paymentAmount = Number(paymentForm.amount || 0);
  const splitUsedAmount = paymentSplits.reduce(
    (sum, split) => sum + Number(split.amount || 0),
    0,
  );
  const splitRemaining = paymentAmount - splitUsedAmount;

  const resetPaymentState = () => {
    setPaymentForm({
      paymentDate: new Date().toISOString().slice(0, 10),
      amount: "",
      accountId: "",
      categoryId: "",
      categoryType: "",
      method: "Bank",
      senderName: "",
      notes: "",
    });
    setPaymentSplits([]);
    setPaymentAttachment(null);
    setPaymentSplitMode(false);
  };

  const scrollToSection = (sectionRef, tabName) => {
    if (tabName) setActiveDetailTab(tabName);
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const startPayment = (projection = null) => {
    setPaymentForm({
      paymentDate: new Date().toISOString().slice(0, 10),
      amount: projection ? String(projection.amount || "") : "",
      accountId: "",
      categoryId: "",
      categoryType: "",
      method: "Bank",
      senderName: "",
      notes: projection
        ? `Payment for: ${projection.description || "Invoice projection"}`
        : "",
    });
    setPaymentSplits([]);
    setPaymentAttachment(null);
    setPaymentSplitMode(false);
    setAddingPayment(true);
    setActiveDetailTab("payment");
    window.setTimeout(() => scrollToSection(paymentSectionRef, "payment"), 80);
  };

  const selectPaymentCategory = (value) => {
    const [categoryType, categoryId] = (value || "|").split("|");
    setPaymentForm((prev) => ({
      ...prev,
      categoryType: categoryType || "",
      categoryId: categoryId || "",
    }));
  };

  const initPaymentSplit = () => {
    if (paymentAmount <= 0) {
      toast.error("Isi amount dulu sebelum split transaction");
      return;
    }
    setPaymentSplitMode(true);
    if (paymentSplits.length < 2) {
      setPaymentSplits([
        { amount: "", categoryId: "", categoryType: "account" },
        { amount: "", categoryId: "", categoryType: "account" },
      ]);
    }
  };

  const cancelPaymentSplit = () => {
    setPaymentSplitMode(false);
    setPaymentSplits([]);
  };

  const addPaymentSplit = () => {
    setPaymentSplits((prev) => [
      ...prev,
      { amount: "", categoryId: "", categoryType: "account" },
    ]);
  };

  const removePaymentSplit = (index) => {
    setPaymentSplits((prev) => {
      const next = prev.filter((_, currentIndex) => currentIndex !== index);
      return next.length >= 2
        ? next
        : [...next, { amount: "", categoryId: "", categoryType: "account" }];
    });
  };

  const updatePaymentSplit = (index, patch) => {
    setPaymentSplits((prev) =>
      prev.map((split, currentIndex) =>
        currentIndex === index ? { ...split, ...patch } : split,
      ),
    );
  };

  const updatePaymentSplitCategory = (index, value) => {
    const [categoryType, categoryId] = (value || "|").split("|");
    updatePaymentSplit(index, {
      categoryType: categoryType || "account",
      categoryId: categoryId || "",
    });
  };

  const handlePaymentAttachment = (file) => {
    if (!file) return;
    if (file.size > 6 * 1024 * 1024) {
      toast.error("Attachment maksimal 6MB");
      return;
    }
    const allowed = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/tiff",
      "image/bmp",
      "image/heic",
      "application/pdf",
    ];
    const allowedExt = [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "tiff",
      "tif",
      "bmp",
      "heic",
      "pdf",
    ];
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowed.includes(file.type) && !allowedExt.includes(extension)) {
      toast.error("Attachment harus JPG, PNG, GIF, TIFF, BMP, HEIC, atau PDF");
      return;
    }
    setPaymentAttachment(file);
  };

  const getInvoiceUrl = () =>
    `${window.location.origin}/invoice/${invoiceNumber}`;

  const sendInvoiceViaWhatsApp = () => {
    const phone = normalizeWhatsAppPhone(invoice?.customerSnapshot?.phone);
    if (!phone) {
      toast.error("Nomor customer belum tersedia");
      return;
    }
    const message = [
      `*${companyProfile.name}*`,
      "",
      `*INVOICE #${invoiceNumber}*`,
      `Dear ${invoice?.customerSnapshot?.name || "Customer"},`,
      "",
      `Invoice Number: ${invoiceNumber}`,
      `Invoice Date: ${formatDate(invoice?.issuedDate)}`,
      `Payment Due: ${formatDate(invoice?.dueDate)}`,
      `Total Amount: ${formatMoney(invoice?.total, invoice?.currency)}`,
      `Amount Due: ${formatMoney(invoice?.amountDue, invoice?.currency)}`,
      "",
      `View invoice: ${getInvoiceUrl()}`,
      "",
      `Best regards,`,
      companyProfile.name,
      companyProfile.phone,
      companyProfile.website,
    ].join("\n");

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const sendInvoiceViaEmail = () => {
    const email = invoice?.customerSnapshot?.email || "";
    if (!email) {
      toast.error("Email customer belum tersedia");
      return;
    }
    const subject = `Invoice #${invoiceNumber} from ${companyProfile.name}`;
    const body = [
      `Dear ${invoice?.customerSnapshot?.name || "Customer"},`,
      "",
      "Please find your invoice details below:",
      "",
      `Invoice Number: ${invoiceNumber}`,
      `Invoice Date: ${formatDate(invoice?.issuedDate)}`,
      `Payment Due: ${formatDate(invoice?.dueDate)}`,
      `Total Amount: ${formatMoney(invoice?.total, invoice?.currency)}`,
      `Amount Due: ${formatMoney(invoice?.amountDue, invoice?.currency)}`,
      "",
      `View invoice: ${getInvoiceUrl()}`,
      "",
      "Best regards,",
      companyProfile.name,
      companyProfile.phone,
      companyProfile.website,
    ].join("\n");

    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
  };

  const submitPayment = async () => {
    setError("");
    const amount = Number(paymentForm.amount || 0);

    if (amount <= 0) {
      toast.error("Amount tidak valid");
      return;
    }
    if (!paymentForm.accountId) {
      toast.error("Record Account wajib dipilih");
      return;
    }
    if (paymentSplitMode) {
      if (paymentSplits.length < 2) {
        toast.error("Split transaction minimal 2 baris");
        return;
      }

      const invalidSplit = paymentSplits.some(
        (split) =>
          Number(split.amount || 0) <= 0 ||
          !split.categoryId ||
          !split.categoryType,
      );
      if (invalidSplit) {
        toast.error("Semua split wajib punya amount dan category");
        return;
      }
      if (Math.abs(splitRemaining) > 0.01) {
        toast.error(
          `Split belum balance. Remaining: ${formatMoney(
            splitRemaining,
            invoice.currency,
          )}`,
        );
        return;
      }
    } else if (!paymentForm.categoryId || !paymentForm.categoryType) {
      toast.error("Category wajib dipilih");
      return;
    }

    try {
      const payload = new FormData();
      payload.append("paymentDate", paymentForm.paymentDate);
      payload.append("amount", String(amount));
      payload.append("accountId", paymentForm.accountId);
      payload.append("method", paymentForm.method || "Bank");
      payload.append("senderName", paymentForm.senderName || "");
      payload.append("notes", paymentForm.notes || "");

      if (paymentSplitMode) {
        payload.append(
          "splits",
          JSON.stringify(
            paymentSplits.map((split) => ({
              amount: Number(split.amount || 0),
              categoryId: split.categoryId,
              categoryType: split.categoryType || "account",
            })),
          ),
        );
      } else {
        payload.append("categoryId", paymentForm.categoryId);
        payload.append("categoryType", paymentForm.categoryType);
      }

      if (paymentAttachment) {
        payload.append("proofAttachment", paymentAttachment);
      }

      const res = await addInvoicePayment(invoiceNumber, payload);
      if (!res?.success)
        throw new Error(res?.message || "Failed to add payment");
      toast.success("Payment added");
      setInvoice(res.data);
      resetPaymentState();
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
      <div className="inv-samit-hero inv-no-print">
        <div>
          <h1>
            <button
              type="button"
              className="inv-back-icon"
              onClick={() => navigate("/invoice")}
              aria-label="Back to invoice list"
            >
              ‹
            </button>
            Invoice {invoiceNumber}
            <span className={`inv-status ${invoice?.status || "draft"}`}>
              {statusLabel[invoice?.status] || invoice?.status || "Draft"}
            </span>
          </h1>
          <div className="inv-breadcrumb">
            <button type="button" onClick={() => navigate("/dashboard")}>
              Dashboard
            </button>
            <span>/</span>
            <button type="button" onClick={() => navigate("/invoice")}>
              Invoice
            </button>
            <span>/</span>
            <strong>{invoiceNumber}</strong>
          </div>
        </div>
        <div className="inv-hero-blob" aria-hidden="true" />
      </div>

      <div className="inv-samit-toolbar inv-no-print">
        <div className="inv-samit-tabs">
          <button
            type="button"
            className={`inv-samit-tab ${
              activeDetailTab === "invoice" ? "active" : ""
            }`}
            onClick={() => scrollToSection(invoiceSectionRef, "invoice")}
          >
            Invoice
          </button>
          <button
            type="button"
            className={`inv-samit-tab ${
              activeDetailTab === "payment" ? "active" : ""
            }`}
            onClick={() => scrollToSection(paymentSectionRef, "payment")}
          >
            Payment
          </button>
        </div>
        <div className="inv-samit-toolbar-actions">
          <button
            type="button"
            className="inv-btn-success"
            onClick={sendInvoiceViaWhatsApp}
          >
            WhatsApp
          </button>
          <button
            type="button"
            className="inv-btn-info"
            onClick={sendInvoiceViaEmail}
          >
            Email
          </button>
          <div className="inv-action-menu">
            <button
              type="button"
              className="inv-option-trigger"
              onClick={() => setShowActionMenu((prev) => !prev)}
              aria-label="More invoice actions"
            >
              ▾
            </button>
            {showActionMenu ? (
              <ul className="inv-option-section">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setShowActionMenu(false);
                      navigate(`/invoice/${invoiceNumber}/edit`);
                    }}
                  >
                    Edit
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setShowActionMenu(false);
                      removeInvoice();
                    }}
                  >
                    Delete
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setShowActionMenu(false);
                      handlePrint("standard");
                    }}
                  >
                    Print
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setShowActionMenu(false);
                      handlePrint("japan");
                    }}
                  >
                    Print (Japan)
                  </button>
                </li>
              </ul>
            ) : null}
          </div>
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
          <div className="inv-print-shell" ref={invoiceSectionRef}>
            <section
              className={`inv-print-sheet ${
                printVariant === "standard" ? "" : "is-hidden"
              }`}
              id="printableArea"
            >
              <InvoiceLetterhead />

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

            <section
              className={`inv-print-sheet inv-print-japan ${
                printVariant === "japan" ? "" : "is-hidden"
              }`}
            >
              <InvoiceLetterhead title="請求書" fromLabel="発行元" />

              <hr className="inv-print-divider" />

              <div className="inv-print-bill-row">
                <address className="inv-print-to">
                  <h6>ご請求先</h6>
                  <h4>{invoice.customerSnapshot?.name || "-"}</h4>
                  <p>{invoice.customerSnapshot?.productTitle || "-"}</p>
                  <p>
                    {invoice.customerSnapshot?.completeAddress || "住所未入力"}
                  </p>
                  <strong>{invoice.customerSnapshot?.phone || "-"}</strong>
                  <strong>{invoice.customerSnapshot?.email || "-"}</strong>
                </address>

                <table className="inv-print-meta">
                  <tbody>
                    <tr>
                      <td>請求書番号</td>
                      <td>:</td>
                      <td>{invoice.invoiceNumber}</td>
                    </tr>
                    <tr>
                      <td>営業コード</td>
                      <td>:</td>
                      <td>{invoice.salesCode || "-"}</td>
                    </tr>
                    <tr>
                      <td>発行日</td>
                      <td>:</td>
                      <td>{formatJapaneseDate(invoice.issuedDate)}</td>
                    </tr>
                    <tr>
                      <td>支払期限</td>
                      <td>:</td>
                      <td>{formatJapaneseDate(invoice.dueDate)}</td>
                    </tr>
                    <tr>
                      <td>請求残額</td>
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
                      <th>品目</th>
                      <th className="center">数量</th>
                      <th className="right">単価</th>
                      <th className="right">金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice.items || []).map((item) => (
                      <tr key={`jp-item-${item._id}`}>
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
                      <td>小計</td>
                      <td>:</td>
                      <td>{formatMoney(invoice.subtotal, invoice.currency)}</td>
                    </tr>
                    {(invoice.discounts || []).map((discount) => (
                      <tr
                        className="discount"
                        key={`jp-discount-${discount._id}`}
                      >
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
                      <td>合計</td>
                      <td>:</td>
                      <td>{formatMoney(invoice.total, invoice.currency)}</td>
                    </tr>
                    {(invoice.payments || []).map((payment) => (
                      <tr className="payment" key={`jp-payment-${payment._id}`}>
                        <td>
                          入金 {formatJapaneseDate(payment.paymentDate)} /{" "}
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
                <span>請求残額</span>
                <strong
                  className={Number(invoice.amountDue) < 0 ? "negative" : ""}
                >
                  {Number(invoice.amountDue) < 0
                    ? `(${formatMoney(Math.abs(invoice.amountDue), invoice.currency)})`
                    : formatMoney(invoice.amountDue, invoice.currency)}
                </strong>
              </div>

              <div className="inv-print-projection">
                <h3>お支払い予定</h3>
                <table className="inv-print-table compact">
                  <thead>
                    <tr>
                      <th>内容</th>
                      <th>支払期日</th>
                      <th className="right">金額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice.projections || []).length ? (
                      (invoice.projections || []).map((projection) => (
                        <tr key={`jp-projection-${projection._id}`}>
                          <td>{projection.description}</td>
                          <td>{formatJapaneseDate(projection.estimateDate)}</td>
                          <td className="right">
                            {formatMoney(projection.amount, invoice.currency)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="center">
                          お支払い予定はありません
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="2">合計</td>
                      <td className="right">
                        {formatMoney(projectionTotal, invoice.currency)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="inv-print-terms inv-print-page-break">
                <h3>備考・条件</h3>
                <HtmlBlock html={invoice.terms} />
              </div>
            </section>
          </div>

          <section
            className="inv-payment-section inv-no-print"
            id="payment"
            ref={paymentSectionRef}
          >
            <div className="inv-payment-section-head">
              <div>
                <div className="inv-section-title" style={{ marginBottom: 4 }}>
                  Payment
                </div>
                <div className="inv-sub">
                  Projection, realization, dan record pembayaran invoice.
                </div>
              </div>
              <button
                type="button"
                className="inv-btn-secondary"
                onClick={() => startPayment()}
              >
                New Payment
              </button>
            </div>

            {addingPayment ? (
              <div className="inv-payment-modal-backdrop">
                <div
                  className="inv-payment-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="invoice-payment-modal-title"
                >
                  <div className="inv-payment-modal-head">
                    <h2 id="invoice-payment-modal-title">Record Payment</h2>
                    <button
                      type="button"
                      className="inv-payment-modal-close"
                      onClick={() => setAddingPayment(false)}
                      aria-label="Close payment form"
                    >
                      ×
                    </button>
                  </div>

                  <div className="inv-payment-modal-body">
                    <div className="inv-grid">
                      <div className="inv-grid-6">
                        <label className="inv-label">Payment date</label>
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
                      <div className="inv-grid-6">
                        <label className="inv-label">
                          Amount ({invoice.currency || "IDR"})
                        </label>
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
                      <div className="inv-grid-12">
                        <label className="inv-label">
                          Record Account <span className="inv-required">*</span>
                        </label>
                        <select
                          className="inv-select"
                          value={paymentForm.accountId}
                          onChange={(event) =>
                            setPaymentForm((prev) => ({
                              ...prev,
                              accountId: event.target.value,
                            }))
                          }
                        >
                          <option value="">Select account...</option>
                          {assetAccountGroups.map(([groupName, accounts]) => (
                            <optgroup key={groupName} label={groupName}>
                              {accounts.map((account) => (
                                <option key={account._id} value={account._id}>
                                  {account.accountCode
                                    ? `${account.accountCode} - `
                                    : ""}
                                  {account.accountName}
                                  {account.currency
                                    ? ` (${account.currency})`
                                    : ""}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      {!paymentSplitMode ? (
                        <div className="inv-grid-12">
                          <label className="inv-label">
                            Category <span className="inv-required">*</span>
                          </label>
                          <select
                            className="inv-select"
                            value={
                              paymentForm.categoryId
                                ? `${paymentForm.categoryType}|${paymentForm.categoryId}`
                                : ""
                            }
                            onChange={(event) =>
                              selectPaymentCategory(event.target.value)
                            }
                          >
                            <option value="">Select category...</option>
                            {categoryOptions.map((category) => (
                              <option key={category.key} value={category.value}>
                                {category.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                      <div className="inv-grid-12">
                        {!paymentSplitMode ? (
                          <button
                            type="button"
                            className="inv-split-btn"
                            onClick={initPaymentSplit}
                          >
                            Split transaction
                          </button>
                        ) : (
                          <div className="inv-split-box">
                            <div className="inv-split-header">
                              <strong>Split Transaction</strong>
                              <div className="inv-split-summary">
                                <span>
                                  Total:{" "}
                                  <strong>
                                    {formatMoney(
                                      splitUsedAmount,
                                      invoice.currency,
                                    )}
                                  </strong>
                                </span>
                                <span>
                                  Remaining:{" "}
                                  <strong
                                    className={
                                      Math.abs(splitRemaining) <= 0.01
                                        ? "balanced"
                                        : "unbalanced"
                                    }
                                  >
                                    {formatMoney(
                                      splitRemaining,
                                      invoice.currency,
                                    )}
                                  </strong>
                                </span>
                              </div>
                            </div>
                            <div className="inv-split-items">
                              {paymentSplits.map((split, index) => (
                                <div className="inv-split-row" key={index}>
                                  <div>
                                    <label className="inv-label">
                                      Amount {index + 1}
                                    </label>
                                    <div className="inv-split-amount-input">
                                      <span>{paymentCurrencyPrefix}</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={split.amount}
                                        onChange={(event) =>
                                          updatePaymentSplit(index, {
                                            amount: event.target.value,
                                          })
                                        }
                                        placeholder="0"
                                      />
                                    </div>
                                    <small>
                                      Max:{" "}
                                      {formatMoney(
                                        paymentAmount,
                                        invoice.currency,
                                      )}
                                    </small>
                                  </div>
                                  <div>
                                    <label className="inv-label">
                                      Category
                                    </label>
                                    <select
                                      className="inv-select"
                                      value={
                                        split.categoryId
                                          ? `${split.categoryType}|${split.categoryId}`
                                          : ""
                                      }
                                      onChange={(event) =>
                                        updatePaymentSplitCategory(
                                          index,
                                          event.target.value,
                                        )
                                      }
                                    >
                                      <option value="">
                                        Select category...
                                      </option>
                                      {categoryOptions.map((category) => (
                                        <option
                                          key={`${index}-${category.key}`}
                                          value={category.value}
                                        >
                                          {category.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                  <button
                                    type="button"
                                    className="inv-split-remove"
                                    onClick={() => removePaymentSplit(index)}
                                    aria-label={`Remove split ${index + 1}`}
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div className="inv-split-actions">
                              <button type="button" onClick={addPaymentSplit}>
                                Add another split
                              </button>
                              <button
                                type="button"
                                className="danger"
                                onClick={cancelPaymentSplit}
                              >
                                Cancel split
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="inv-grid-6">
                        <label className="inv-label">Sender name</label>
                        <input
                          className="inv-input"
                          value={paymentForm.senderName}
                          onChange={(event) =>
                            setPaymentForm((prev) => ({
                              ...prev,
                              senderName: event.target.value,
                            }))
                          }
                          placeholder="Nama pengirim"
                        />
                      </div>
                      <div className="inv-grid-6">
                        <label className="inv-label">Payment method</label>
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
                          <option value="">select one</option>
                          <option value="Bank">Bank payment</option>
                          <option value="Cash">Cash</option>
                          <option value="Transfer">Transfer</option>
                          <option value="QRIS">QRIS</option>
                          <option value="Check">Check</option>
                          <option value="CC">Credit Card</option>
                          <option value="PayPal">PayPal</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="inv-grid-12">
                        <label className="inv-label">Attachment</label>
                        <div className="inv-file-box">
                          <input
                            type="file"
                            accept=".jpg,.jpeg,.png,.pdf,.heic,.tiff,.tif,.bmp,.gif"
                            onChange={(event) =>
                              handlePaymentAttachment(event.target.files?.[0])
                            }
                          />
                          {paymentAttachment ? (
                            <div className="inv-file-meta">
                              <span>{paymentAttachment.name}</span>
                              <button
                                type="button"
                                onClick={() => setPaymentAttachment(null)}
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <p>
                              File maksimal 6MB: JPG, PNG, GIF, TIFF, BMP, HEIC,
                              atau PDF.
                            </p>
                          )}
                        </div>
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
                  </div>

                  <div className="inv-payment-modal-footer">
                    <button
                      type="button"
                      className="inv-btn-ghost"
                      onClick={() => setAddingPayment(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inv-btn"
                      onClick={submitPayment}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="inv-grid">
              <div className="inv-grid-6">
                <div className="inv-projection-card">
                  <div className="inv-projection-head blue">
                    Payment Projection
                  </div>
                  <div className="inv-table-wrap">
                    <table className="inv-table inv-samit-projection-table">
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th>Due Date</th>
                          <th className="right">Amount</th>
                          <th className="center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(invoice.projections || []).length ? (
                          (invoice.projections || []).map(
                            (projection, index) => (
                              <tr key={projection._id}>
                                <td>
                                  <span className="inv-row-badge blue">
                                    {index + 1}
                                  </span>
                                  {projection.description}
                                </td>
                                <td>{formatDate(projection.estimateDate)}</td>
                                <td className="right">
                                  {formatMoney(
                                    projection.amount,
                                    invoice.currency,
                                  )}
                                </td>
                                <td className="center">
                                  {String(
                                    projection.status || "",
                                  ).toLowerCase() === "paid" ? (
                                    <span className="inv-status paid">
                                      Paid
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      className="inv-pay-projection-btn"
                                      onClick={() => startPayment(projection)}
                                    >
                                      Pay
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ),
                          )
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
                    <table className="inv-table inv-samit-realization-table">
                      <thead>
                        <tr>
                          <th>Payment Date</th>
                          <th className="right">Amount</th>
                          <th className="center">File</th>
                          <th className="center">Print</th>
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
                                <strong>
                                  {formatDate(payment.paymentDate)}
                                </strong>
                                <br />
                                <small>{payment.method || "Bank"}</small>
                                {payment.notes ? (
                                  <div className="inv-payment-note">
                                    {payment.notes}
                                  </div>
                                ) : null}
                              </td>
                              <td className="right">
                                <strong>
                                  {formatMoney(
                                    payment.amount,
                                    invoice.currency,
                                  )}
                                </strong>
                              </td>
                              <td className="center">
                                {payment.attachment ? (
                                  <a
                                    className="inv-file-link"
                                    href={`${API_URL}/uploads/transactions/${encodeURIComponent(
                                      payment.attachment,
                                    )}`}
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {payment.attachmentOriginalName || "File"}
                                  </a>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td className="center">
                                <div className="inv-payment-actions">
                                  <button
                                    type="button"
                                    className="inv-mini-print"
                                    onClick={() => handlePrint("standard")}
                                  >
                                    Print
                                  </button>
                                  <button
                                    type="button"
                                    className="inv-mini-danger"
                                    onClick={() => removePayment(payment._id)}
                                    title="Delete payment"
                                  >
                                    Delete
                                  </button>
                                </div>
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

            <div className="inv-payment-summary-card">
              <div className="inv-payment-summary-item blue">
                <span>Total Projection</span>
                <strong>
                  {formatMoney(projectionTotal, invoice.currency)}
                </strong>
              </div>
              <div className="inv-payment-summary-item pink">
                <span>Total Received</span>
                <strong>
                  {formatMoney(invoice.totalPaid, invoice.currency)}
                </strong>
              </div>
              <div className="inv-payment-summary-item violet">
                <span>Amount Due</span>
                <strong>
                  {Number(invoice.amountDue) < 0
                    ? `(${formatMoney(Math.abs(invoice.amountDue), invoice.currency)})`
                    : formatMoney(invoice.amountDue, invoice.currency)}
                </strong>
              </div>
            </div>
          </section>

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
                <HtmlBlock html={invoice.notes || "-"} />
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
