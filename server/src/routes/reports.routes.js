import express from "express";
import {
  getProfitLoss,
  filterProfitLoss,
  exportProfitLossCsv,
  getBalanceSheet,
  filterBalanceSheet,
  exportBalanceSheetCsv,
  checkBalanceSheetSplits,
  getAccountTransactionsReport,
  filterAccountTransactionsReport,
  exportAccountTransactionsCsv,
} from "../controllers/admin/reports.controller.js";

const router = express.Router();

// Profit & Loss
router.get("/profit-loss", getProfitLoss);
router.post("/profit-loss/filter", filterProfitLoss);
router.get("/profit-loss/export-csv", exportProfitLossCsv);

// Balance Sheet
router.get("/balance-sheet", getBalanceSheet);
router.post("/balance-sheet/filter", filterBalanceSheet);
router.get("/balance-sheet/export-csv", exportBalanceSheetCsv);
router.get("/balance-sheet/check-splits", checkBalanceSheetSplits);

// Account Transactions
router.get("/account-transactions", getAccountTransactionsReport);
router.post("/account-transactions/filter", filterAccountTransactionsReport);
router.get("/account-transactions/export-csv", exportAccountTransactionsCsv);

export default router;
