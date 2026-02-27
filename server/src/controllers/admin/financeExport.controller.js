import { AccountingTransaction } from "../../models/accountingTransaction.model.js";
import { TransactionSplit } from "../../models/transactionSplit.model.js";
import { CoaAccount } from "../../models/coaAccount.model.js";
import { CoaSubmenu } from "../../models/coaSubmenu.model.js";
import { CoaMaster } from "../../models/coaMaster.model.js";

function toIdString(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value.toString) return value.toString();
  return String(value);
}

function normalizeMoney(value) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.abs(parsed);
}

function parseDate(value, fallback) {
  if (!value) return new Date(fallback);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date(fallback);
  return parsed;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatYmd(date) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function escapeTsv(value) {
  const text = String(value ?? "");
  return text.replace(/[\t\n\r]+/g, " ").trim();
}

function escapePdfText(value) {
  return String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[\r\n]+/g, " ");
}

function buildQueryFilter(query = {}) {
  const now = new Date();
  const startDefault = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDefault = now;

  const rawStart = query.start_date || query.startDate;
  const rawEnd = query.end_date || query.endDate;
  const accountId = (query.account_id || query.accountId || "").toString().trim();

  let startDate = startOfDay(parseDate(rawStart, startDefault));
  let endDate = endOfDay(parseDate(rawEnd, endDefault));

  if (startDate.getTime() > endDate.getTime()) {
    const swap = startDate;
    startDate = startOfDay(endDate);
    endDate = endOfDay(swap);
  }

  const filter = {
    transactionDate: {
      $gte: startDate,
      $lte: endDate,
    },
  };

  if (accountId) {
    filter.accountId = accountId;
  }

  return {
    filter,
    filters: {
      start_date: formatYmd(startDate),
      end_date: formatYmd(endDate),
      account_id: accountId || "",
    },
  };
}

async function buildCategoryMapFromRows(rows = [], splitRows = []) {
  const categoryIds = new Set();

  for (const row of rows) {
    if (row?.categoryId) categoryIds.add(toIdString(row.categoryId));
  }

  for (const split of splitRows) {
    if (split?.categoryId) categoryIds.add(toIdString(split.categoryId));
  }

  if (!categoryIds.size) return new Map();

  const accounts = await CoaAccount.find({
    _id: { $in: Array.from(categoryIds) },
  })
    .select("_id accountName accountCode submenuId")
    .lean();

  const submenuIds = Array.from(
    new Set(accounts.map((row) => toIdString(row.submenuId)).filter(Boolean))
  );

  const submenus = submenuIds.length
    ? await CoaSubmenu.find({ _id: { $in: submenuIds } })
      .select("_id submenuName masterId")
      .lean()
    : [];

  const masterIds = Array.from(
    new Set(submenus.map((row) => toIdString(row.masterId)).filter(Boolean))
  );

  const masters = masterIds.length
    ? await CoaMaster.find({ _id: { $in: masterIds } })
      .select("_id masterName")
      .lean()
    : [];

  const submenuMap = new Map(submenus.map((row) => [toIdString(row._id), row]));
  const masterMap = new Map(masters.map((row) => [toIdString(row._id), row]));
  const categoryMap = new Map();

  for (const account of accounts) {
    const submenu = submenuMap.get(toIdString(account.submenuId));
    const master = submenu ? masterMap.get(toIdString(submenu.masterId)) : null;

    categoryMap.set(toIdString(account._id), {
      accountName: account.accountName || "-",
      accountCode: account.accountCode || "",
      submenuName: submenu?.submenuName || "-",
      masterName: master?.masterName || "-",
    });
  }

  return categoryMap;
}

