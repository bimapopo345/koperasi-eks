import mongoose from "mongoose";
import { DonationCampaign } from "../../models/donationCampaign.model.js";
import { Donation } from "../../models/donation.model.js";
import { CheckoutIntent } from "../../models/checkoutIntent.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import { ApiError } from "../../utils/ApiError.js";

function normalizeDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function buildCampaignSummaries() {
  const campaigns = await DonationCampaign.find().sort({ isActive: -1, collectUntil: -1, createdAt: -1 }).lean();

  const donationSummary = await Donation.aggregate([
    {
      $group: {
        _id: "$campaignId",
        totalAmount: { $sum: { $cond: [{ $eq: ["$status", "Approved"] }, "$amount", 0] } },
        totalApproved: { $sum: { $cond: [{ $eq: ["$status", "Approved"] }, 1, 0] } },
        totalPending: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } },
        totalRejected: { $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] } },
      },
    },
  ]);

  const summaryByCampaign = new Map(
    donationSummary.map((item) => [String(item._id || "null"), item])
  );

  return campaigns.map((campaign) => {
    const summary = summaryByCampaign.get(String(campaign._id)) || {};
    return {
      ...campaign,
      totals: {
        approvedAmount: summary.totalAmount || 0,
        approvedCount: summary.totalApproved || 0,
        pendingCount: summary.totalPending || 0,
        rejectedCount: summary.totalRejected || 0,
      },
    };
  });
}

export const getDonationOverview = asyncHandler(async (req, res) => {
  const activeCampaign = await DonationCampaign.findOne({ isActive: true }).sort({ collectUntil: -1 }).lean();

  const [totals, monthlyRecap, recentDonations, campaigns] = await Promise.all([
    Donation.aggregate([
      {
        $group: {
          _id: null,
          totalApprovedAmount: { $sum: { $cond: [{ $eq: ["$status", "Approved"] }, "$amount", 0] } },
          totalPendingAmount: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, "$amount", 0] } },
          totalApprovedCount: { $sum: { $cond: [{ $eq: ["$status", "Approved"] }, 1, 0] } },
          totalPendingCount: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } },
        },
      },
    ]),
    Donation.aggregate([
      { $match: { status: "Approved" } },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 },
    ]),
    Donation.find()
      .populate("campaignId", "title beneficiaryName")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    buildCampaignSummaries(),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      activeCampaign,
      totals: totals[0] || {
        totalApprovedAmount: 0,
        totalPendingAmount: 0,
        totalApprovedCount: 0,
        totalPendingCount: 0,
      },
      monthlyRecap,
      recentDonations,
      campaigns,
    })
  );
});

export const getDonationCampaigns = asyncHandler(async (req, res) => {
  const campaigns = await buildCampaignSummaries();
  res.status(200).json(new ApiResponse(200, campaigns));
});

export const createDonationCampaign = asyncHandler(async (req, res) => {
  const {
    title,
    description = "",
    beneficiaryName,
    usagePlan = "",
    startDate,
    collectUntil,
    disbursementDate,
    resetAt,
    notes = "",
    isActive = true,
  } = req.body;

  if (!title || !beneficiaryName || !collectUntil || !disbursementDate) {
    throw new ApiError(400, "Judul, tujuan, batas pengumpulan, dan tanggal penyaluran wajib diisi");
  }

  const payload = {
    title: String(title).trim(),
    description: String(description || "").trim(),
    beneficiaryName: String(beneficiaryName).trim(),
    usagePlan: String(usagePlan || "").trim(),
    startDate: normalizeDate(startDate) || new Date(),
    collectUntil: normalizeDate(collectUntil),
    disbursementDate: normalizeDate(disbursementDate),
    resetAt: normalizeDate(resetAt),
    notes: String(notes || "").trim(),
    isActive: Boolean(isActive),
    createdBy: req.user?.userId || null,
    updatedBy: req.user?.userId || null,
  };

  if (!payload.collectUntil || !payload.disbursementDate) {
    throw new ApiError(400, "Format tanggal campaign tidak valid");
  }

  if (payload.isActive) {
    await DonationCampaign.updateMany({ isActive: true }, { $set: { isActive: false } });
  }

  const campaign = await DonationCampaign.create(payload);
  res.status(201).json(new ApiResponse(201, campaign, "Campaign donasi berhasil dibuat"));
});

