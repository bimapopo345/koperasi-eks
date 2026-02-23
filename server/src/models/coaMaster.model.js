import mongoose from "mongoose";

const coaMasterSchema = new mongoose.Schema(
  {
    masterName: {
      type: String,
      required: [true, "Master name wajib diisi"],
      enum: ["Assets", "Liabilities", "Equity", "Income", "Expenses"],
      unique: true,
      trim: true,
    },
    masterCode: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
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

const CoaMaster = mongoose.model("CoaMaster", coaMasterSchema);

export { CoaMaster };
