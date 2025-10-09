import express from "express";
const router = express.Router();
import { Member } from "../models/member.model.js";
import { Product } from "../models/product.model.js";
import { Savings } from "../models/savings.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Public API untuk integrasi eksternal (tanpa auth)
// GET /api/public/savings - Ambil semua data savings dengan detail lengkap
const getPublicSavings = asyncHandler(async (req, res) => {
  try {
    const savings = await Savings.find({ status: "Approved" })
      .populate({
        path: "memberId",
        select: "uuid name gender phone city",
        populate: {
          path: "user",
          select: "username"
        }
      })
      .populate({
        path: "productId",
        select: "title depositAmount returnProfit termDuration description"
      })
      .sort({ createdAt: -1 });

    // Format data untuk konsumsi eksternal
    const formattedSavings = savings.map(saving => ({
      id: saving._id,
      uuid: saving.uuid,
      member: {
        uuid: saving.memberId?.uuid,
        name: saving.memberId?.name,
        gender: saving.memberId?.gender,
        phone: saving.memberId?.phone,
        city: saving.memberId?.city,
        username: saving.memberId?.user?.username
      },
      product: {
        title: saving.productId?.title,
        depositAmount: saving.productId?.depositAmount,
        returnProfit: saving.productId?.returnProfit,
        termDuration: saving.productId?.termDuration,
        description: saving.productId?.description
      },
      amount: saving.amount,
      installmentPeriod: saving.installmentPeriod,
      savingsDate: saving.savingsDate,
      type: saving.type,
      status: saving.status,
      description: saving.description,
      createdAt: saving.createdAt,
      updatedAt: saving.updatedAt
    }));

    res.status(200).json({
      success: true,
      message: "Data savings berhasil diambil",
      data: formattedSavings,
      total: formattedSavings.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data savings",
      error: error.message
    });
  }
});

// GET /api/public/members - Ambil semua data anggota
const getPublicMembers = asyncHandler(async (req, res) => {
  try {
    const members = await Member.find()
      .populate("user", "username")
      .populate("product", "title depositAmount returnProfit termDuration")
      .sort({ createdAt: -1 });

    // Calculate total savings for each member
    const membersWithSavings = await Promise.all(
      members.map(async (member) => {
        const approvedSavings = await Savings.find({
          memberId: member._id,
          type: "Setoran",
          status: "Approved",
        });

        const totalSavings = approvedSavings.reduce(
          (sum, saving) => sum + saving.amount,
          0
        );

        return {
          id: member._id,
          uuid: member.uuid,
          name: member.name,
          gender: member.gender,
          phone: member.phone,
          city: member.city,
          completeAddress: member.completeAddress,
          username: member.user?.username,
          product: member.product ? {
            title: member.product.title,
            depositAmount: member.product.depositAmount,
            returnProfit: member.product.returnProfit,
            termDuration: member.product.termDuration
          } : null,
          totalSavings: totalSavings,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt
        };
      })
    );

    res.status(200).json({
      success: true,
      message: "Data anggota berhasil diambil",
      data: membersWithSavings,
      total: membersWithSavings.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data anggota",
      error: error.message
    });
  }
});

// GET /api/public/products - Ambil semua data produk
const getPublicProducts = asyncHandler(async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .sort({ createdAt: -1 });

    const formattedProducts = products.map(product => ({
      id: product._id,
      title: product.title,
      depositAmount: product.depositAmount,
      returnProfit: product.returnProfit,
      termDuration: product.termDuration,
      description: product.description,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));

    res.status(200).json({
      success: true,
      message: "Data produk berhasil diambil",
      data: formattedProducts,
      total: formattedProducts.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data produk",
      error: error.message
    });
  }
});