export const updateDonationCampaign = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const campaign = await DonationCampaign.findById(id);

  if (!campaign) {
    throw new ApiError(404, "Campaign donasi tidak ditemukan");
  }

  const updatableFields = [
    "title",
    "description",
    "beneficiaryName",
    "usagePlan",
    "notes",
  ];

  updatableFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      campaign[field] = req.body[field];
    }
  });

  const dateFields = ["startDate", "collectUntil", "disbursementDate", "resetAt"];
  dateFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      campaign[field] = normalizeDate(req.body[field]);
    }
  });

  if (req.body.isActive !== undefined) {
    const nextIsActive = Boolean(req.body.isActive);
    if (nextIsActive) {
      await DonationCampaign.updateMany(
        { _id: { $ne: campaign._id }, isActive: true },
        { $set: { isActive: false } }
      );
    }
    campaign.isActive = nextIsActive;
  }

  campaign.updatedBy = req.user?.userId || null;
  await campaign.save();

  res.status(200).json(new ApiResponse(200, campaign, "Campaign donasi berhasil diperbarui"));
});

export const activateDonationCampaign = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const campaign = await DonationCampaign.findById(id);

  if (!campaign) {
    throw new ApiError(404, "Campaign donasi tidak ditemukan");
  }

  await DonationCampaign.updateMany({ isActive: true }, { $set: { isActive: false } });
  campaign.isActive = true;
  campaign.updatedBy = req.user?.userId || null;
  await campaign.save();

  res.status(200).json(new ApiResponse(200, campaign, "Campaign donasi aktif berhasil diubah"));
});

export const deleteDonationCampaign = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const campaign = await DonationCampaign.findById(id);

  if (!campaign) {
    throw new ApiError(404, "Campaign donasi tidak ditemukan");
  }

  const relatedDonations = await Donation.countDocuments({ campaignId: campaign._id });
  if (relatedDonations > 0) {
    throw new ApiError(400, "Campaign masih punya transaksi donasi. Hapus transaksi donasinya dulu.");
  }

  await CheckoutIntent.deleteMany({ campaignId: campaign._id });
  await campaign.deleteOne();

  res.status(200).json(new ApiResponse(200, { id }, "Campaign donasi berhasil dihapus"));
});

export const getDonations = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 200);
  const { status, campaignId, search } = req.query;
  const query = {};

  if (status) query.status = status;
  if (campaignId) {
    if (!mongoose.Types.ObjectId.isValid(campaignId)) {
      throw new ApiError(400, "Campaign ID tidak valid");
    }
    query.campaignId = campaignId;
  }

  if (search) {
    query.$or = [
      { studentName: { $regex: search, $options: "i" } },
      { studentUuid: { $regex: search, $options: "i" } },
      { donationCode: { $regex: search, $options: "i" } },
      { studentCode: { $regex: search, $options: "i" } },
    ];
  }

  const [donations, total] = await Promise.all([
    Donation.find(query)
      .populate("campaignId", "title beneficiaryName collectUntil disbursementDate isActive")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Donation.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      donations,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
      },
    })
  );
});

export const approveDonation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const donation = await Donation.findById(id);

  if (!donation) {
    throw new ApiError(404, "Data donasi tidak ditemukan");
  }

  donation.status = "Approved";
  donation.approvedAt = new Date();
  donation.approvedBy = req.user?.userId || null;
  donation.rejectionReason = "";
  if (!donation.paymentDate) {
    donation.paymentDate = new Date();
  }
  await donation.save();

  res.status(200).json(new ApiResponse(200, donation, "Donasi berhasil disetujui"));
});

export const rejectDonation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejectionReason = "" } = req.body;
  const donation = await Donation.findById(id);

  if (!donation) {
    throw new ApiError(404, "Data donasi tidak ditemukan");
  }

  donation.status = "Rejected";
  donation.rejectionReason = String(rejectionReason || "").trim();
  donation.approvedAt = null;
  donation.approvedBy = null;
  await donation.save();

  res.status(200).json(new ApiResponse(200, donation, "Donasi berhasil ditolak"));
});

export const deleteDonation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const donation = await Donation.findById(id);

  if (!donation) {
    throw new ApiError(404, "Data donasi tidak ditemukan");
  }

  await donation.deleteOne();

  res.status(200).json(
    new ApiResponse(200, { id, donationCode: donation.donationCode }, "Donasi berhasil dihapus")
  );
});
