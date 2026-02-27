import express from "express";
import {
  getFinanceExportIndex,
  exportFinanceExcel,
  exportFinancePdf,
} from "../controllers/admin/financeExport.controller.js";

const router = express.Router();

router.get("/", getFinanceExportIndex);
router.get("/excel", exportFinanceExcel);
router.get("/pdf", exportFinancePdf);

export default router;
