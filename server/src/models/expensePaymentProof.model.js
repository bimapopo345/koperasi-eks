import mongoose from "mongoose";

const expensePaymentProofSchema = new mongoose.Schema(
  {
    expenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
      required: [true, "Expense ID wajib diisi"],
      index: true,
    },
    fileName: {
      type: String,
      required: [true, "Nama file wajib diisi"],
      trim: true,
    },
    uploadedBy: {
      type: String,
      trim: true,
      default: "",
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

expensePaymentProofSchema.index({ expenseId: 1, uploadedAt: -1 });

const ExpensePaymentProof = mongoose.model("ExpensePaymentProof", expensePaymentProofSchema);

export { ExpensePaymentProof };