// GET /api/public/summary - Ambil ringkasan data
const getPublicSummary = asyncHandler(async (req, res) => {
  try {
    const totalMembers = await Member.countDocuments();
    const totalProducts = await Product.countDocuments({ isActive: true });
    
    const approvedSavings = await Savings.find({
      type: "Setoran",
      status: "Approved"
    });
    
    const approvedWithdrawals = await Savings.find({
      type: "Penarikan", 
      status: "Approved"
    });

    const totalSavings = approvedSavings.reduce((sum, s) => sum + s.amount, 0);
    const totalWithdrawals = approvedWithdrawals.reduce((sum, s) => sum + s.amount, 0);
    const balance = totalSavings - totalWithdrawals;

    res.status(200).json({
      success: true,
      message: "Ringkasan data berhasil diambil",
      data: {
        totalMembers,
        totalProducts,
        totalSavings,
        totalWithdrawals,
        balance,
        totalTransactions: approvedSavings.length + approvedWithdrawals.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil ringkasan data",
      error: error.message
    });
  }
});

// GET /api/public/member/:uuid - Ambil data member berdasarkan UUID dengan detail lengkap
const getMemberByUuid = asyncHandler(async (req, res) => {
  try {
    const { uuid } = req.params;
    
    // Cari member berdasarkan UUID
    const member = await Member.findOne({ uuid })
      .populate("user", "username")
      .populate("product", "title depositAmount returnProfit termDuration description");
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member dengan UUID tersebut tidak ditemukan"
      });
    }

    // Ambil semua savings untuk member ini
    const savings = await Savings.find({ 
      memberId: member._id,
      status: "Approved" 
    })
    .populate("productId", "title depositAmount returnProfit termDuration")
    .sort({ createdAt: -1 });

    // Hitung total setoran dan penarikan
    const totalSetoran = savings
      .filter(s => s.type === "Setoran")
      .reduce((sum, s) => sum + s.amount, 0);
    
    const totalPenarikan = savings
      .filter(s => s.type === "Penarikan")
      .reduce((sum, s) => sum + s.amount, 0);

    const saldo = totalSetoran - totalPenarikan;

    // Format response
    const response = {
      member: {
        uuid: member.uuid,
        name: member.name,
        gender: member.gender,
        phone: member.phone,
        city: member.city,
        completeAddress: member.completeAddress,
        username: member.user?.username
      },
      product: member.product ? {
        title: member.product.title,
        depositAmount: member.product.depositAmount,
        returnProfit: member.product.returnProfit,
        termDuration: member.product.termDuration,
        description: member.product.description
      } : null,
      savings: {
        totalSetoran: totalSetoran,
        totalPenarikan: totalPenarikan,
        saldo: saldo,
        totalTransaksi: savings.length,
        riwayat: savings.map(s => ({
          uuid: s.uuid,
          amount: s.amount,
          installmentPeriod: s.installmentPeriod,
          savingsDate: s.savingsDate,
          type: s.type,
          status: s.status,
          description: s.description,
          product: s.productId ? {
            title: s.productId.title,
            depositAmount: s.productId.depositAmount,
            returnProfit: s.productId.returnProfit,
            termDuration: s.productId.termDuration
          } : null,
          createdAt: s.createdAt
        }))
      }
    };

    res.status(200).json({
      success: true,
      message: "Data member berhasil diambil",
      data: response
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data member",
      error: error.message
    });
  }
});

// GET /api/public/student-dashboard/:uuid - Student Dashboard Savings by UUID (Public)
const getStudentDashboardSavings = asyncHandler(async (req, res) => {
  try {
    const { uuid } = req.params;

    if (!uuid) {
      return res.status(400).json({
        success: false,
        message: "Member UUID wajib diisi"
      });
    }

    // Find member by UUID
    const member = await Member.findOne({ uuid }).populate('productId');
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Kamu belum menjadi bagian dari anggota koperasi"
      });
    }

    if (!member.productId) {
      return res.status(404).json({
        success: false,
        message: "Member belum memiliki produk simpanan yang dipilih"
      });
    }

    // Get product details (tenor/term duration)
    const product = member.productId;

    // Get deposit history for this member (only approved deposits)
    const depositHistory = await Savings.find({ 
      memberId: member._id,
      type: "Setoran",
      status: "Approved"
    }).select('installmentPeriod amount proofFile');

    // Map deposit history by installment period
    const realizationAmountMap = {};
    const realizationProofFileMap = {};
    
    depositHistory.forEach(deposit => {
      realizationAmountMap[deposit.installmentPeriod] = deposit.amount;
      realizationProofFileMap[deposit.installmentPeriod] = deposit.proofFile || 0;
    });

    // Generate projection data for all periods
    const delivered = [];
    const currentDate = new Date();
    
    for (let i = 1; i <= product.termDuration; i++) {
      // Calculate date projection (adding i months to current date)
      const projectionDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      const dateProjection = projectionDate.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      });

      delivered.push({
        installment_period: i,
        projection: product.depositAmount.toString(),
        dateProjection: dateProjection,
        realization: realizationAmountMap[i] ? realizationAmountMap[i].toString() : 0,
        payment_proof: realizationProofFileMap[i] || 0
      });
    }

    res.status(200).json(delivered);

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data dashboard student",
      error: error.message
    });
  }
});

// Routes
router.get("/savings", getPublicSavings);
router.get("/members", getPublicMembers);
router.get("/products", getPublicProducts);
router.get("/summary", getPublicSummary);
router.get("/member/:uuid", getMemberByUuid);
router.get("/student-dashboard/:uuid", getStudentDashboardSavings);

export default router;