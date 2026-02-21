import mongoose from "mongoose";

const accountingTransactionSchema = new mongoose.Schema(
  {
    transactionDate: {
      type: Date,
      required: [true, "Tanggal transaksi wajib diisi"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CoaAccount",
      required: [true, "Account ID wajib diisi"],
    },
    transactionType: {
      type: String,
      enum: ["Deposit", "Withdrawal"],
      required: [true, "Tipe transaksi wajib diisi"],
    },
    amount: {
      type: Number,
      required: [true, "Jumlah wajib diisi"],
      min: [0, "Jumlah tidak boleh negatif"],
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    categoryType: {
      type: String,
      enum: ["master", "submenu", "account", null],
      default: null,
    },
    includeSalesTax: {
      type: Boolean,
      default: false,
    },
    salesTaxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesTax",
      default: null,
    },
    vendorId: {
      type: String,
      trim: true,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    receiptFile: {
      type: String,
      trim: true,
      default: null,
    },
    reviewed: {
      type: Boolean,
      default: false,
    },
    isSplit: {
      type: Boolean,
      default: false,
    },
    senderName: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

accountingTransactionSchema.index({ accountId: 1, transactionDate: -1 });
accountingTransactionSchema.index({ transactionDate: -1 });
accountingTransactionSchema.index({ reviewed: 1 });

const AccountingTransaction = mongoose.model(
  "AccountingTransaction",
  accountingTransactionSchema
);

export { AccountingTransaction };
