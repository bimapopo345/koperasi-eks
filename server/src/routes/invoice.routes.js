import express from "express";
import {
  addInvoicePayment,
  createInvoice,
  deleteInvoice,
  deleteInvoicePayment,
  getAllInvoices,
  getInvoiceByNumber,
  getInvoiceMeta,
  updateInvoice,
  validateInvoiceNumber,
} from "../controllers/admin/invoice.controller.js";

const router = express.Router();

router.get("/meta", getInvoiceMeta);
router.get("/validate-number", validateInvoiceNumber);
router.get("/", getAllInvoices);
router.get("/:invoiceNumber", getInvoiceByNumber);
router.post("/", createInvoice);
router.put("/:invoiceNumber", updateInvoice);
router.delete("/:invoiceNumber", deleteInvoice);
router.post("/:invoiceNumber/payments", addInvoicePayment);
router.delete("/:invoiceNumber/payments/:paymentId", deleteInvoicePayment);

export default router;
