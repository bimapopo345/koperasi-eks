import mongoose from "mongoose";

const salesTaxSchema = new mongoose.Schema(
  {
    taxName: {
      type: String,
      required: [true, "Nama pajak wajib diisi"],
      trim: true,
      maxlength: [150, "Nama pajak maksimal 150 karakter"],
    },
    abbreviation: {
      type: String,
      required: [true, "Singkatan wajib diisi"],
      trim: true,
      uppercase: true,
      maxlength: [10, "Singkatan maksimal 10 karakter"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: [255, "Deskripsi maksimal 255 karakter"],
    },
    taxNumber: {
      type: String,
      trim: true,
      default: "",
      maxlength: [255, "Nomor pajak maksimal 255 karakter"],
    },
    showTaxNumberOnInvoices: {
      type: Boolean,
      default: false,
    },
    isRecoverable: {
      type: Boolean,
      default: false,
    },
    isCompoundTax: {
      type: Boolean,
      default: false,
    },
    taxRate: {
      type: Number,
      required: [true, "Tax rate wajib diisi"],
      min: [0, "Tax rate tidak boleh negatif"],
      max: [100, "Tax rate maksimal 100%"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

salesTaxSchema.index({ abbreviation: 1 }, { unique: true });
salesTaxSchema.index({ isActive: 1 });

const SalesTax = mongoose.model("SalesTax", salesTaxSchema);

export { SalesTax };
