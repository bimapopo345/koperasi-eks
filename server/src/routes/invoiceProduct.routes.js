import express from "express";
import {
  archiveInvoiceProduct,
  createInvoiceProduct,
  deleteInvoiceProduct,
  getAllInvoiceProducts,
  getInvoiceProductById,
  unarchiveInvoiceProduct,
  updateInvoiceProduct,
} from "../controllers/admin/invoiceProduct.controller.js";

const router = express.Router();

router.get("/", getAllInvoiceProducts);
router.get("/:id", getInvoiceProductById);
router.post("/", createInvoiceProduct);
router.put("/:id", updateInvoiceProduct);
router.post("/:id/archive", archiveInvoiceProduct);
router.post("/:id/unarchive", unarchiveInvoiceProduct);
router.delete("/:id", deleteInvoiceProduct);

export default router;
