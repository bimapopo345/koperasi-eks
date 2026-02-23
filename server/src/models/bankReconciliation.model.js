import mongoose from "mongoose";

const bankReconciliationSchema = new mongoose.Schema(
  {
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CoaAccount",
      required: [true, "Account ID wajib diisi"],
    },
    statementEndDate: {
      type: Date,
      required: [true, "Statement end date wajib diisi"],
    },
    startingBalance: {
      type: Number,
      default: 0,
    },
    closingBalance: {
      type: Number,
      required: [true, "Closing balance wajib diisi"],
    },
    matchedBalance: {
      type: Number,
      default: 0,
    },
    difference: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "in_progress",
    },
    reconciledOn: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

bankReconciliationSchema.index({ accountId: 1, status: 1 });
bankReconciliationSchema.index({ accountId: 1, statementEndDate: -1 });

const BankReconciliation = mongoose.model(
  "BankReconciliation",
  bankReconciliationSchema
);

export { BankReconciliation };
