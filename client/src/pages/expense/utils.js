import { API_URL } from "../../api/config";

export function formatMoney(value) {
  return `Rp ${Number(value || 0).toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function parseAmount(value) {
  if (value === null || value === undefined) return 0;
  const normalized = String(value)
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatInputNumber(value) {
  const amount = parseAmount(value);
  if (!Number.isFinite(amount)) return "";
  if (amount === 0 && String(value || "").trim() === "") return "";
  return amount.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function expenseStatusLabel(status) {
  const map = {
    uncategorized: "Uncategorized",
    pending: "Pending",
    waiting_approval: "Waiting Approval",
    approved: "Approved",
    waiting_payment: "Waiting Payment",
    paid: "Paid",
    rejected: "Rejected",
  };
  return map[status] || status || "-";
}

export function expenseStatusClass(status) {
  switch (status) {
    case "paid":
    case "approved":
      return "exp-status success";
    case "rejected":
      return "exp-status danger";
    case "uncategorized":
      return "exp-status muted";
    default:
      return "exp-status warning";
  }
}

export function buildUploadUrl(subdir, fileName) {
  if (!fileName) return "";
  return `${API_URL}/uploads/${subdir}/${encodeURIComponent(fileName)}`;
}

export function triggerBlobDownload(response, fallbackName) {
  const contentDisposition = response.headers?.["content-disposition"] || "";
  const match = contentDisposition.match(/filename="?([^";]+)"?/i);
  const filename = match?.[1] || fallbackName;
  const blob = new Blob([response.data]);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
