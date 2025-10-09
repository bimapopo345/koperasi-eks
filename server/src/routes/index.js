import express from "express";
const router = express.Router();

import authRoutes from "./auth.routes.js";
import memberRoutes from "./member.routes.js";
import adminRoutes from "./admin.routes.js";
import productRoutes from "./product.routes.js";
import savingsRoutes from "./savings.routes.js";
import loanProductRoutes from "./loanProduct.routes.js";
import publicRoutes from "./public.routes.js";

router.use("/auth", authRoutes);
router.use("/members", memberRoutes);
router.use("/admin", adminRoutes);
router.use("/products", productRoutes);
router.use("/savings", savingsRoutes);
router.use("/loan-products", loanProductRoutes);

// Public API routes (tanpa authentication)
router.use("/public", publicRoutes);

export default router;
