import { Savings } from "../../models/savings.model.js";
import { Member } from "../../models/member.model.js";
import { Product } from "../../models/product.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import {
  createSavingsSchema,
  updateSavingsSchema,
  querySavingsSchema,
} from "../../validations/savings.validation.js";

// Get all savings
const getAllSavings = asyncHandler(async (req, res) => {
  const { error, value } = querySavingsSchema.validate(req.query);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const { page, limit, status, memberId } = value;
  const query = {};

  if (status) query.status = status;
  if (memberId) query.memberId = memberId;

  const savings = await Savings.find(query)
    .populate("memberId", "name email phone")
    .populate("productId", "title depositAmount returnProfit termDuration")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);

  const total = await Savings.countDocuments(query);

  res.status(200).json(
    new ApiResponse(200, {
      savings,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    })
  );
});

// Get single savings by ID
const getSavingsById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const savings = await Savings.findById(id)
    .populate("memberId", "name email phone")
    .populate("productId");

  if (!savings) {
    throw new ApiError(404, "Data simpanan tidak ditemukan");
  }

  res.status(200).json(new ApiResponse(200, savings));
});

// Create new savings
const createSavings = asyncHandler(async (req, res) => {
  // Parse body data (handle both JSON and FormData)
  let bodyData = { ...req.body };
  
  console.log("Raw request body:", req.body);
  console.log("Request file:", req.file);
  console.log("Content-Type:", req.get('Content-Type'));
  
  // Convert string numbers to actual numbers (FormData sends everything as strings)
  Object.keys(bodyData).forEach(key => {
    if (key === 'amount' || key === 'installmentPeriod') {
      if (bodyData[key] && typeof bodyData[key] === 'string') {
        const num = Number(bodyData[key]);
        if (!isNaN(num)) {
          bodyData[key] = num;
        }
      }
    }
  });

  console.log("Processed body data:", bodyData);
  console.log("installmentPeriod:", bodyData.installmentPeriod, typeof bodyData.installmentPeriod);

  const { error, value } = createSavingsSchema.validate(bodyData);
  if (error) {
    console.log("Validation error:", error.details[0].message);
    console.log("Failed validation for:", error.details[0].path);
    console.log("Validation details:", error.details);
    throw new ApiError(400, error.details[0].message);
  }

  const {
    installmentPeriod,
    memberId,
    productId,
    amount,
    savingsDate,
    type,
    description,
    status,
  } = value;

  // Validate member exists
  const member = await Member.findById(memberId);
  if (!member) {
    throw new ApiError(404, "Anggota tidak ditemukan");
  }

  // Validate product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Produk tidak ditemukan");
  }

  // Validate amount against product limits
  if (amount < product.depositAmount) {
    throw new ApiError(400, `Jumlah simpanan minimal ${product.depositAmount}`);
  }

  // Check for duplicate installment period for same member and product
  const existingSavings = await Savings.findOne({
    memberId,
    productId,
    installmentPeriod,
  });

  if (existingSavings) {
    throw new ApiError(
      400,
      `Kamu sudah pernah menambahkan data periode ${installmentPeriod} untuk produk ini`
    );
  }

  const savings = new Savings({
    installmentPeriod,
    memberId,
    productId,
    amount,
    savingsDate: savingsDate || new Date(),
    type: type || "Setoran",
    description: description || `Pembayaran Simpanan Periode - ${installmentPeriod}`,
    status: status || "Pending",
    proofFile: req.file ? req.file.path : null,
  });

  await savings.save();

  res
    .status(201)
    .json(new ApiResponse(201, savings, "Data simpanan berhasil dibuat"));
});

// Update savings
const updateSavings = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Ambil semua field dari form data
  const updateData = {};

  // Ambil semua field yang dikirim
  const fields = [
    "installmentPeriod",
    "memberId",
    "productId",
    "amount",
    "savingsDate",
    "type",
    "description",
    "status",
  ];

  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  // Handle file upload jika ada
  if (req.file) {
    updateData.proofFile = req.file.path;
  }

  // Validasi member dan product jika diupdate
  if (updateData.memberId) {
    const member = await Member.findById(updateData.memberId);
    if (!member) {
      throw new ApiError(404, "Anggota tidak ditemukan");
    }
  }

  if (updateData.productId) {
    const product = await Product.findById(updateData.productId);
    if (!product) {
      throw new ApiError(404, "Produk tidak ditemukan");
    }

    // Validasi amount terhadap product
    if (updateData.amount && updateData.amount < product.depositAmount) {
      throw new ApiError(
        400,
        `Jumlah simpanan minimal ${product.depositAmount}`
      );
    }
  }

  // Check for duplicate installment period when updating
  if (
    updateData.installmentPeriod &&
    updateData.memberId &&
    updateData.productId
  ) {
    const existingSavings = await Savings.findOne({
      memberId: updateData.memberId,
      productId: updateData.productId,
      installmentPeriod: updateData.installmentPeriod,
      _id: { $ne: id }, // Exclude current savings
    });

    if (existingSavings) {
      throw new ApiError(
        400,
        `Kamu sudah pernah menambahkan data periode ${updateData.installmentPeriod} untuk produk ini`
      );
    }
  }

  const savings = await Savings.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  })
    .populate("memberId", "name email phone")
    .populate("productId");

  if (!savings) {
    throw new ApiError(404, "Data simpanan tidak ditemukan");
  }

  res
    .status(200)
    .json(new ApiResponse(200, savings, "Data simpanan berhasil diperbarui"));
});

