import express from "express";
import multer from "multer";
import path from "path";
import {
  getTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  toggleReviewed,
  uploadTransactions,
  getAccountCurrency,
} from "../controllers/admin/transaction.controller.js";

const router = express.Router();

// Multer config for receipt file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/transactions");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 6 * 1024 * 1024 }, // 6MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpg|jpeg|png|gif|pdf|tiff|tif|bmp|heic/;
    const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
    if (allowed.test(ext)) {
      cb(null, true);
    } else {
      cb(new Error("File type not allowed"), false);
    }
  },
});

// GET /api/admin/transactions - list all transactions
router.get("/", getTransactions);

// GET /api/admin/transactions/account-currency/:id - get currency for account
router.get("/account-currency/:id", getAccountCurrency);

// GET /api/admin/transactions/:id - get detail
router.get("/:id", getTransaction);

// POST /api/admin/transactions - create
router.post("/", upload.single("receiptFile"), createTransaction);

// PUT /api/admin/transactions/:id - update
router.put("/:id", upload.single("receiptFile"), updateTransaction);

// DELETE /api/admin/transactions/:id - delete
router.delete("/:id", deleteTransaction);

// PATCH /api/admin/transactions/:id/toggle-reviewed - toggle reviewed
router.patch("/:id/toggle-reviewed", toggleReviewed);

// POST /api/admin/transactions/upload - bulk upload
router.post("/upload", uploadTransactions);

export default router;
