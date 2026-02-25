import mongoose from "mongoose";

const coaAccountSchema = new mongoose.Schema(
  {
    submenuId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CoaSubmenu",
      required: [true, "Submenu ID wajib diisi"],
    },
    accountCode: {
      type: String,
      trim: true,
    },
    accountName: {
      type: String,
      required: [true, "Account name wajib diisi"],
      trim: true,
      maxlength: [255, "Account name maksimal 255 karakter"],
    },
    currency: {
      type: String,
      trim: true,
      default: "",
      maxlength: [10, "Currency maksimal 10 karakter"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    lastTransaction: {
      type: Date,
    },
    balance: {
      type: Number,
      default: 0,
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

coaAccountSchema.index({ submenuId: 1, accountName: 1 });
coaAccountSchema.index({ accountCode: 1 }, { unique: true, sparse: true });

const CoaAccount = mongoose.model("CoaAccount", coaAccountSchema);

export { CoaAccount };
