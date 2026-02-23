import mongoose from "mongoose";

const bankReconciliationItemSchema = new mongoose.Schema(
  {
    reconciliationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BankReconciliation",
      required: [true, "Reconciliation ID wajib diisi"],
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccountingTransaction",
      required: [true, "Transaction ID wajib diisi"],
    },
    isMatched: {
      type: Boolean,
      default: false,
    },
    matchedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

bankReconciliationItemSchema.index({ reconciliationId: 1 });
bankReconciliationItemSchema.index({ transactionId: 1 });
bankReconciliationItemSchema.index({ reconciliationId: 1, isMatched: 1 });

const BankReconciliationItem = mongoose.model(
  "BankReconciliationItem",
  bankReconciliationItemSchema
);

export { BankReconciliationItem };
