import { ProductUpgrade } from "../../models/productUpgrade.model.js";
import { Member } from "../../models/member.model.js";
import { Product } from "../../models/product.model.js";
import { Savings } from "../../models/savings.model.js";
import mongoose from "mongoose";

// Calculate compensation for product upgrade
export const calculateUpgradeCompensation = async (req, res) => {
  try {
    const { memberId, newProductId } = req.body;

    // Validasi input
    if (!memberId || !newProductId) {
      return res.status(400).json({
        success: false,
        message: "Member ID dan Product ID baru harus diisi"
      });
    }

    // Ambil data member dengan populate produk saat ini
    const member = await Member.findById(memberId).populate("product");
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member tidak ditemukan"
      });
    }

    if (!member.productId) {
      return res.status(400).json({
        success: false,
        message: "Member belum memiliki produk simpanan"
      });
    }

    // Cek apakah sudah pernah upgrade
    if (member.hasUpgraded) {
      return res.status(400).json({
        success: false,
        message: "Member sudah pernah melakukan upgrade produk"
      });
    }

    // Ambil data produk baru
    const newProduct = await Product.findById(newProductId);
    if (!newProduct) {
      return res.status(404).json({
        success: false,
        message: "Produk baru tidak ditemukan"
      });
    }

    // Validasi produk baru harus lebih tinggi
    if (newProduct.depositAmount <= member.product.depositAmount) {
      return res.status(400).json({
        success: false,
        message: "Produk baru harus memiliki setoran yang lebih tinggi dari produk saat ini"
      });
    }

    // Hitung periode yang sudah lunas
    const completedSavings = await Savings.find({
      memberId: member._id,
      productId: member.productId,
      status: "Approved",
      type: "Setoran"
    }).sort({ installmentPeriod: 1 });

    // Kelompokkan berdasarkan periode dan hitung total per periode
    const periodPayments = {};
    completedSavings.forEach(saving => {
      if (!periodPayments[saving.installmentPeriod]) {
        periodPayments[saving.installmentPeriod] = 0;
      }
      periodPayments[saving.installmentPeriod] += saving.amount;
    });

    // Hitung berapa periode yang sudah lunas penuh
    let completedPeriods = 0;
    const oldMonthlyDeposit = member.product.depositAmount;

    for (let period = 1; period <= member.product.termDuration; period++) {
      if (periodPayments[period] && periodPayments[period] >= oldMonthlyDeposit) {
        completedPeriods++;
      } else {
        break; // Stop at first incomplete period
      }
    }

    // Hitung kompensasi
    const remainingPeriods = member.product.termDuration - completedPeriods;
    if (remainingPeriods <= 0) {
      return res.status(400).json({
        success: false,
        message: "Member sudah menyelesaikan seluruh periode simpanan"
      });
    }

    const newMonthlyDeposit = newProduct.depositAmount;
    
    // Calculate compensation using the correct formula:
    // Kompensasi per Bulan = (Setoran_Baru - Setoran_Lama) × Bulan_Sudah_Nabung / Sisa_Bulan
    const depositDifference = newMonthlyDeposit - oldMonthlyDeposit;
    const compensationPerMonth = Math.ceil((depositDifference * completedPeriods) / remainingPeriods);
    const newPaymentWithCompensation = newMonthlyDeposit + compensationPerMonth;

    // Return calculation result
    const calculationResult = {
      memberId: member._id,
      memberName: member.name,
      memberUuid: member.uuid,
      oldProductId: member.productId,
      oldProductTitle: member.product.title,
      oldMonthlyDeposit,
      newProductId: newProduct._id,
      newProductTitle: newProduct.title,
      newMonthlyDeposit,
      completedPeriodsAtUpgrade: completedPeriods,
      remainingPeriods,
      compensationPerMonth,
      newPaymentWithCompensation,
      totalPeriods: member.product.termDuration
    };

    return res.status(200).json({
      success: true,
      message: "Kalkulasi kompensasi berhasil",
      data: calculationResult
    });

  } catch (error) {
    console.error("Error calculating upgrade compensation:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat menghitung kompensasi",
      error: error.message
    });
  }
};

