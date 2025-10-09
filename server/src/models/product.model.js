import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Nama produk wajib diisi"],
      trim: true,
      maxlength: [100, "Nama produk maksimal 100 karakter"],
    },
    depositAmount: {
      type: Number,
      required: [true, "Jumlah setoran wajib diisi"],
      min: [0, "Jumlah setoran tidak boleh negatif"],
    },
    returnProfit: {
      type: Number,
      required: [true, "Persentase keuntungan wajib diisi"],
      min: [0, "Persentase keuntungan tidak boleh negatif"],
      max: [100, "Persentase keuntungan maksimal 100%"],
    },
    termDuration: {
      type: Number,
      required: [true, "Durasi masa berlaku wajib diisi"],
      min: [1, "Durasi minimal 1 bulan"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Deskripsi maksimal 500 karakter"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index untuk query yang sering digunakan
productSchema.index({ isActive: 1, createdAt: -1 });

const Product = mongoose.model("Product", productSchema);

export { Product };
