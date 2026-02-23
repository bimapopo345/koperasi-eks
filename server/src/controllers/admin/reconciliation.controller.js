import { BankReconciliation } from "../../models/bankReconciliation.model.js";
import { BankReconciliationItem } from "../../models/bankReconciliationItem.model.js";
import { AccountingTransaction } from "../../models/accountingTransaction.model.js";
import { CoaAccount } from "../../models/coaAccount.model.js";

/**
 * Helper: calculate matched balance for a reconciliation
 */
async function calculateMatchedBalance(reconciliationId) {
  const items = await BankReconciliationItem.find({ reconciliationId, isMatched: true });
  let deposits = 0;
  let withdrawals = 0;

  for (const item of items) {
    const txn = await AccountingTransaction.findById(item.transactionId);
    if (txn) {
      if (txn.transactionType === "Deposit") deposits += Math.abs(txn.amount);
      else withdrawals += Math.abs(txn.amount);
    }
  }

  return deposits - withdrawals;
}

/**
 * Get reconciliation page data
 */
export const getReconciliation = async (req, res) => {
  try {
    const { accountId } = req.query;

    let selectedAccount = null;
    let history = [];
    let activeReconciliation = null;
    let lastCompleted = null;
    let startingBalance = 0;

    if (accountId) {
      selectedAccount = await CoaAccount.findById(accountId);
      history = await BankReconciliation.find({ accountId, status: "completed" }).sort({ statementEndDate: -1 });
      activeReconciliation = await BankReconciliation.findOne({ accountId, status: "in_progress" });
      lastCompleted = await BankReconciliation.findOne({ accountId, status: "completed" }).sort({ statementEndDate: -1 });
      startingBalance = lastCompleted ? lastCompleted.closingBalance : 0;
    }

    res.status(200).json({
      success: true,
      selectedAccount,
      history,
      activeReconciliation,
      lastCompleted,
      startingBalance,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Start new reconciliation
 */
export const startReconciliation = async (req, res) => {
  try {
    const { accountId, statementEndDate, closingBalance } = req.body;

    if (!accountId || !statementEndDate || closingBalance === undefined) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Check for existing active reconciliation
    const active = await BankReconciliation.findOne({ accountId, status: "in_progress" });
    if (active) {
      return res.status(400).json({ success: false, message: "There is already an active reconciliation for this account" });
    }

    // Get starting balance from last completed
    const lastCompleted = await BankReconciliation.findOne({ accountId, status: "completed" }).sort({ statementEndDate: -1 });
    const startingBalance = lastCompleted ? lastCompleted.closingBalance : 0;

    const recon = await BankReconciliation.create({
      accountId,
      statementEndDate,
      startingBalance,
      closingBalance: parseFloat(closingBalance),
      matchedBalance: 0,
      difference: parseFloat(closingBalance),
      status: "in_progress",
    });

    // Add unreconciled transactions up to statement end date
    const allTxns = await AccountingTransaction.find({
      accountId,
      transactionDate: { $lte: new Date(statementEndDate) },
    });

    // Get already reconciled transaction IDs from completed reconciliations
    const completedRecons = await BankReconciliation.find({ accountId, status: "completed" });
    const completedReconIds = completedRecons.map((r) => r._id);
    const reconciledItems = await BankReconciliationItem.find({
      reconciliationId: { $in: completedReconIds },
      isMatched: true,
    });
    const reconciledTxnIds = new Set(reconciledItems.map((i) => i.transactionId.toString()));

    const itemDocs = [];
    for (const txn of allTxns) {
      if (!reconciledTxnIds.has(txn._id.toString())) {
        itemDocs.push({
          reconciliationId: recon._id,
          transactionId: txn._id,
          isMatched: false,
        });
      }
    }

    if (itemDocs.length > 0) {
      await BankReconciliationItem.insertMany(itemDocs);
    }

    res.status(201).json({
      success: true,
      message: "Reconciliation started",
      reconciliationId: recon._id,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get reconciliation process data
 */
export const processReconciliation = async (req, res) => {
  try {
    const recon = await BankReconciliation.findById(req.params.id);
    if (!recon) {
      return res.status(404).json({ success: false, message: "Reconciliation not found" });
    }

    const account = await CoaAccount.findById(recon.accountId);

    // Clean up orphaned items
    const items = await BankReconciliationItem.find({ reconciliationId: recon._id });
    for (const item of items) {
      const txn = await AccountingTransaction.findById(item.transactionId);
      if (!txn) {
        await BankReconciliationItem.findByIdAndDelete(item._id);
      }
    }

    // Get transactions with match status
    const reconItems = await BankReconciliationItem.find({ reconciliationId: recon._id })
      .populate("transactionId");

    const transactions = reconItems
      .filter((item) => item.transactionId)
      .map((item) => ({
        ...item.transactionId.toObject(),
        isMatched: item.isMatched,
        itemId: item._id,
      }))
      .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

    // Calculate stats
    const matchedBalance = await calculateMatchedBalance(recon._id);
    const totalMatched = matchedBalance + recon.startingBalance;
    const unmatchedCount = transactions.filter((t) => !t.isMatched).length;

    // Update reconciliation balances
    recon.matchedBalance = totalMatched;
    recon.difference = recon.closingBalance - totalMatched;
    await recon.save();

    res.status(200).json({
      success: true,
      reconciliation: recon,
      account,
      transactions,
      matchedBalance: totalMatched,
      unmatchedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Toggle transaction match status
 */
export const toggleMatch = async (req, res) => {
  try {
    const { reconciliationId, transactionId } = req.body;

    if (!reconciliationId || !transactionId) {
      return res.status(400).json({ success: false, message: "Invalid request" });
    }

    const item = await BankReconciliationItem.findOne({ reconciliationId, transactionId });
    if (!item) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }

    item.isMatched = !item.isMatched;
    item.matchedAt = item.isMatched ? new Date() : null;
    await item.save();

    // Recalculate balances
    const recon = await BankReconciliation.findById(reconciliationId);
    const matchedBalance = await calculateMatchedBalance(reconciliationId);
    const totalMatched = matchedBalance + recon.startingBalance;
    recon.matchedBalance = totalMatched;
    recon.difference = recon.closingBalance - totalMatched;
    await recon.save();

    const unmatchedCount = await BankReconciliationItem.countDocuments({ reconciliationId, isMatched: false });

    res.status(200).json({
      success: true,
      matchedBalance: totalMatched,
      difference: recon.difference,
      unmatchedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Complete reconciliation
 */
export const completeReconciliation = async (req, res) => {
  try {
    const recon = await BankReconciliation.findById(req.params.id);
    if (!recon) {
      return res.status(404).json({ success: false, message: "Reconciliation not found" });
    }

    if (Math.abs(recon.difference) > 0.01) {
      return res.status(400).json({ success: false, message: "Cannot complete reconciliation. Difference must be $0.00" });
    }

    recon.status = "completed";
    recon.reconciledOn = new Date();
    await recon.save();

    res.status(200).json({ success: true, message: "Reconciliation completed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Cancel reconciliation
 */
export const cancelReconciliation = async (req, res) => {
  try {
    const recon = await BankReconciliation.findById(req.params.id);
    if (!recon) {
      return res.status(404).json({ success: false, message: "Reconciliation not found" });
    }

    await BankReconciliationItem.deleteMany({ reconciliationId: recon._id });
    await BankReconciliation.findByIdAndDelete(recon._id);

    res.status(200).json({ success: true, message: "Reconciliation cancelled" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Remove items from reconciliation
 */
export const removeItems = async (req, res) => {
  try {
    const { reconciliationId, transactionIds } = req.body;

    if (!reconciliationId || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return res.status(400).json({ success: false, message: "reconciliation_id and transaction_ids are required" });
    }

    const recon = await BankReconciliation.findById(reconciliationId);
    if (!recon || recon.status !== "in_progress") {
      return res.status(400).json({ success: false, message: "Only in-progress reconciliations can be modified" });
    }

    await BankReconciliationItem.deleteMany({
      reconciliationId,
      transactionId: { $in: transactionIds },
    });

    // Recalculate
    const matchedBalance = await calculateMatchedBalance(reconciliationId);
    const totalMatched = matchedBalance + (recon.startingBalance || 0);
    recon.matchedBalance = totalMatched;
    recon.difference = (recon.closingBalance || 0) - totalMatched;
    await recon.save();

    const unmatchedCount = await BankReconciliationItem.countDocuments({ reconciliationId, isMatched: false });

    res.status(200).json({
      success: true,
      unmatchedCount,
      matchedBalance: recon.matchedBalance,
      difference: recon.difference,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update closing balance
 */
export const updateClosingBalance = async (req, res) => {
  try {
    const { reconciliationId, closingBalance } = req.body;

    if (!reconciliationId || closingBalance === undefined) {
      return res.status(400).json({ success: false, message: "Invalid request" });
    }

    const recon = await BankReconciliation.findById(reconciliationId);
    if (!recon) {
      return res.status(404).json({ success: false, message: "Reconciliation not found" });
    }

    recon.closingBalance = parseFloat(closingBalance);
    recon.difference = recon.closingBalance - recon.matchedBalance;
    await recon.save();

    res.status(200).json({ success: true, difference: recon.difference });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * View completed reconciliation
 */
export const viewReconciliation = async (req, res) => {
  try {
    const recon = await BankReconciliation.findById(req.params.id);
    if (!recon) {
      return res.status(404).json({ success: false, message: "Reconciliation not found" });
    }

    const account = await CoaAccount.findById(recon.accountId);

    const matchedItems = await BankReconciliationItem.find({ reconciliationId: recon._id, isMatched: true })
      .populate("transactionId");

    const transactions = matchedItems
      .filter((item) => item.transactionId)
      .map((item) => ({
        ...item.transactionId.toObject(),
        isMatched: true,
        matchedAt: item.matchedAt,
      }))
      .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));

    res.status(200).json({
      success: true,
      reconciliation: recon,
      account,
      transactions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
