import express from "express";
import {
  getReconciliation,
  startReconciliation,
  processReconciliation,
  toggleMatch,
  completeReconciliation,
  cancelReconciliation,
  removeItems,
  updateClosingBalance,
  viewReconciliation,
} from "../controllers/admin/reconciliation.controller.js";

const router = express.Router();

// GET /api/admin/reconciliation - main page
router.get("/", getReconciliation);

// POST /api/admin/reconciliation/start - start new reconciliation
router.post("/start", startReconciliation);

// POST /api/admin/reconciliation/toggle-match - toggle match
router.post("/toggle-match", toggleMatch);

// POST /api/admin/reconciliation/remove-items - remove items
router.post("/remove-items", removeItems);

// PUT /api/admin/reconciliation/update-closing-balance - update closing balance
router.put("/update-closing-balance", updateClosingBalance);

// POST /api/admin/reconciliation/:id/complete - complete
router.post("/:id/complete", completeReconciliation);

// POST /api/admin/reconciliation/:id/cancel - cancel
router.post("/:id/cancel", cancelReconciliation);

// GET /api/admin/reconciliation/:id/view - view completed
router.get("/:id/view", viewReconciliation);

// GET /api/admin/reconciliation/:id - process page
router.get("/:id", processReconciliation);

export default router;