// Execute product upgrade TANPA transaction
export const executeProductUpgrade = async (req, res) => {
  try {
    const { memberId, newProductId, calculationResult } = req.body;

    // Validasi input
    if (!memberId || !newProductId || !calculationResult) {
      return res.status(400).json({
        success: false,
        message: "Data tidak lengkap untuk eksekusi upgrade",
      });
    }

    // Verifikasi ulang member
    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member tidak ditemukan",
      });
    }

    if (member.hasUpgraded) {
      return res.status(400).json({
        success: false,
        message: "Member sudah pernah melakukan upgrade",
      });
    }

    // Verifikasi ulang produk baru
    const newProduct = await Product.findById(newProductId);
    if (!newProduct) {
      return res.status(404).json({
        success: false,
        message: "Produk baru tidak ditemukan",
      });
    }

    // Buat record ProductUpgrade
    const productUpgrade = await ProductUpgrade.create({
      memberId: member._id,
      oldProductId: calculationResult.oldProductId,
      newProductId: newProduct._id,
      upgradeDate: new Date(),
      completedPeriodsAtUpgrade: calculationResult.completedPeriodsAtUpgrade,
      oldMonthlyDeposit: calculationResult.oldMonthlyDeposit,
      newMonthlyDeposit: calculationResult.newMonthlyDeposit,
      compensationPerMonth: calculationResult.compensationPerMonth,
      newPaymentWithCompensation: calculationResult.newPaymentWithCompensation,
      status: "ACTIVE",
    });

    // Pastikan upgradeHistory array
    if (!Array.isArray(member.upgradeHistory)) {
      member.upgradeHistory = [];
    }

    // Update Member
    member.hasUpgraded = true;
    member.currentUpgradeId = productUpgrade._id;
    member.upgradeHistory.push(productUpgrade._id);
    member.productId = newProduct._id;

    await member.save();

    // Populate buat response
    const populatedUpgrade = await ProductUpgrade.findById(productUpgrade._id)
      .populate("memberId", "uuid name")
      .populate("oldProductId", "title depositAmount")
      .populate("newProductId", "title depositAmount");

    return res.status(201).json({
      success: true,
      message: "Upgrade produk berhasil dilakukan",
      data: populatedUpgrade,
    });
  } catch (error) {
    console.error("Error executing product upgrade:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat melakukan upgrade produk",
      error: error.message,
    });
  }
};


// Get upgrade history for a member
export const getMemberUpgradeHistory = async (req, res) => {
  try {
    const { memberId } = req.params;

    const upgrades = await ProductUpgrade
      .find({ memberId, status: "ACTIVE" })
      .populate("oldProductId", "title depositAmount")
      .populate("newProductId", "title depositAmount")
      .sort({ upgradeDate: -1 });

    return res.status(200).json({
      success: true,
      data: upgrades
    });

  } catch (error) {
    console.error("Error fetching upgrade history:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat mengambil riwayat upgrade",
      error: error.message
    });
  }
};

// Cancel product upgrade (for rollback purposes) TANPA transaction
export const cancelProductUpgrade = async (req, res) => {
  try {
    const { upgradeId } = req.params;

    const upgrade = await ProductUpgrade.findById(upgradeId);
    if (!upgrade) {
      return res.status(404).json({
        success: false,
        message: "Upgrade tidak ditemukan",
      });
    }

    if (upgrade.status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Upgrade sudah dibatalkan sebelumnya",
      });
    }

    // Update status upgrade
    upgrade.status = "CANCELLED";
    await upgrade.save();

    // Revert member changes
    const member = await Member.findById(upgrade.memberId);
    if (member) {
      member.productId = upgrade.oldProductId;
      member.hasUpgraded = false;
      member.currentUpgradeId = null;

      if (!Array.isArray(member.upgradeHistory)) {
        member.upgradeHistory = [];
      }

      member.upgradeHistory = member.upgradeHistory.filter(
        (id) => !id.equals(upgrade._id)
      );

      await member.save();
    }

    return res.status(200).json({
      success: true,
      message: "Upgrade berhasil dibatalkan",
    });
  } catch (error) {
    console.error("Error cancelling upgrade:", error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat membatalkan upgrade",
      error: error.message,
    });
  }
};
