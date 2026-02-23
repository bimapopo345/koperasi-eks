import { AccountingTransaction } from "../../models/accountingTransaction.model.js";
import { TransactionSplit } from "../../models/transactionSplit.model.js";
import { CoaAccount } from "../../models/coaAccount.model.js";
import { CoaMaster } from "../../models/coaMaster.model.js";
import { CoaSubmenu } from "../../models/coaSubmenu.model.js";
import { SalesTax } from "../../models/salesTax.model.js";
import { BankReconciliationItem } from "../../models/bankReconciliationItem.model.js";
import { BankReconciliation } from "../../models/bankReconciliation.model.js";

/**
 * Helper: update account balance
 */
async function updateAccountBalance(accountId, amount, type, reverse = false) {
  const account = await CoaAccount.findById(accountId);
  if (!account) return false;

  let newBalance = account.balance || 0;
  if (reverse) {
    newBalance += type === "Deposit" ? -amount : amount;
  } else {
    newBalance += type === "Deposit" ? amount : -amount;
  }

  account.balance = newBalance;
  account.lastTransaction = new Date();
  await account.save();
  return true;
}

/**
 * Helper: resolve category name from categoryId + categoryType
 */
async function resolveCategoryName(categoryId, categoryType) {
  if (!categoryId || !categoryType) return null;
  try {
    if (categoryType === "master") {
      const m = await CoaMaster.findById(categoryId);
      return m ? m.masterName : null;
    } else if (categoryType === "submenu") {
      const s = await CoaSubmenu.findById(categoryId);
      return s ? s.submenuName : null;
    } else if (categoryType === "account") {
      const a = await CoaAccount.findById(categoryId);
      return a ? a.accountName : null;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * List all transactions
 */
export const getTransactions = async (req, res) => {
  try {
    const { account } = req.query;
    const filter = {};
    if (account) filter.accountId = account;

    const transactions = await AccountingTransaction.find(filter)
      .populate("accountId", "accountName accountCode currency balance")
      .populate("salesTaxId", "taxName abbreviation taxRate")
      .sort({ transactionDate: -1, createdAt: -1 });

    // Enrich with category names and splits
    const enriched = [];
    for (const txn of transactions) {
      const obj = txn.toObject();
      obj.categoryName = await resolveCategoryName(obj.categoryId, obj.categoryType);

      if (obj.isSplit) {
        const splits = await TransactionSplit.find({ transactionId: obj._id });
        const enrichedSplits = [];
        for (const sp of splits) {
          const spObj = sp.toObject();
          spObj.categoryName = await resolveCategoryName(spObj.categoryId, spObj.categoryType);
          enrichedSplits.push(spObj);
        }
        obj.splitCategories = enrichedSplits;
      }

      // Check if reconciled
      const reconItem = await BankReconciliationItem.findOne({ transactionId: obj._id, isMatched: true });
      obj.isReconciled = !!reconItem;

      enriched.push(obj);
    }

    res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get transaction detail (with splits)
 */
export const getTransaction = async (req, res) => {
  try {
    const txn = await AccountingTransaction.findById(req.params.id)
      .populate("accountId", "accountName accountCode currency")
      .populate("salesTaxId", "taxName abbreviation taxRate");

    if (!txn) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    const obj = txn.toObject();
    obj.categoryName = await resolveCategoryName(obj.categoryId, obj.categoryType);

    let splits = [];
    if (obj.isSplit) {
      const rawSplits = await TransactionSplit.find({ transactionId: obj._id });
      for (const sp of rawSplits) {
        const spObj = sp.toObject();
        spObj.categoryName = await resolveCategoryName(spObj.categoryId, spObj.categoryType);
        splits.push(spObj);
      }
    }

    res.status(200).json({ success: true, data: obj, splits });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Create transaction
 */
export const createTransaction = async (req, res) => {
  try {
    const {
      transactionDate, description, accountId, transactionType, amount,
      categoryId, categoryType, includeSalesTax, salesTaxId,
      vendorId, notes, senderName, splits,
    } = req.body;

    if (!transactionDate || !accountId || !transactionType || !amount) {
      return res.status(400).json({ success: false, message: "Field wajib tidak lengkap" });
    }
    if (!["Deposit", "Withdrawal"].includes(transactionType)) {
      return res.status(400).json({ success: false, message: "Tipe transaksi tidak valid" });
    }

    const hasSplits = Array.isArray(splits) && splits.length > 0;

    const txnData = {
      transactionDate,
      description: description || "",
      accountId,
      transactionType,
      amount: Math.abs(parseFloat(amount)),
      categoryId: hasSplits ? null : categoryId || null,
      categoryType: hasSplits ? null : categoryType || null,
      includeSalesTax: !!includeSalesTax,
      salesTaxId: salesTaxId || null,
      vendorId: vendorId || null,
      notes: notes || "",
      senderName: senderName || "",
      isSplit: hasSplits,
    };

    // Handle receipt file upload
    if (req.file) {
      txnData.receiptFile = req.file.filename;
    }

    const txn = await AccountingTransaction.create(txnData);

    // Create splits if provided
    if (hasSplits) {
      const splitDocs = splits.map((s) => ({
        transactionId: txn._id,
        amount: parseFloat(s.amount) || 0,
        categoryId: s.categoryId || null,
        categoryType: s.categoryType || "account",
        description: s.description || "",
      }));
      await TransactionSplit.insertMany(splitDocs);
    }

    // Update account balance
    await updateAccountBalance(accountId, txnData.amount, transactionType);

    res.status(201).json({
      success: true,
      message: "Transaction created successfully",
      data: txn,
      hasSplits,
      splitCount: hasSplits ? splits.length : 0,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update transaction
 */
export const updateTransaction = async (req, res) => {
  try {
    const txn = await AccountingTransaction.findById(req.params.id);
    if (!txn) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    const {
      transactionDate, description, accountId, transactionType, amount,
      categoryId, categoryType, includeSalesTax, salesTaxId,
      vendorId, notes, senderName, splits,
    } = req.body;

    if (!["Deposit", "Withdrawal"].includes(transactionType)) {
      return res.status(400).json({ success: false, message: "Tipe transaksi tidak valid" });
    }

    const hasSplits = Array.isArray(splits) && splits.length > 0;
    const newAmount = Math.abs(parseFloat(amount));

    // Reverse old balance
    await updateAccountBalance(txn.accountId, txn.amount, txn.transactionType, true);

    // Update fields
    txn.transactionDate = transactionDate || txn.transactionDate;
    txn.description = description !== undefined ? description : txn.description;
    txn.accountId = accountId || txn.accountId;
    txn.transactionType = transactionType || txn.transactionType;
    txn.amount = newAmount;
    txn.categoryId = hasSplits ? null : (categoryId || null);
    txn.categoryType = hasSplits ? null : (categoryType || null);
    txn.includeSalesTax = includeSalesTax !== undefined ? !!includeSalesTax : txn.includeSalesTax;
    txn.salesTaxId = salesTaxId || null;
    txn.vendorId = vendorId || null;
    txn.notes = notes !== undefined ? notes : txn.notes;
    txn.senderName = senderName !== undefined ? senderName : txn.senderName;
    txn.isSplit = hasSplits;

    if (req.file) {
      txn.receiptFile = req.file.filename;
    }

    await txn.save();

    // Replace splits
    await TransactionSplit.deleteMany({ transactionId: txn._id });
    if (hasSplits) {
      const splitDocs = splits.map((s) => ({
        transactionId: txn._id,
        amount: parseFloat(s.amount) || 0,
        categoryId: s.categoryId || null,
        categoryType: s.categoryType || "account",
        description: s.description || "",
      }));
      await TransactionSplit.insertMany(splitDocs);
    }

    // Apply new balance
    await updateAccountBalance(txn.accountId, newAmount, txn.transactionType);

    res.status(200).json({ success: true, message: "Transaction updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete transaction
 */
export const deleteTransaction = async (req, res) => {
  try {
    const txn = await AccountingTransaction.findById(req.params.id);
    if (!txn) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    // Remove from reconciliation items
    const affectedItems = await BankReconciliationItem.find({ transactionId: txn._id });
    const affectedReconIds = [...new Set(affectedItems.map((i) => i.reconciliationId.toString()))];
    await BankReconciliationItem.deleteMany({ transactionId: txn._id });

    // Reverse balance
    await updateAccountBalance(txn.accountId, txn.amount, txn.transactionType, true);

    // Delete splits
    await TransactionSplit.deleteMany({ transactionId: txn._id });

    // Delete transaction
    await AccountingTransaction.findByIdAndDelete(txn._id);

    // Recalculate affected reconciliations
    for (const rid of affectedReconIds) {
      try {
        const recon = await BankReconciliation.findById(rid);
        if (recon && recon.status === "in_progress") {
          const matchedBalance = await calculateMatchedBalance(rid);
          const totalMatched = matchedBalance + (recon.startingBalance || 0);
          recon.matchedBalance = totalMatched;
          recon.difference = (recon.closingBalance || 0) - totalMatched;
          await recon.save();
        }
      } catch { /* ignore */ }
    }

    res.status(200).json({ success: true, message: "Transaction deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Toggle reviewed status
 */
export const toggleReviewed = async (req, res) => {
  try {
    const txn = await AccountingTransaction.findById(req.params.id);
    if (!txn) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    txn.reviewed = !txn.reviewed;
    await txn.save();

    res.status(200).json({ success: true, message: "Review status updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * CSV bulk upload
 */
export const uploadTransactions = async (req, res) => {
  try {
    const { accountId, transactions: rows } = req.body;

    if (!accountId || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ success: false, message: "Account ID dan data transaksi wajib diisi" });
    }

    const account = await CoaAccount.findById(accountId);
    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    let imported = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 1;

      if (!row.date || !row.amount) {
        errors.push(`Line ${lineNum}: Missing date or amount`);
        continue;
      }

      const date = new Date(row.date);
      if (isNaN(date.getTime())) {
        errors.push(`Line ${lineNum}: Invalid date format`);
        continue;
      }

      let amount = Math.abs(parseFloat(row.amount));
      if (isNaN(amount) || amount <= 0) {
        errors.push(`Line ${lineNum}: Invalid amount`);
        continue;
      }

      let type = row.type;
      if (!["Deposit", "Withdrawal"].includes(type)) {
        type = amount >= 0 ? "Deposit" : "Withdrawal";
      }

      await AccountingTransaction.create({
        transactionDate: date,
        description: row.description || "",
        accountId,
        transactionType: type,
        amount,
      });

      await updateAccountBalance(accountId, amount, type);
      imported++;
    }

    res.status(200).json({
      success: true,
      message: `${imported} transactions imported successfully`,
      imported,
      errors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get account currency
 */
export const getAccountCurrency = async (req, res) => {
  try {
    const account = await CoaAccount.findById(req.params.id);
    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found" });
    }

    res.status(200).json({
      success: true,
      currency: account.currency || "Rp",
      accountName: account.accountName,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Helper: calculate matched balance for reconciliation
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
