import mongoose from "mongoose";

const expenseLineSchema = new mongoose.Schema(
  {
    expenseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Expense",
      required: [true, "Expense ID wajib diisi"],
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CoaAccount",
      required: [true, "Kategori wajib diisi"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    amount: {
      type: Number,
      required: [true, "Amount wajib diisi"],
      min: [0, "Amount tidak boleh negatif"],
    },
  },
  {
    timestamps: true,
  }
);

expenseLineSchema.index({ expenseId: 1, createdAt: 1 });

const ExpenseLine = mongoose.model("ExpenseLine", expenseLineSchema);

export { ExpenseLine };
