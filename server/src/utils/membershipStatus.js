export const MEMBERSHIP_STATUSES = Object.freeze(["draft", "active", "inactive"]);

export const normalizeMembershipStatus = (value) => {
  const normalized = String(value ?? "").trim().toLowerCase();
  return MEMBERSHIP_STATUSES.includes(normalized) ? normalized : "";
};

// Existing members predate this field. Treat an empty value as active so the
// new gate cannot silently stop a legacy member from paying before Finance
// has reviewed their status in the admin panel.
export const getEffectiveMembershipStatus = (member = {}) =>
  normalizeMembershipStatus(member.membershipStatus) || "active";

export const isMembershipActive = (member = {}) =>
  getEffectiveMembershipStatus(member) === "active";

export const getMembershipStatusMessage = (status) => {
  if (status === "draft") {
    return "Tabungan Anda belum dibuka oleh tim Finance. Silakan tunggu sampai status keanggotaan diaktifkan.";
  }
  if (status === "inactive") {
    return "Tabungan Anda sudah ditutup. Pembayaran baru tidak dapat dilakukan.";
  }
  return "";
};