function buildRowsForExport(transactions = [], splitMap = new Map(), categoryMap = new Map()) {
  const rows = [];

  for (const txn of transactions) {
    const transactionId = toIdString(txn._id);
    const transactionDate = formatYmd(txn.transactionDate);
    const accountName = txn.accountId?.accountName || "-";
    const accountCode = txn.accountId?.accountCode || "";
    const txType = txn.transactionType || "-";
    const customerName = txn.customerId?.name || "-";
    const customerUuid = txn.customerId?.uuid || "";
    const vendorName = txn.vendorId || "-";
    const salesTax = txn.salesTaxId?.abbreviation || "-";
    const reviewedText = txn.reviewed ? "Yes" : "No";
    const notes = txn.notes || "";

    if (txn.isSplit) {
      const splits = splitMap.get(transactionId) || [];
      if (!splits.length) {
        rows.push({
          transaction_id: transactionId,
          date: transactionDate,
          description: txn.description || "",
          account_name: accountName,
          account_code: accountCode,
          category_name: "Split Transaction",
          category_code: "",
          category_submenu: "",
          category_master: "",
          entry_type: "split",
          transaction_type: txType,
          amount: normalizeMoney(txn.amount),
          customer_name: customerName,
          customer_uuid: customerUuid,
          vendor_name: vendorName,
          sales_tax: salesTax,
          reviewed: reviewedText,
          notes,
          balance_effect: txType === "Deposit" ? normalizeMoney(txn.amount) : -normalizeMoney(txn.amount),
        });
      } else {
        for (const split of splits) {
          const category = categoryMap.get(toIdString(split.categoryId)) || null;
          const amount = normalizeMoney(split.amount);
          rows.push({
            transaction_id: transactionId,
            date: transactionDate,
            description: txn.description || "",
            account_name: accountName,
            account_code: accountCode,
            category_name: category?.accountName || "Split Transaction",
            category_code: category?.accountCode || "",
            category_submenu: category?.submenuName || "",
            category_master: category?.masterName || "",
            entry_type: "split",
            transaction_type: txType,
            amount,
            customer_name: customerName,
            customer_uuid: customerUuid,
            vendor_name: vendorName,
            sales_tax: salesTax,
            reviewed: reviewedText,
            notes: split.description || notes,
            balance_effect: txType === "Deposit" ? amount : -amount,
          });
        }
      }
      continue;
    }

    const category = categoryMap.get(toIdString(txn.categoryId)) || null;
    const amount = normalizeMoney(txn.amount);
    rows.push({
      transaction_id: transactionId,
      date: transactionDate,
      description: txn.description || "",
      account_name: accountName,
      account_code: accountCode,
      category_name: category?.accountName || "-",
      category_code: category?.accountCode || "",
      category_submenu: category?.submenuName || "",
      category_master: category?.masterName || "",
      entry_type: "single",
      transaction_type: txType,
      amount,
      customer_name: customerName,
      customer_uuid: customerUuid,
      vendor_name: vendorName,
      sales_tax: salesTax,
      reviewed: reviewedText,
      notes,
      balance_effect: txType === "Deposit" ? amount : -amount,
    });
  }

  return rows;
}

function buildSummary(rows = []) {
  let totalDeposit = 0;
  let totalWithdrawal = 0;

  for (const row of rows) {
    if (row.transaction_type === "Deposit") totalDeposit += normalizeMoney(row.amount);
    else if (row.transaction_type === "Withdrawal") totalWithdrawal += normalizeMoney(row.amount);
  }

  return {
    rows: rows.length,
    total_deposit: totalDeposit,
    total_withdrawal: totalWithdrawal,
    net: totalDeposit - totalWithdrawal,
  };
}

async function fetchExportPayload(query = {}) {
  const { filter, filters } = buildQueryFilter(query);

  const transactions = await AccountingTransaction.find(filter)
    .populate("accountId", "accountName accountCode currency")
    .populate("customerId", "name uuid")
    .populate("salesTaxId", "taxName abbreviation")
    .sort({ transactionDate: 1, createdAt: 1 })
    .lean();

  const splitTxnIds = transactions
    .filter((txn) => txn.isSplit)
    .map((txn) => txn._id);

  const splitRows = splitTxnIds.length
    ? await TransactionSplit.find({ transactionId: { $in: splitTxnIds } })
      .sort({ createdAt: 1, _id: 1 })
      .lean()
    : [];

  const splitMap = new Map();
  for (const split of splitRows) {
    const key = toIdString(split.transactionId);
    if (!splitMap.has(key)) splitMap.set(key, []);
    splitMap.get(key).push(split);
  }

  const categoryMap = await buildCategoryMapFromRows(transactions, splitRows);
  const rows = buildRowsForExport(transactions, splitMap, categoryMap);
  const summary = buildSummary(rows);

  const accounts = await CoaAccount.find({ isActive: true })
    .select("_id accountName accountCode")
    .sort({ accountName: 1 })
    .lean();

  return {
    filters,
    summary,
    accounts: accounts.map((item) => ({
      id: toIdString(item._id),
      name: item.accountName || "-",
      code: item.accountCode || "",
    })),
    rows,
  };
}

