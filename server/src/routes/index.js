import express from "express";
const router = express.Router();

import memberRoutes from "./member.routes.js";
import adminRoutes from "./admin.routes.js";
import publicRoutes from "./public.routes.js";

// Member API routes
router.use("/member", memberRoutes);

// Admin API routes  
router.use("/admin", adminRoutes);

// Public API routes (tanpa authentication)
router.use("/public", publicRoutes);

export default router;
