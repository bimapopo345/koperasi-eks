import crypto from "crypto";

function sanitizeCodeSource(value = "") {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function buildStudentDonationCode(studentUuid = "") {
  const sanitized = sanitizeCodeSource(studentUuid);
  const base = sanitized || "STUDENT";
  const tail = base.slice(-4).padStart(4, "X");
  const hash = crypto.createHash("sha1").update(base).digest("hex").slice(0, 6).toUpperCase();
  return `STD-${tail}-${hash}`;
}

export function buildDonationCode() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `DON-${timestamp}-${random}`;
}

export function buildCampaignCode(title = "") {
  const slug = sanitizeCodeSource(title).slice(0, 6) || "CAMPAIGN";
  const timestamp = Date.now().toString(36).toUpperCase();
  return `CMP-${slug}-${timestamp}`;
}

export function maskStudentName(name = "") {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "Anonim";
  }

  return parts
    .map((part) => {
      if (part.length <= 2) {
        return `${part[0] || "*"}*`;
      }
      return `${part[0]}${"*".repeat(Math.max(part.length - 2, 1))}${part[part.length - 1]}`;
    })
    .join(" ");
}
