import express from "express";
import multer from "multer";
import path from "path";
import {
  getExpenseAdmin,
  getExpenseReport,
  getExpenseDetail,
  createExpense,
  updateExpense,
  approveExpense,
  rejectExpense,
  markExpensePaid,
  deleteExpense,
  deleteExpenseAttachment,
  deleteExpensePaymentProof,
} from "../controllers/admin/expense.controller.js";
import { ensureUploadsSubdirs } from "../utils/uploadsDir.js";

const router = express.Router();
const { expenses: expensesUploadDir, expensePaymentProofs: paymentProofUploadDir } = ensureUploadsSubdirs();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const field = String(file.fieldname || "").toLowerCase();
    if (field === "payment_proofs" || field === "payment_proof_files") {
      cb(null, paymentProofUploadDir);
      return;
    }
    cb(null, expensesUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    cb(null, `EXP_${Date.now()}_${Math.random().toString(36).slice(2, 9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpg|jpeg|png|gif|webp|pdf|doc|docx|heic/;
    const ext = path.extname(file.originalname || "").toLowerCase().replace(".", "");
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed"), false);
    }
  },
});

const uploadExpenseFiles = upload.fields([
  { name: "attachments", maxCount: 20 },
  { name: "expense_attachments", maxCount: 20 },
  { name: "payment_proofs", maxCount: 10 },
  { name: "payment_proof_files", maxCount: 10 },
]);

router.get("/admin", getExpenseAdmin);
router.get("/report", getExpenseReport);
router.get("/:id", getExpenseDetail);

router.post("/", uploadExpenseFiles, createExpense);
router.put("/:id", uploadExpenseFiles, updateExpense);
router.post("/:id/approve", approveExpense);
router.post("/:id/reject", rejectExpense);
router.post("/:id/mark-paid", uploadExpenseFiles, markExpensePaid);

router.delete("/:id", deleteExpense);
router.delete("/attachments/:id", deleteExpenseAttachment);
router.delete("/payment-proofs/:id", deleteExpensePaymentProof);

export default router;
