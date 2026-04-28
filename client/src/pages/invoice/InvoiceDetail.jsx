import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  addInvoicePayment,
  approveInvoiceDraft,
  deleteInvoice,
  deleteInvoicePayment,
  getInvoice,
  getPublicInvoice,
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
    "Ruko Dalton Utara No. 05, Jl. Scientia Square Selatan, Kel. Curug Sangereng, Kec. Kelapa Dua, Tangerang, Banten 15810 Indonesia",
  ],
  phone: "+6221 59995428",
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

function InvoiceLetterhead({ title = "INVOICE" }) {
  return (
    <header className="inv-print-top">
      <img
        className="inv-print-letterhead-img"
        src={invoiceLetterheadSrc}
        alt={companyProfile.name}
      />
      <address className="inv-print-letterhead-text">
        {companyProfile.address.map((line) => (
          <span key={line}>{line}</span>
        ))}
        <span>Phone : {companyProfile.phone}</span>
        <span>Website : {companyProfile.website}</span>
      </address>
      <h2 className="inv-print-document-title">{title}</h2>
    </header>
  );
}

function PaymentSearchSelect({
  value,
  options,
  onChange,
  placeholder = "Search...",
  emptyText = "No option found.",
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => String(option.value) === String(value)),
    [options, value],
  );

  useEffect(() => {
    if (isOpen) return;
    setSearch(selectedOption?.label || "");
  }, [isOpen, selectedOption]);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const selectedLabel = selectedOption?.label?.toLowerCase() || "";

    if (!query || query === selectedLabel) return options.slice(0, 40);

    return options
      .filter((option) =>
        [option.label, option.meta, option.search]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query),
      )
      .slice(0, 40);
  }, [options, search, selectedOption]);

  const selectOption = (option) => {
    onChange(option.value);
    setSearch(option.label);
    setIsOpen(false);
  };

  return (
    <div
      className="inv-combobox"
      onBlur={() => {
        window.setTimeout(() => setIsOpen(false), 120);
      }}
    >
      <input
        className="inv-input inv-combobox-input"
        value={search}
        placeholder={placeholder}
        onFocus={() => setIsOpen(true)}
        onChange={(event) => {
          setSearch(event.target.value);
          setIsOpen(true);
          if (value) onChange("");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (filteredOptions[0]) selectOption(filteredOptions[0]);
          }
          if (event.key === "Escape") setIsOpen(false);
        }}
      />

      {value ? (
        <button
          type="button"
          className="inv-combobox-clear"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onChange("");
            setSearch("");
            setIsOpen(true);
          }}
          aria-label="Clear selected option"
        >
          ×
        </button>
      ) : null}

      {isOpen ? (
        <div className="inv-combobox-menu">
          {filteredOptions.length ? (
            filteredOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                className={`inv-combobox-option ${
                  String(option.value) === String(value) ? "active" : ""
                }`}
                onMouseDown={(event) => {
                  event.preventDefault();
                  selectOption(option);
                }}
              >
                <span className="inv-combobox-name">{option.label}</span>
                {option.meta ? (
                  <span className="inv-combobox-meta">{option.meta}</span>
                ) : null}
              </button>
            ))
          ) : (
            <div className="inv-combobox-empty">{emptyText}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function InvoiceDetail({
  printOnly = false,
  publicView = false,
  initialPrintVariant = "standard",
  initialDetailTab = "invoice",
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
  const [activeDetailTab, setActiveDetailTab] = useState(initialDetailTab);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [addingPayment, setAddingPayment] = useState(false);
  const [approvingDraft, setApprovingDraft] = useState(false);
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
      const res = publicView
        ? await getPublicInvoice(invoiceNumber)
        : await getInvoice(invoiceNumber);
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
  }, [invoiceNumber, publicView]);

  useEffect(() => {
    if (!printOnly) setActiveDetailTab(initialDetailTab);
  }, [initialDetailTab, invoiceNumber, printOnly]);

  useEffect(() => {
    if (
      !printOnly &&
      !publicView &&
      invoice?.status === "draft" &&
      activeDetailTab === "payment"
    ) {
      setActiveDetailTab("invoice");
      navigate(`/invoice/${invoiceNumber}`, { replace: true });
    }
  }, [
    activeDetailTab,
    invoice?.status,
    invoiceNumber,
    navigate,
    printOnly,
    publicView,
  ]);

  useEffect(() => {
    if (publicView) return;

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
  }, [publicView]);

  useEffect(() => {
    if (!printOnly || !invoice || autoPrintRef.current) return;
    autoPrintRef.current = true;
    const timer = window.setTimeout(() => window.print(), 350);
    return () => window.clearTimeout(timer);
  }, [invoice, printOnly]);

  const handlePrint = (variant = "standard") => {
    setActiveDetailTab("invoice");
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

  const accountOptions = useMemo(
    () =>
      flatAssetAccounts.map((account) => {
        const code = account.accountCode || account.account_code || "";
        const name = account.accountName || account.account_name || "Account";
        const currency = account.currency || "";
        return {
          value: account._id || account.id,
          label: [code, name].filter(Boolean).join(" - "),
          meta: currency ? `Currency: ${currency}` : "",
          search: [code, name, currency].filter(Boolean).join(" "),
        };
      }),
    [flatAssetAccounts],
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
          meta:
            type === "master"
              ? "Master"
              : type === "submenu"
                ? "Submenu"
                : "Account",
          search: [category.name, category.code, type]
            .filter(Boolean)
            .join(" "),
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

  const invoiceIsDraft = invoice?.status === "draft";
  const paymentRecords = invoice?.payments || [];
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

  const switchDetailTab = (tabName) => {
    if (tabName === "payment" && invoiceIsDraft) {
      toast.info("Approve draft invoice dulu sebelum masuk ke Payment");
      return;
    }

    const sectionRef =
      tabName === "payment" ? paymentSectionRef : invoiceSectionRef;
    if (publicView) return;

    const detailPath =
      tabName === "payment"
        ? `/payment/${invoiceNumber}`
        : `/invoice/${invoiceNumber}`;

    setActiveDetailTab(tabName);
    if (!printOnly && window.location.pathname !== detailPath) {
      navigate(detailPath);
    }

    window.setTimeout(() => {
      sectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 40);
  };

  const startPayment = (projection = null) => {
    if (invoiceIsDraft) {
      toast.error(
        "Invoice masih draft. Approve draft dulu sebelum record payment",
      );
      return;
    }

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
    switchDetailTab("payment");
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
    `${window.location.origin}/public/invoice/${invoiceNumber}`;

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

  const approveDraft = async () => {
    if (
      !window.confirm(
        "Approve draft invoice ini? Setelah approve, invoice bisa dipakai untuk record payment.",
      )
    ) {
      return;
    }

    setApprovingDraft(true);
    setError("");
    try {
      const res = await approveInvoiceDraft(invoiceNumber);
      if (!res?.success)
        throw new Error(res?.message || "Failed to approve draft");
      toast.success("Draft invoice approved");
      setInvoice(res.data);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to approve draft",
      );
    } finally {
      setApprovingDraft(false);
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

  const PaymentOverviewTables = () => (
    <div className="inv-payment-overview inv-no-print">
      <div className="inv-grid">
        <div className="inv-grid-6">
          <div className="inv-projection-card">
            <div className="inv-projection-head blue">Payment Projection</div>
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
                        <td className="center">
                          {invoiceIsDraft ? (
                            <span className="inv-muted-dash">-</span>
                          ) : String(projection.status || "").toLowerCase() ===
                            "paid" ? (
                            <span className="inv-status paid">Paid</span>
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
                  {paymentRecords.length ? (
                    paymentRecords.map((payment, index) => (
                      <tr key={payment._id}>
                        <td>
                          <span className="inv-row-badge pink">
                            {index + 1}
                          </span>
                          <strong>{formatDate(payment.paymentDate)}</strong>
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
                            {formatMoney(payment.amount, invoice.currency)}
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
                          <button
                            type="button"
                            className="inv-mini-print"
                            onClick={() => handlePrint("standard")}
                          >
                            Print
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

      <div className="inv-payment-summary-card">
        <div className="inv-payment-summary-item blue">
          <span>Total Projection</span>
          <strong>{formatMoney(projectionTotal, invoice.currency)}</strong>
        </div>
        <div className="inv-payment-summary-item pink">
          <span>Total Received</span>
          <strong>{formatMoney(invoice.totalPaid, invoice.currency)}</strong>
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
    </div>
  );

  const PaymentRecordList = () => (
    <div className="inv-payment-ledger">
      {!paymentRecords.length ? (
        <div className="inv-empty">No payment data</div>
      ) : (
        paymentRecords.map((payment, index) => (
          <article className="inv-payment-record" key={payment._id}>
            <div className="inv-payment-record-number">{index + 1}</div>
            <div className="inv-payment-record-body">
              <div className="inv-payment-record-top">
                <div>
                  <span>Payment received</span>
                  <strong>{formatDate(payment.paymentDate)}</strong>
                  <small>
                    {payment.notes || "-"} - <b>{payment.method || "Bank"}</b>
                  </small>
                </div>
                <strong className="inv-payment-record-amount">
                  {formatMoney(payment.amount, invoice.currency)}
                </strong>
              </div>
              <div className="inv-payment-record-actions">
                <button type="button" onClick={() => handlePrint("standard")}>
                  Print
                </button>
                {payment.attachment ? (
                  <a
                    href={`${API_URL}/uploads/transactions/${encodeURIComponent(
                      payment.attachment,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View Attachment
                  </a>
                ) : (
                  <span>No attachment</span>
                )}
                <button
                  type="button"
                  onClick={() => removePayment(payment._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))
      )}
    </div>
  );

  return (
    <div
      className={`inv-page inv-invoice-page ${
        publicView ? "inv-public-page" : ""
      }`}
    >
      {publicView ? (
        <div className="inv-public-toolbar inv-no-print">
          <div>
            <span>Public Invoice</span>
            <strong>{invoiceNumber}</strong>
          </div>
          <div className="inv-public-actions">
            <button type="button" onClick={() => handlePrint("standard")}>
              Print / Save PDF
            </button>
            <button type="button" onClick={() => handlePrint("japan")}>
              Print Japan
            </button>
          </div>
        </div>
      ) : (
        <>
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
                onClick={() => switchDetailTab("invoice")}
              >
                Invoice
              </button>
              <button
                type="button"
                className={`inv-samit-tab ${
                  activeDetailTab === "payment" ? "active" : ""
                } ${invoiceIsDraft ? "disabled" : ""}`}
                onClick={() => switchDetailTab("payment")}
                disabled={invoiceIsDraft}
                title={
                  invoiceIsDraft
                    ? "Approve draft dulu untuk membuka Payment"
                    : ""
                }
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

          {!loading && invoiceIsDraft ? (
            <div className="inv-draft-bar inv-no-print">
              <p>
                <strong>Draft invoice</strong>
                <span>
                  Invoice masih draft dan belum bisa menerima payment.
                </span>
              </p>
              <button
                type="button"
                className="inv-btn"
                onClick={approveDraft}
                disabled={approvingDraft}
              >
                {approvingDraft ? "Approving..." : "Approve Draft"}
              </button>
            </div>
          ) : null}
        </>
      )}

      {error ? <div className="inv-error inv-no-print">{error}</div> : null}
      {loading ? (
        <div className="inv-card inv-sub inv-no-print">
          Loading invoice detail...
        </div>
      ) : null}

      {!loading && invoice ? (
        <>
          <div
            className={`inv-tab-panel ${
              activeDetailTab === "invoice" ? "" : "is-hidden"
            }`}
            ref={invoiceSectionRef}
          >
            <div className="inv-print-shell">
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
                        <td>
                          {formatMoney(invoice.subtotal, invoice.currency)}
                        </td>
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
                            Payment on {formatPaymentDate(payment.paymentDate)}{" "}
                            by {payment.method}
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

                <div className="inv-print-terms inv-print-page-break">
                  <h3>Note/Term of Services</h3>
                  <HtmlBlock html={invoice.terms} />
                </div>

                {!publicView ? (
                  <>
                    <div className="inv-personal-note inv-no-print">
                      <h3>Personal Note</h3>
                      <HtmlBlock html={invoice.notes} empty="-" />
                    </div>

                    <div className="inv-detail-footer-actions inv-no-print">
                      <button
                        type="button"
                        className="inv-detail-action danger"
                        onClick={removeInvoice}
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        className="inv-detail-action edit"
                        onClick={() =>
                          navigate(`/invoice/${invoiceNumber}/edit`)
                        }
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="inv-detail-action print"
                        onClick={() => handlePrint("standard")}
                      >
                        Print
                      </button>
                    </div>
                  </>
                ) : null}
              </section>

              <section
                className={`inv-print-sheet inv-print-japan ${
                  printVariant === "japan" ? "" : "is-hidden"
                }`}
              >
                <InvoiceLetterhead title="請求書" />

                <hr className="inv-print-divider" />

                <div className="inv-print-bill-row">
                  <address className="inv-print-to">
                    <h6>ご請求先</h6>
                    <h4>{invoice.customerSnapshot?.name || "-"}</h4>
                    <p>{invoice.customerSnapshot?.productTitle || "-"}</p>
                    <p>
                      {invoice.customerSnapshot?.completeAddress ||
                        "住所未入力"}
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
                        <td>
                          {formatMoney(invoice.subtotal, invoice.currency)}
                        </td>
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
                        <tr
                          className="payment"
                          key={`jp-payment-${payment._id}`}
                        >
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

                <div className="inv-print-terms inv-print-page-break">
                  <h3>備考・条件</h3>
                  <HtmlBlock html={invoice.terms} />
                </div>
              </section>
            </div>
            {!publicView ? <PaymentOverviewTables /> : null}
          </div>

          {!publicView ? (
            <section
              className={`inv-payment-section inv-no-print inv-tab-panel ${
                activeDetailTab === "payment" ? "" : "is-hidden"
              }`}
              id="payment"
              ref={paymentSectionRef}
            >
              <div className="inv-payment-section-head">
                <div>
                  <div
                    className="inv-section-title"
                    style={{ marginBottom: 4 }}
                  >
                    Payment
                  </div>
                  <div className="inv-sub">
                    Record pembayaran yang sudah diterima untuk invoice ini.
                  </div>
                </div>
                <div className="inv-payment-head-summary">
                  <small>amount due</small>
                  <strong>
                    {formatMoney(invoice.amountDue, invoice.currency)}
                  </strong>
                  <span>
                    {formatMoney(invoice.totalPaid, invoice.currency)}
                  </span>
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
                            Record Account{" "}
                            <span className="inv-required">*</span>
                          </label>
                          <PaymentSearchSelect
                            value={paymentForm.accountId}
                            options={accountOptions}
                            placeholder="Search account..."
                            emptyText="Account tidak ditemukan."
                            onChange={(accountId) =>
                              setPaymentForm((prev) => ({
                                ...prev,
                                accountId,
                              }))
                            }
                          />
                        </div>
                        {!paymentSplitMode ? (
                          <div className="inv-grid-12">
                            <label className="inv-label">
                              Category <span className="inv-required">*</span>
                            </label>
                            <PaymentSearchSelect
                              value={
                                paymentForm.categoryId
                                  ? `${paymentForm.categoryType}|${paymentForm.categoryId}`
                                  : ""
                              }
                              options={categoryOptions}
                              placeholder="Search category..."
                              emptyText="Category tidak ditemukan."
                              onChange={selectPaymentCategory}
                            />
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
                                      <PaymentSearchSelect
                                        value={
                                          split.categoryId
                                            ? `${split.categoryType}|${split.categoryId}`
                                            : ""
                                        }
                                        options={categoryOptions}
                                        placeholder="Search category..."
                                        emptyText="Category tidak ditemukan."
                                        onChange={(value) =>
                                          updatePaymentSplitCategory(
                                            index,
                                            value,
                                          )
                                        }
                                      />
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
                                File maksimal 6MB: JPG, PNG, GIF, TIFF, BMP,
                                HEIC, atau PDF.
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

              <PaymentRecordList />
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
