import mongoose from "mongoose";
import { buildCampaignCode } from "../utils/donation.js";

const donationCampaignSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      unique: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, "Judul campaign donasi wajib diisi"],
      trim: true,
      maxlength: [150, "Judul maksimal 150 karakter"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Deskripsi maksimal 2000 karakter"],
      default: "",
    },
    beneficiaryName: {
      type: String,
      required: [true, "Tujuan donasi wajib diisi"],
      trim: true,
      maxlength: [150, "Tujuan maksimal 150 karakter"],
    },
    usagePlan: {
      type: String,
      trim: true,
      maxlength: [500, "Rencana penggunaan maksimal 500 karakter"],
      default: "",
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    collectUntil: {
      type: Date,
      required: [true, "Batas pengumpulan wajib diisi"],
    },
    disbursementDate: {
      type: Date,
      required: [true, "Tanggal penyaluran wajib diisi"],
    },
    resetAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Catatan maksimal 1000 karakter"],
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

donationCampaignSchema.index({ isActive: 1, collectUntil: -1 });

donationCampaignSchema.pre("save", function saveCampaign(next) {
  if (this.isNew && !this.code) {
    this.code = buildCampaignCode(this.title);
  }
  next();
});

export const DonationCampaign = mongoose.model("DonationCampaign", donationCampaignSchema);
