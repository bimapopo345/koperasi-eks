import mongoose from "mongoose";

const expenseAttachmentSchema = new mongoose.Schema(
  {
    expenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
      default: null,
      index: true,
    },
    formToken: {
      type: String,
      trim: true,
      default: "",
    },
    fileName: {
      type: String,
      required: [true, "Nama file wajib diisi"],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

expenseAttachmentSchema.index({ expenseId: 1, createdAt: 1 });

const ExpenseAttachment = mongoose.model("ExpenseAttachment", expenseAttachmentSchema);

export { ExpenseAttachment };
