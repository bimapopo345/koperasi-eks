import express from "express";
import {
  getSalesTaxes,
  getSalesTax,
  createSalesTax,
  updateSalesTax,
  deleteSalesTax,
  toggleSalesTax,
} from "../controllers/admin/salesTax.controller.js";

const router = express.Router();

// GET /api/admin/sales-tax - list all
router.get("/", getSalesTaxes);

// GET /api/admin/sales-tax/:id - detail
router.get("/:id", getSalesTax);

// POST /api/admin/sales-tax - create
router.post("/", createSalesTax);

// PUT /api/admin/sales-tax/:id - update
router.put("/:id", updateSalesTax);

// DELETE /api/admin/sales-tax/:id - delete
router.delete("/:id", deleteSalesTax);

// PATCH /api/admin/sales-tax/:id/toggle - toggle active/inactive
router.patch("/:id/toggle", toggleSalesTax);

export default router;
