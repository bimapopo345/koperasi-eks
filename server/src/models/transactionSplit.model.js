import mongoose from "mongoose";

const transactionSplitSchema = new mongoose.Schema(
  {
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccountingTransaction",
      required: [true, "Transaction ID wajib diisi"],
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
      default: "account",
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

transactionSplitSchema.index({ transactionId: 1 });

const TransactionSplit = mongoose.model(
  "TransactionSplit",
  transactionSplitSchema
);

export { TransactionSplit };