function buildTsv(rows = []) {
  const headers = [
    "Date",
    "Description",
    "Account",
    "Category",
    "Entry Type",
    "Transaction Type",
    "Amount",
    "Customer",
    "Customer UUID",
    "Vendor",
    "Sales Tax",
    "Reviewed",
    "Notes",
    "Transaction ID",
  ];

  const lines = [headers.join("\t")];

  for (const row of rows) {
    lines.push([
      escapeTsv(row.date),
      escapeTsv(row.description),
      escapeTsv(`${row.account_name}${row.account_code ? ` (${row.account_code})` : ""}`),
      escapeTsv(`${row.category_name}${row.category_code ? ` (${row.category_code})` : ""}`),
      escapeTsv(row.entry_type),
      escapeTsv(row.transaction_type),
      escapeTsv(formatNumber(row.amount)),
      escapeTsv(row.customer_name),
      escapeTsv(row.customer_uuid),
      escapeTsv(row.vendor_name),
      escapeTsv(row.sales_tax),
      escapeTsv(row.reviewed),
      escapeTsv(row.notes),
      escapeTsv(row.transaction_id),
    ].join("\t"));
  }

  return `\uFEFF${lines.join("\n")}`;
}

function chunkRows(input = [], chunkSize = 48) {
  const chunks = [];
  for (let i = 0; i < input.length; i += chunkSize) {
    chunks.push(input.slice(i, i + chunkSize));
  }
  return chunks.length ? chunks : [[]];
}

function buildPageStream(pageRows, title, subtitle, pageIndex, pageCount) {
  const streamLines = [
    "BT",
    "/F1 12 Tf",
    "50 805 Td",
    `(${escapePdfText(title)}) Tj`,
    "0 -16 Td",
    "/F1 8 Tf",
    `(${escapePdfText(`${subtitle} | Page ${pageIndex + 1}/${pageCount}`)}) Tj`,
    "0 -18 Td",
    `(${escapePdfText("Date | Account | Category | Type | Amount | Contact")}) Tj`,
    "0 -12 Td",
  ];

  for (const row of pageRows) {
    const text = [
      row.date,
      row.account_name,
      row.category_name,
      row.transaction_type,
      formatNumber(row.amount),
      row.customer_name !== "-" ? row.customer_name : row.vendor_name,
    ]
      .join(" | ")
      .slice(0, 130);

    streamLines.push(`(${escapePdfText(text)}) Tj`);
    streamLines.push("0 -12 Td");
  }

  streamLines.push("ET");
  return streamLines.join("\n");
}

function buildPdfBuffer(rows, title, subtitle) {
  const pages = chunkRows(rows, 48);
  const objects = {};

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  const pageIds = [];
  const contentIds = [];
  let nextId = 4;

  for (let i = 0; i < pages.length; i += 1) {
    const pageId = nextId;
    const contentId = nextId + 1;
    pageIds.push(pageId);
    contentIds.push(contentId);
    nextId += 2;
  }

  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  for (let i = 0; i < pages.length; i += 1) {
    const contentStream = buildPageStream(pages[i], title, subtitle, i, pages.length);
    objects[contentIds[i]] = `<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}\nendstream`;
    objects[pageIds[i]] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentIds[i]} 0 R >>`;
  }

  const maxObjectId = Math.max(...Object.keys(objects).map((value) => Number(value)));

  let pdfContent = "%PDF-1.4\n";
  const offsets = [0];

  for (let id = 1; id <= maxObjectId; id += 1) {
    const body = objects[id] || "";
    offsets[id] = Buffer.byteLength(pdfContent, "binary");
    pdfContent += `${id} 0 obj\n${body}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdfContent, "binary");
  pdfContent += `xref\n0 ${maxObjectId + 1}\n`;
  pdfContent += "0000000000 65535 f \n";

  for (let id = 1; id <= maxObjectId; id += 1) {
    pdfContent += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }

  pdfContent += `trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdfContent, "binary");
}

export const getFinanceExportIndex = async (req, res) => {
  try {
    const payload = await fetchExportPayload(req.query);

    return res.status(200).json({
      success: true,
      data: {
        filters: payload.filters,
        summary: payload.summary,
        accounts: payload.accounts,
        rows: payload.rows,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const exportFinanceExcel = async (req, res) => {
  try {
    const payload = await fetchExportPayload(req.query);
    const tsv = buildTsv(payload.rows);
    const filename = `finance_transactions_${payload.filters.start_date}_${payload.filters.end_date}.xls`;

    res.setHeader("Content-Type", "application/vnd.ms-excel; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
    return res.status(200).send(tsv);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const exportFinancePdf = async (req, res) => {
  try {
    const payload = await fetchExportPayload(req.query);
    const subtitle = `${payload.filters.start_date} - ${payload.filters.end_date}`;
    const pdfBuffer = buildPdfBuffer(payload.rows, "Finance Transaction Export", subtitle);
    const filename = `finance_transactions_${payload.filters.start_date}_${payload.filters.end_date}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=\"${filename}\"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
