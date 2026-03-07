import mongoose from "mongoose";
import { buildDonationCode } from "../utils/donation.js";

const donationSchema = new mongoose.Schema(
  {
    donationCode: {
      type: String,
      unique: true,
      trim: true,
    },
    studentCode: {
      type: String,
      required: [true, "Kode student donasi wajib diisi"],
      trim: true,
      index: true,
    },
    studentUuid: {
      type: String,
      required: [true, "UUID student wajib diisi"],
      trim: true,
      index: true,
    },
    studentName: {
      type: String,
      required: [true, "Nama student wajib diisi"],
      trim: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
      index: true,
    },
    campaignId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DonationCampaign",
      default: null,
      index: true,
    },
    campaignTitle: {
      type: String,
      trim: true,
      default: "",
    },
    beneficiaryName: {
      type: String,
      trim: true,
      default: "",
    },
    amount: {
      type: Number,
      required: [true, "Jumlah donasi wajib diisi"],
      min: [1, "Jumlah donasi minimal 1"],
    },
    paymentMethod: {
      type: String,
      enum: ["Manual", "QRIS", "DOKU_CHECKOUT"],
      default: "Manual",
    },
    source: {
      type: String,
      enum: ["savings_payment", "donation_page"],
      default: "donation_page",
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Deskripsi maksimal 500 karakter"],
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Catatan maksimal 1000 karakter"],
      default: "",
    },
    proofFile: {
      type: String,
      trim: true,
      default: "",
    },
    invoiceNumber: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    installmentPeriod: {
      type: Number,
      default: null,
    },
    paymentDate: {
      type: Date,
      default: null,
    },
    checkoutIntentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CheckoutIntent",
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: [500, "Alasan penolakan maksimal 500 karakter"],
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

donationSchema.index({ campaignId: 1, createdAt: -1 });
donationSchema.index({ studentUuid: 1, createdAt: -1 });

donationSchema.pre("save", function saveDonation(next) {
  if (this.isNew && !this.donationCode) {
    this.donationCode = buildDonationCode();
  }
  next();
});

export const Donation = mongoose.model("Donation", donationSchema);
