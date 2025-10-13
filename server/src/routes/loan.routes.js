import express from "express";
import {
  createLoanApplication,
  calculateInstallment,
  approveLoan,
  rejectLoan,
  getAllLoans,
  getLoansByMember,
  getLoanDetail,
  updateLoanStatus,
  checkOverdueLoans,
  updateLoan,
  deleteLoan,
} from "../controllers/admin/loan.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createLoanApplicationValidation,
  calculateInstallmentValidation,
  processLoanValidation,
  getLoansQueryValidation,
  updateLoanStatusValidation,
} from "../validations/loan.validation.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Loan application routes
router.post(
  "/apply",
  validate(createLoanApplicationValidation),
  createLoanApplication
);

router.post(
  "/calculate",
  validate(calculateInstallmentValidation),
  calculateInstallment
);

// Loan management routes
router.get(
  "/",
  validate(getLoansQueryValidation),
  getAllLoans
);

router.get("/member/:memberId", getLoansByMember);

router.get("/:id", getLoanDetail);

router.post(
  "/:id/approve",
  validate(processLoanValidation),
  approveLoan
);

router.post(
  "/:id/reject",
  validate(processLoanValidation),
  rejectLoan
);

router.patch(
  "/:id/status",
  validate(updateLoanStatusValidation),
  updateLoanStatus
);

// Update and delete routes
router.put("/:id", updateLoan);
router.delete("/:id", deleteLoan);

// Maintenance routes
router.post("/check-overdue", checkOverdueLoans);

export default router;
