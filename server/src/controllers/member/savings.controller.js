import { Savings } from "../../models/savings.model.js";
import { Member } from "../../models/member.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";

// Get Member's Savings
export const getMemberSavings = asyncHandler(async (req, res) => {
  try {
    const memberId = req.member.memberId;
    
    // Cari member berdasarkan ID dari token
    const member = await Member.findById(memberId);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member tidak ditemukan",
      });
    }

    // Cari savings berdasarkan member ID
    const savings = await Savings.find({ memberId: member._id })
      .populate('productId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Data savings berhasil diambil",
      data: {
        member: {
          uuid: member.uuid,
          name: member.name,
        },
        savings: savings,
        total: savings.length,
        totalAmount: savings.reduce((sum, saving) => sum + saving.amount, 0),
      },
    });
  } catch (error) {
    console.error("Get member savings error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message,
    });
  }
});

// Create New Saving for Member
export const createMemberSaving = asyncHandler(async (req, res) => {
  try {
    const memberId = req.member.memberId;
    const { amount, productId, description } = req.body;

    // Validasi input
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Jumlah saving harus lebih dari 0",
      });
    }

    // Jika tidak ada productId, skip untuk sementara karena required di model
    if (!productId && !member.productId) {
      return res.status(400).json({
        success: false,
        message: "Product ID diperlukan untuk membuat saving. Silakan hubungi admin untuk mengatur produk member.",
      });
    }

    // Cari member berdasarkan ID dari token
    const member = await Member.findById(memberId);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member tidak ditemukan",
      });
    }

    // Get product info for deposit amount comparison
    const Product = (await import("../../models/product.model.js")).Product;
    const product = await Product.findById(productId || member.productId);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product tidak ditemukan",
      });
    }

    // Calculate partial sequence for this period
    const existingSavingsCount = await Savings.countDocuments({
      memberId: member._id,
      productId: product._id,
      installmentPeriod: 1,
    });

    const partialSequence = existingSavingsCount + 1;

    // Auto-detect payment type
    const calculatedPaymentType = amount < product.depositAmount ? "Partial" : "Full";

    // Buat saving baru
    const newSaving = new Savings({
      memberId: member._id,
      productId: product._id,
      amount: amount,
      savingsDate: new Date(),
      installmentPeriod: 1,
      description: description || `Pembayaran Simpanan Periode - 1 ${partialSequence > 1 ? `(#${partialSequence})` : ''}`,
      type: "Setoran",
      status: "Pending", // Member API creates pending, needs admin approval
      paymentType: calculatedPaymentType,
      partialSequence: partialSequence,
      notes: notes || "",
    });

    await newSaving.save();

    // Populate product data
    await newSaving.populate('product');

    res.status(201).json({
      success: true,
      message: "Saving berhasil dibuat",
      data: {
        saving: newSaving,
        member: {
          uuid: member.uuid,
          name: member.name,
        },
      },
    });
  } catch (error) {
    console.error("Create member saving error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message,
    });
  }
});

// Get Specific Saving by ID
export const getMemberSavingById = asyncHandler(async (req, res) => {
  try {
    const memberId = req.member.memberId;
    const { id } = req.params;

    // Cari member berdasarkan ID dari token
    const member = await Member.findById(memberId);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member tidak ditemukan",
      });
    }

    // Cari saving berdasarkan ID dan pastikan milik member yang login
    const saving = await Savings.findOne({ 
      _id: id, 
      memberId: member._id 
    }).populate('productId');

    if (!saving) {
      return res.status(404).json({
        success: false,
        message: "Data saving tidak ditemukan atau bukan milik Anda",
      });
    }

    res.status(200).json({
      success: true,
      message: "Data saving berhasil diambil",
      data: {
        saving: saving,
        member: {
          uuid: member.uuid,
          name: member.name,
        },
      },
    });
  } catch (error) {
    console.error("Get member saving by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message,
    });
  }
});

// Get Member Savings Summary
export const getMemberSavingsSummary = asyncHandler(async (req, res) => {
  try {
    const memberId = req.member.memberId;
    
    // Cari member berdasarkan ID dari token
    const member = await Member.findById(memberId);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member tidak ditemukan",
      });
    }

    // Agregasi data savings
    const savingsData = await Savings.aggregate([
      { $match: { memberId: member._id } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" },
          totalTransactions: { $sum: 1 },
          lastTransaction: { $max: "$createdAt" },
          firstTransaction: { $min: "$createdAt" },
        }
      }
    ]);

    const summary = savingsData[0] || {
      totalAmount: 0,
      totalTransactions: 0,
      lastTransaction: null,
      firstTransaction: null,
    };

    res.status(200).json({
      success: true,
      message: "Summary savings berhasil diambil",
      data: {
        member: {
          uuid: member.uuid,
          name: member.name,
        },
        summary: summary,
      },
    });
  } catch (error) {
    console.error("Get member savings summary error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan server",
      error: error.message,
    });
  }
});