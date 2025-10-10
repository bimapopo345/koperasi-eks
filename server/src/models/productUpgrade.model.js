import mongoose from "mongoose";

const productUpgradeSchema = new mongoose.Schema(
  {
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
      index: true,
    },
    oldProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    newProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    upgradeDate: {
      type: Date,
      default: Date.now,
    },
    completedPeriodsAtUpgrade: {
      type: Number,
      required: true,
      min: 0,
    },
    oldMonthlyDeposit: {
      type: Number,
      required: true,
      min: 0,
    },
    newMonthlyDeposit: {
      type: Number,
      required: true,
      min: 0,
    },
    compensationPerMonth: {
      type: Number,
      required: true,
      min: 0,
    },
    newPaymentWithCompensation: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "CANCELLED"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual untuk mengakses data member
productUpgradeSchema.virtual("member", {
  ref: "Member",
  localField: "memberId",
  foreignField: "_id",
  justOne: true,
});

// Virtual untuk mengakses data produk lama
productUpgradeSchema.virtual("oldProduct", {
  ref: "Product",
  localField: "oldProductId",
  foreignField: "_id",
  justOne: true,
});

// Virtual untuk mengakses data produk baru
productUpgradeSchema.virtual("newProduct", {
  ref: "Product",
  localField: "newProductId",
  foreignField: "_id",
  justOne: true,
});

// Index untuk query yang sering digunakan
productUpgradeSchema.index({ memberId: 1, status: 1 });
productUpgradeSchema.index({ upgradeDate: -1 });

export const ProductUpgrade = mongoose.model("ProductUpgrade", productUpgradeSchema);
