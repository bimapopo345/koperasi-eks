import { Savings } from "../../models/savings.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";
import fs from "fs";
import path from "path";

// Approve Savings
export const approveSavings = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  const userId = req.user.userId;

  const savings = await Savings.findById(id);
  if (!savings) {
    throw new ApiError(404, "Data simpanan tidak ditemukan");
  }

  if (savings.status === "Approved") {
    throw new ApiError(400, "Simpanan sudah disetujui sebelumnya");
  }

  savings.status = "Approved";
  savings.approvedBy = userId;
  savings.approvedAt = new Date();
  if (notes) savings.notes = notes;

  await savings.save();

  res.status(200).json(
    new ApiResponse(200, savings, "Simpanan berhasil disetujui")
  );
});

// Reject Savings
export const rejectSavings = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rejectionReason, notes } = req.body;
  const userId = req.user.userId;

  if (!rejectionReason) {
    throw new ApiError(400, "Alasan penolakan wajib diisi");
  }

  const savings = await Savings.findById(id);
  if (!savings) {
    throw new ApiError(404, "Data simpanan tidak ditemukan");
  }

  if (savings.status === "Approved") {
    throw new ApiError(400, "Simpanan yang sudah disetujui tidak dapat ditolak");
  }

  savings.status = "Rejected";
  savings.rejectionReason = rejectionReason;
  savings.approvedBy = userId;
  savings.approvedAt = new Date();
  if (notes) savings.notes = notes;

  await savings.save();

  res.status(200).json(
    new ApiResponse(200, savings, "Simpanan berhasil ditolak")
  );
});

// Mark as Partial
export const markAsPartial = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  const userId = req.user.userId;

  const savings = await Savings.findById(id);
  if (!savings) {
    throw new ApiError(404, "Data simpanan tidak ditemukan");
  }

  savings.status = "Partial";
  savings.paymentType = "Partial";
  savings.approvedBy = userId;
  savings.approvedAt = new Date();
  if (notes) savings.notes = notes;

  await savings.save();

  res.status(200).json(
    new ApiResponse(200, savings, "Simpanan ditandai sebagai pembayaran partial")
  );
});

// Get Savings Summary for Period
export const getSavingsPeriodSummary = asyncHandler(async (req, res) => {
  const { memberId, productId, installmentPeriod } = req.params;

  const periodSavings = await Savings.find({
    memberId,
    productId,
    installmentPeriod: Number(installmentPeriod)
  }).sort({ createdAt: 1 });

  const summary = {
    totalAmount: periodSavings.reduce((sum, s) => sum + s.amount, 0),
    transactions: periodSavings.length,
    approved: periodSavings.filter(s => s.status === "Approved").length,
    pending: periodSavings.filter(s => s.status === "Pending").length,
    rejected: periodSavings.filter(s => s.status === "Rejected").length,
    partial: periodSavings.filter(s => s.status === "Partial").length,
    transactions: periodSavings
  };

  res.status(200).json(
    new ApiResponse(200, summary, "Summary periode berhasil diambil")
  );
});