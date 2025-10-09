import express from "express";
import {
  getAllLoanProducts,
  getLoanProductById,
  createLoanProduct,
  updateLoanProduct,
  deleteLoanProduct,
  toggleLoanProductStatus,
} from "../controllers/loanProduct.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Routes
router.route("/").get(getAllLoanProducts).post(createLoanProduct);

router
  .route("/:id")
  .get(getLoanProductById)
  .put(updateLoanProduct)
  .delete(deleteLoanProduct);

router.route("/:id/toggle").put(toggleLoanProductStatus);

export default router;
