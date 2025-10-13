import mongoose from "mongoose";

const loanPaymentSchema = new mongoose.Schema(
  {
    uuid: {
      type: String,
      unique: true,
      trim: true,
    },
    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Loan",
      required: [true, "ID pinjaman wajib diisi"],
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: [true, "ID anggota wajib diisi"],
    },
    period: {
      type: Number,
      required: [true, "Periode cicilan wajib diisi"],
      min: [1, "Periode minimal 1"],
    },
    amount: {
      type: Number,
      required: [true, "Jumlah pembayaran wajib diisi"],
      min: [0, "Jumlah pembayaran tidak boleh negatif"],
    },
    paymentDate: {
      type: Date,
      required: [true, "Tanggal pembayaran wajib diisi"],
    },
    dueDate: {
      type: Date,
      required: [true, "Tanggal jatuh tempo wajib diisi"],
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected", "Partial"],
      default: "Pending",
    },
    paymentType: {
      type: String,
      enum: ["Full", "Partial", "Late"],
      default: "Full",
    },
    proofFile: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Deskripsi maksimal 500 karakter"],
    },
    notes: {
      type: String,
      default: "",
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    lateDays: {
      type: Number,
      default: 0,
    },
    lateFee: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual untuk mengakses data pinjaman
loanPaymentSchema.virtual("loan", {
  ref: "Loan",
  localField: "loanId",
  foreignField: "_id",
  justOne: true,
});

// Virtual untuk mengakses data anggota
loanPaymentSchema.virtual("member", {
  ref: "Member",
  localField: "memberId",
  foreignField: "_id",
  justOne: true,
});

// Index untuk query yang sering digunakan
loanPaymentSchema.index({ loanId: 1, period: 1 });
loanPaymentSchema.index({ memberId: 1, status: 1 });
loanPaymentSchema.index({ status: 1, createdAt: -1 });
loanPaymentSchema.index({ loanId: 1, status: 1, period: 1 });

// Pre-save hook untuk generate UUID dan calculate late days
loanPaymentSchema.pre("save", async function (next) {
  // Generate UUID jika baru dan belum ada
  if (this.isNew && !this.uuid) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 5);
    this.uuid = `LOANPAY_${timestamp}_${random}`.toUpperCase();
  }

  // Calculate late days if payment is late
  if (this.paymentDate && this.dueDate) {
    const payDate = new Date(this.paymentDate);
    const dueDate = new Date(this.dueDate);
    
    if (payDate > dueDate) {
      const diffTime = Math.abs(payDate - dueDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      this.lateDays = diffDays;
      this.paymentType = "Late";
      
      // Calculate late fee (example: 1% per day, max 10%)
      const lateFeePercentage = Math.min(diffDays * 0.01, 0.10);
      this.lateFee = Math.round(this.amount * lateFeePercentage);
    }
  }

  next();
});

// Method to check if payment is late
loanPaymentSchema.methods.isLate = function () {
  if (!this.paymentDate || !this.dueDate) return false;
  return new Date(this.paymentDate) > new Date(this.dueDate);
};

// Method to approve payment
loanPaymentSchema.methods.approvePayment = async function (userId) {
  this.status = "Approved";
  this.approvedBy = userId;
  this.approvedAt = new Date();

  // Update the loan's payment progress
  const Loan = mongoose.model("Loan");
  const loan = await Loan.findById(this.loanId);
  
  if (loan) {
    await loan.updatePaymentProgress(this.amount);
  }

  return this.save();
};

// Method to reject payment
loanPaymentSchema.methods.rejectPayment = async function (reason, userId) {
  this.status = "Rejected";
  this.rejectionReason = reason;
  this.approvedBy = userId;
  this.approvedAt = new Date();
  return this.save();
};

const LoanPayment = mongoose.model("LoanPayment", loanPaymentSchema);

export { LoanPayment };