// Delete savings
const deleteSavings = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const savings = await Savings.findByIdAndDelete(id);

  if (!savings) {
    throw new ApiError(404, "Data simpanan tidak ditemukan");
  }

  res
    .status(200)
    .json(new ApiResponse(200, null, "Data simpanan berhasil dihapus"));
});

// Get savings by member
const getSavingsByMember = asyncHandler(async (req, res) => {
  const { error, value } = querySavingsSchema.validate(req.query);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const { memberId } = req.params;
  const { page, limit } = value;

  const savings = await Savings.find({ memberId })
    .populate("memberId", "name email phone")
    .populate("productId", "title depositAmount returnProfit termDuration")
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);

  const total = await Savings.countDocuments({ memberId });

  // Calculate total savings
  const approvedSavings = await Savings.find({
    memberId,
    status: "Approved",
    type: "Setoran",
  });
  const approvedWithdrawals = await Savings.find({
    memberId,
    status: "Approved",
    type: "Penarikan",
  });

  const totalSavings = approvedSavings.reduce((sum, s) => sum + s.amount, 0);
  const totalWithdrawals = approvedWithdrawals.reduce(
    (sum, s) => sum + s.amount,
    0
  );
  const balance = totalSavings - totalWithdrawals;

  res.status(200).json(
    new ApiResponse(200, {
      savings,
      summary: {
        totalSavings,
        totalWithdrawals,
        balance,
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    })
  );
});

// Get savings summary
const getSavingsSummary = asyncHandler(async (req, res) => {
  const { error, value } = querySavingsSchema.validate(req.query);
  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  const { memberId } = value;
  const matchQuery = { status: "Approved" };
  if (memberId) matchQuery.memberId = memberId;

  const savings = await Savings.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: "$type",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  const totalSavings =
    savings.find((s) => s._id === "Setoran")?.totalAmount || 0;
  const totalWithdrawals =
    savings.find((s) => s._id === "Penarikan")?.totalAmount || 0;
  const balance = totalSavings - totalWithdrawals;

  res.status(200).json(
    new ApiResponse(200, {
      totalSavings,
      totalWithdrawals,
      balance,
    })
  );
});

// Get last installment period for member and product
const getLastInstallmentPeriod = asyncHandler(async (req, res) => {
  const { memberId, productId } = req.params;

  if (!memberId || !productId) {
    return res.status(400).json({
      success: false,
      message: "Member ID dan Product ID wajib diisi"
    });
  }

  try {
    const lastSavings = await Savings.findOne({
      memberId,
      productId,
    })
      .sort({ installmentPeriod: -1 })
      .select("installmentPeriod");

    const lastPeriod = lastSavings ? lastSavings.installmentPeriod : 0;
    const nextPeriod = lastPeriod + 1;

    res.status(200).json({
      success: true,
      data: {
        lastPeriod,
        nextPeriod,
      },
      message: "Periode cicilan terakhir berhasil didapatkan"
    });
  } catch (error) {
    console.error("Error in getLastInstallmentPeriod:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mendapatkan periode cicilan terakhir",
      error: error.message
    });
  }
});

// Get student dashboard savings by member UUID
const getStudentDashboardSavings = asyncHandler(async (req, res) => {
  const { memberUuid } = req.params;

  if (!memberUuid) {
    throw new ApiError(400, "Member UUID wajib diisi");
  }

  // Find member by UUID
  const member = await Member.findOne({ uuid: memberUuid }).populate(
    "productId"
  );

  if (!member) {
    throw new ApiError(404, "Kamu belum menjadi bagian dari anggota koperasi");
  }

  if (!member.productId) {
    throw new ApiError(
      404,
      "Member belum memiliki produk simpanan yang dipilih"
    );
  }

  // Get product details (tenor/term duration)
  const product = member.productId;

  // Get deposit history for this member
  const depositHistory = await Savings.find({
    memberId: member._id,
    type: "Setoran",
    status: "Approved",
  }).select("installmentPeriod amount proofFile");

  // Map deposit history by installment period
  const realizationAmountMap = {};
  const realizationProofFileMap = {};

  depositHistory.forEach((deposit) => {
    realizationAmountMap[deposit.installmentPeriod] = deposit.amount;
    realizationProofFileMap[deposit.installmentPeriod] = deposit.proofFile || 0;
  });

  // Generate projection data for all periods
  const delivered = [];
  const currentDate = new Date();

  for (let i = 1; i <= product.termDuration; i++) {
    // Calculate date projection (adding i months to current date)
    const projectionDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + i,
      1
    );
    const dateProjection = projectionDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    delivered.push({
      installment_period: i,
      projection: product.depositAmount.toString(),
      dateProjection: dateProjection,
      realization: realizationAmountMap[i]
        ? realizationAmountMap[i].toString()
        : 0,
      payment_proof: realizationProofFileMap[i] || 0,
    });
  }

  res.status(200).json(delivered);
});

export {
  getAllSavings,
  getSavingsById,
  createSavings,
  updateSavings,
  deleteSavings,
  getSavingsByMember,
  getSavingsSummary,
  getLastInstallmentPeriod,
  getStudentDashboardSavings,
};
